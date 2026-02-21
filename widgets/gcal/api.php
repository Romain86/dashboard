<?php

// $settings est injecté par WidgetManager::callWidget()
$clientId     = $settings['client_id']     ?? null;
$clientSecret = $settings['client_secret'] ?? null;
$maxEvents    = (int) ($settings['max_events'] ?? 10);
$daysAhead    = (int) ($settings['days_ahead'] ?? 30);

if (!$clientId || !$clientSecret) {
    throw new Exception('Widget non configuré : Client ID et Client Secret requis');
}

// Refresh token : depuis les settings du widget (saisi manuellement via OAuth2 Playground)
$db           = Database::getInstance();
$refreshToken = $settings['refresh_token'] ?? $db->getSetting('gcal', 'refresh_token');

if (!$refreshToken) {
    return ['needs_auth' => true];
}

// Persiste le refresh_token en DB pour les futurs accès (ex: renouvellement access_token)
$db->setSetting('gcal', 'refresh_token', $refreshToken);

// -------------------------------------------------------
// Obtenir un access_token (depuis le cache ou en le rafraîchissant)
// -------------------------------------------------------
$accessToken = $db->getSetting('gcal', 'access_token');
$expiresAt   = (int) ($db->getSetting('gcal', 'access_token_expires_at') ?? 0);

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
        $error = $response['error_description'] ?? $response['error'] ?? 'Erreur inconnue';
        // Le refresh_token est peut-être révoqué, on le supprime
        $db->setSetting('gcal', 'refresh_token', '');
        return ['needs_auth' => true, 'auth_error' => $error];
    }

    $accessToken = $response['access_token'];
    $expiresAt   = time() + ($response['expires_in'] ?? 3600);

    $db->setSetting('gcal', 'access_token',            $accessToken);
    $db->setSetting('gcal', 'access_token_expires_at', (string) $expiresAt);
}

// -------------------------------------------------------
// Récupérer les événements
// -------------------------------------------------------
$ctx = stream_context_create(['http' => [
    'header'        => 'Authorization: Bearer ' . $accessToken,
    'timeout'       => 8,
    'ignore_errors' => true,
]]);

$timeMin = date('c');
$timeMax = date('c', strtotime("+{$daysAhead} days"));

$params = http_build_query([
    'timeMin'      => $timeMin,
    'timeMax'      => $timeMax,
    'maxResults'   => $maxEvents,
    'singleEvents' => 'true',
    'orderBy'      => 'startTime',
]);

$raw      = @file_get_contents("https://www.googleapis.com/calendar/v3/calendars/primary/events?{$params}", false, $ctx);
$response = json_decode($raw ?: '{}', true);

if (isset($response['error'])) {
    throw new Exception('Google Calendar : ' . ($response['error']['message'] ?? 'Erreur API'));
}

$now    = new DateTimeImmutable('today', new DateTimeZone('Europe/Paris'));
$events = [];

foreach ($response['items'] ?? [] as $item) {
    // Gestion tout-jour vs heure précise
    $start = $item['start']['date'] ?? $item['start']['dateTime'] ?? null;
    if (!$start) continue;

    $isAllDay = isset($item['start']['date']);
    $dt       = new DateTimeImmutable($start, new DateTimeZone('Europe/Paris'));
    $daysLeft = (int) $now->diff($dt)->days * ($dt >= $now ? 1 : -1);

    $events[] = [
        'title'    => $item['summary']     ?? '(sans titre)',
        'url'      => $item['htmlLink']    ?? '',
        'start'    => $start,
        'all_day'  => $isAllDay,
        'days'     => $daysLeft,
        'color'    => $item['colorId']     ?? null,
        'location' => $item['location']   ?? '',
    ];
}

return [
    'needs_auth' => false,
    'events'     => $events,
    'days_ahead' => $daysAhead,
];
