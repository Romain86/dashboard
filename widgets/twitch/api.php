<?php

// $settings est injecté par WidgetManager::callWidget()
$clientId     = $settings['client_id']     ?? null;
$clientSecret = $settings['client_secret'] ?? null;
$accessToken  = $settings['access_token']  ?? null;
$refreshToken = $settings['refresh_token'] ?? null;
$userId       = $settings['user_id']       ?? null;

if (!$clientId || !$clientSecret) {
    throw new Exception('Widget non configuré : Client ID/Secret manquants');
}

if (!$accessToken || !$userId) {
    throw new Exception(
        'Autorisation Twitch manquante. ' .
        'Visite <a href="/widgets/twitch/oauth.php">/widgets/twitch/oauth.php</a> pour connecter ton compte.'
    );
}

// -------------------------------------------------------
// Appel API (avec refresh automatique si 401)
// -------------------------------------------------------
$data = twitchGet(
    "https://api.twitch.tv/helix/streams/followed?user_id={$userId}&first=20",
    $clientId,
    $accessToken
);

if (($data['status'] ?? 0) === 401) {
    // Token expiré : on le rafraîchit
    $newTokens = twitchRefresh($clientId, $clientSecret, $refreshToken);

    if (!isset($newTokens['access_token'])) {
        throw new Exception(
            'Session Twitch expirée. ' .
            'Reconnecte-toi sur <a href="/widgets/twitch/oauth.php">/widgets/twitch/oauth.php</a>'
        );
    }

    $accessToken  = $newTokens['access_token'];
    $refreshToken = $newTokens['refresh_token'];

    // Sauvegarder les nouveaux tokens
    $db = Database::getInstance();
    $db->setSetting('twitch', 'access_token',  $accessToken);
    $db->setSetting('twitch', 'refresh_token', $refreshToken);

    // Rejouer la requête
    $data = twitchGet(
        "https://api.twitch.tv/helix/streams/followed?user_id={$userId}&first=20",
        $clientId,
        $accessToken
    );
}

if (isset($data['error'])) {
    throw new Exception('Erreur Twitch : ' . ($data['message'] ?? $data['error']));
}

$streams = $data['data'] ?? [];

return [
    'streams' => array_map(fn($s) => [
        'user_name'    => $s['user_name'],
        'user_login'   => $s['user_login'],
        'game_name'    => $s['game_name'] ?: 'Jeu inconnu',
        'title'        => $s['title'],
        'viewer_count' => $s['viewer_count'],
        'thumbnail'    => str_replace(['{width}', '{height}'], ['320', '180'], $s['thumbnail_url']),
        'url'          => 'https://twitch.tv/' . $s['user_login'],
        'started_at'   => $s['started_at'],
    ], $streams),
    'count' => count($streams),
];

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function twitchGet(string $url, string $clientId, string $accessToken): array
{
    $ctx = stream_context_create(['http' => [
        'header'        => "Client-ID: $clientId\r\nAuthorization: Bearer $accessToken",
        'timeout'       => 5,
        'ignore_errors' => true,
    ]]);
    $body = @file_get_contents($url, false, $ctx);
    return json_decode($body ?: '{}', true) ?? [];
}

function twitchRefresh(string $clientId, string $clientSecret, ?string $refreshToken): array
{
    if (!$refreshToken) return [];
    $ctx = stream_context_create(['http' => [
        'method'        => 'POST',
        'header'        => 'Content-Type: application/x-www-form-urlencoded',
        'content'       => http_build_query([
            'client_id'     => $clientId,
            'client_secret' => $clientSecret,
            'grant_type'    => 'refresh_token',
            'refresh_token' => $refreshToken,
        ]),
        'timeout'       => 10,
        'ignore_errors' => true,
    ]]);
    $body = @file_get_contents('https://id.twitch.tv/oauth2/token', false, $ctx);
    return json_decode($body ?: '{}', true) ?? [];
}
