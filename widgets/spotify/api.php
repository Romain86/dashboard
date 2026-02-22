<?php

// $settings est injecté par WidgetManager::callWidget()
$clientId     = $settings['client_id']     ?? null;
$clientSecret = $settings['client_secret'] ?? null;
$accessToken  = $settings['access_token']  ?? null;
$refreshToken = $settings['refresh_token'] ?? null;

if (!$clientId || !$clientSecret) {
    throw new Exception('Widget non configuré : Client ID/Secret manquants');
}

if (!$accessToken) {
    throw new Exception(
        'Autorisation Spotify manquante. ' .
        'Visite /widgets/spotify/oauth.php pour connecter ton compte.'
    );
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function spotifyGet(string $url, string $token): array
{
    $ctx = stream_context_create(['http' => [
        'header'        => "Authorization: Bearer $token",
        'timeout'       => 5,
        'ignore_errors' => true,
    ]]);
    $body = @file_get_contents($url, false, $ctx);
    // 204 No Content (rien en lecture) → tableau vide
    if ($body === '' || $body === false) return [];
    return json_decode($body, true) ?? [];
}

function spotifyRefresh(string $clientId, string $clientSecret, string $refreshToken): array
{
    $credentials = base64_encode($clientId . ':' . $clientSecret);
    $ctx = stream_context_create(['http' => [
        'method'        => 'POST',
        'header'        => "Content-Type: application/x-www-form-urlencoded\r\nAuthorization: Basic $credentials",
        'content'       => http_build_query(['grant_type' => 'refresh_token', 'refresh_token' => $refreshToken]),
        'timeout'       => 10,
        'ignore_errors' => true,
    ]]);
    return json_decode(@file_get_contents('https://accounts.spotify.com/api/token', false, $ctx) ?: '{}', true) ?? [];
}

function needsRefresh(array $data): bool
{
    return isset($data['error']['status']) && $data['error']['status'] === 401;
}

// -------------------------------------------------------
// Lecture en cours
// -------------------------------------------------------
$current = spotifyGet('https://api.spotify.com/v1/me/player/currently-playing', $accessToken);

// Refresh si token expiré
if (needsRefresh($current)) {
    $new = spotifyRefresh($clientId, $clientSecret, $refreshToken);
    if (!isset($new['access_token'])) {
        throw new Exception(
            'Session Spotify expirée. Reconnecte-toi sur /widgets/spotify/oauth.php'
        );
    }
    $accessToken  = $new['access_token'];
    $refreshToken = $new['refresh_token'] ?? $refreshToken;

    $db = Database::getInstance();
    $db->setSetting('spotify', 'access_token',  $accessToken);
    $db->setSetting('spotify', 'refresh_token', $refreshToken);

    $current = spotifyGet('https://api.spotify.com/v1/me/player/currently-playing', $accessToken);
}

// -------------------------------------------------------
// Morceaux récents (toujours chargés en complément)
// -------------------------------------------------------
$recentData = spotifyGet('https://api.spotify.com/v1/me/player/recently-played?limit=5', $accessToken);
$recent = array_map(fn($item) => formatTrack($item['track']), $recentData['items'] ?? []);

// -------------------------------------------------------
// État du player (shuffle, device)
// -------------------------------------------------------
$player = spotifyGet('https://api.spotify.com/v1/me/player', $accessToken);

// -------------------------------------------------------
// Construction de la réponse
// -------------------------------------------------------
$isPlaying = !empty($current['is_playing']) && isset($current['item']);

$nowPlaying = null;
if ($isPlaying) {
    $track = $current['item'];
    $nowPlaying = formatTrack($track) + [
        'progress_ms' => $current['progress_ms'] ?? 0,
        'duration_ms' => $track['duration_ms'],
        'fetched_at'  => time(),
    ];
}

$disallows = $player['actions']['disallows'] ?? [];

return [
    'is_playing'    => $isPlaying,
    'now_playing'   => $nowPlaying,
    'recent'        => $recent,
    'shuffle_state' => $player['shuffle_state'] ?? false,
    'device'        => isset($player['device']) ? $player['device']['name'] : null,
    'has_device'    => !empty($player['device']),
    'can_skip_prev' => empty($disallows['skipping_prev']),
    'can_skip_next' => empty($disallows['skipping_next']),
];

// -------------------------------------------------------
// Helper formatTrack
// -------------------------------------------------------
function formatTrack(array $track): array
{
    $artists = implode(', ', array_column($track['artists'] ?? [], 'name'));
    $image   = $track['album']['images'][1]['url']  // medium ~300px
             ?? $track['album']['images'][0]['url']
             ?? null;
    return [
        'name'     => $track['name'],
        'artist'   => $artists,
        'album'    => $track['album']['name'] ?? '',
        'image'    => $image,
        'url'      => $track['external_urls']['spotify'] ?? '#',
        'duration_ms' => $track['duration_ms'] ?? 0,
    ];
}
