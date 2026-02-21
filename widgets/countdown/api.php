<?php

// $settings est injecté par WidgetManager::callWidget()
// Credentials : propres au widget ou hérités du widget gcal
$db           = Database::getInstance();
$clientId     = ($settings['client_id']     ?? '') ?: $db->getSetting('gcal', 'client_id');
$clientSecret = ($settings['client_secret'] ?? '') ?: $db->getSetting('gcal', 'client_secret');
$refreshToken = ($settings['refresh_token'] ?? '') ?: $db->getSetting('gcal', 'refresh_token');

$eventNames = array_values(array_filter(
    array_map('trim', explode("\n", $settings['event_names'] ?? ''))
));

if (!$clientId || !$clientSecret || !$refreshToken) {
    return ['needs_auth' => true];
}

if (empty($eventNames)) {
    throw new Exception('Configurez au moins un événement à suivre');
}

// -------------------------------------------------------
// Obtenir un access_token (réutilise le cache du widget gcal)
// -------------------------------------------------------
$accessToken = $db->getSetting('gcal', 'access_token');
$expiresAt   = (int)($db->getSetting('gcal', 'access_token_expires_at') ?? 0);

if (!$accessToken || time() >= $expiresAt - 60) {
    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => 'Content-Type: application/x-www-form-urlencoded',
        'content' => http_build_query([
            'client_id'     => $clientId,
            'client_secret' => $clientSecret,
            'refresh_token' => $refreshToken,
            'grant_type'    => 'refresh_token',
        ]),
        'timeout'       => 8,
        'ignore_errors' => true,
    ]]);

    $raw      = @file_get_contents('https://oauth2.googleapis.com/token', false, $ctx);
    $response = json_decode($raw ?: '{}', true);

    if (!isset($response['access_token'])) {
        $error = $response['error_description'] ?? $response['error'] ?? 'Token invalide';
        return ['needs_auth' => true, 'auth_error' => $error];
    }

    $accessToken = $response['access_token'];
    $expiresAt   = time() + ($response['expires_in'] ?? 3600);
    $db->setSetting('gcal', 'access_token',            $accessToken);
    $db->setSetting('gcal', 'access_token_expires_at', (string) $expiresAt);
}

// -------------------------------------------------------
// Chercher chaque événement
// -------------------------------------------------------
$authCtx = stream_context_create(['http' => [
    'header'        => 'Authorization: Bearer ' . $accessToken,
    'timeout'       => 8,
    'ignore_errors' => true,
]]);

$timeMin = date('c');
$timeMax = date('c', strtotime('+730 days'));

$events = [];

foreach ($eventNames as $name) {
    $params = http_build_query([
        'timeMin'      => $timeMin,
        'timeMax'      => $timeMax,
        'maxResults'   => 5,
        'singleEvents' => 'true',
        'orderBy'      => 'startTime',
        'q'            => $name,
    ]);

    $raw      = @file_get_contents("https://www.googleapis.com/calendar/v3/calendars/primary/events?{$params}", false, $authCtx);
    $response = json_decode($raw ?: '{}', true);

    if (isset($response['error'])) continue;

    // Premier événement correspondant
    foreach ($response['items'] ?? [] as $item) {
        $start  = $item['start']['dateTime'] ?? $item['start']['date'] ?? null;
        $allDay = isset($item['start']['date']);
        if (!$start) continue;

        $dt = new DateTimeImmutable($start, new DateTimeZone('Europe/Paris'));
        $events[] = [
            'title'     => $item['summary']  ?? $name,
            'search'    => $name,
            'start'     => $start,
            'all_day'   => $allDay,
            'url'       => $item['htmlLink'] ?? '',
            'timestamp' => $dt->getTimestamp(),
        ];
        break;
    }

    // Si aucun résultat, on indique l'événement non trouvé
    if (!isset($events[count($events) - 1]) || $events[count($events) - 1]['search'] !== $name) {
        $events[] = ['title' => $name, 'search' => $name, 'not_found' => true];
    }
}

// Trier par date croissante (les not_found à la fin)
usort($events, function ($a, $b) {
    if (!empty($a['not_found'])) return 1;
    if (!empty($b['not_found'])) return -1;
    return ($a['timestamp'] ?? PHP_INT_MAX) <=> ($b['timestamp'] ?? PHP_INT_MAX);
});

return [
    'needs_auth' => false,
    'events'     => $events,
];
