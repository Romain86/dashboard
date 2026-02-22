<?php

// $input = JSON décodé du body POST
// $db    = instance Database (singleton)

$action = $input['action'] ?? '';

$clientId     = $db->getSetting('spotify', 'client_id');
$clientSecret = $db->getSetting('spotify', 'client_secret');
$accessToken  = $db->getSetting('spotify', 'access_token');
$refreshToken = $db->getSetting('spotify', 'refresh_token');

if (!$accessToken || !$refreshToken) {
    throw new Exception('Spotify non connecté');
}

// -------------------------------------------------------
// Helper : appel Spotify (PUT/POST) avec gestion du refresh
// -------------------------------------------------------
function spotifyCall(string $method, string $url, string &$accessToken, string $clientId, string $clientSecret, string $refreshToken, $db): array
{
    $response = doSpotifyRequest($method, $url, $accessToken);

    // Si 401, refresh le token et réessayer
    if (isset($response['status']) && $response['status'] === 401) {
        $credentials = base64_encode($clientId . ':' . $clientSecret);
        $ctx = stream_context_create(['http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/x-www-form-urlencoded\r\nAuthorization: Basic $credentials",
            'content'       => http_build_query(['grant_type' => 'refresh_token', 'refresh_token' => $refreshToken]),
            'timeout'       => 10,
            'ignore_errors' => true,
        ]]);
        $new = json_decode(@file_get_contents('https://accounts.spotify.com/api/token', false, $ctx) ?: '{}', true) ?? [];

        if (!isset($new['access_token'])) {
            throw new Exception('Session Spotify expirée. Reconnecte-toi sur /widgets/spotify/oauth.php');
        }

        $accessToken = $new['access_token'];
        $db->setSetting('spotify', 'access_token', $accessToken);
        if (!empty($new['refresh_token'])) {
            $db->setSetting('spotify', 'refresh_token', $new['refresh_token']);
        }

        $response = doSpotifyRequest($method, $url, $accessToken);
    }

    return $response;
}

function doSpotifyRequest(string $method, string $url, string $token): array
{
    $ctx = stream_context_create(['http' => [
        'method'        => $method,
        'header'        => "Authorization: Bearer $token\r\nContent-Length: 0",
        'timeout'       => 5,
        'ignore_errors' => true,
    ]]);

    $body = @file_get_contents($url, false, $ctx);

    // Extraire le code HTTP
    $statusCode = 0;
    if (isset($http_response_header[0]) && preg_match('/\d{3}/', $http_response_header[0], $m)) {
        $statusCode = (int) $m[0];
    }

    // 204 No Content = succès sans body (cas normal pour les actions playback)
    if ($statusCode === 204 || $statusCode === 200) {
        return ['success' => true];
    }

    $data = json_decode($body ?: '{}', true) ?? [];
    return [
        'status'  => $statusCode,
        'error'   => $data['error']['message'] ?? 'Erreur Spotify',
        'success' => false,
    ];
}

// -------------------------------------------------------
// Actions
// -------------------------------------------------------
$base = 'https://api.spotify.com/v1/me/player';

switch ($action) {

    case 'play':
        $result = spotifyCall('PUT', "$base/play", $accessToken, $clientId, $clientSecret, $refreshToken, $db);
        break;

    case 'pause':
        $result = spotifyCall('PUT', "$base/pause", $accessToken, $clientId, $clientSecret, $refreshToken, $db);
        break;

    case 'next':
        $result = spotifyCall('POST', "$base/next", $accessToken, $clientId, $clientSecret, $refreshToken, $db);
        break;

    case 'previous':
        $result = spotifyCall('POST', "$base/previous", $accessToken, $clientId, $clientSecret, $refreshToken, $db);
        break;

    case 'shuffle':
        $state = !empty($input['state']) ? 'true' : 'false';
        $result = spotifyCall('PUT', "$base/shuffle?state=$state", $accessToken, $clientId, $clientSecret, $refreshToken, $db);
        break;

    case 'restart':
        $result = spotifyCall('PUT', "$base/seek?position_ms=0", $accessToken, $clientId, $clientSecret, $refreshToken, $db);
        break;

    default:
        throw new Exception('Action inconnue : ' . $action);
}

if (!empty($result['success'])) {
    return ['success' => true];
}

throw new Exception($result['error'] ?? 'Erreur inconnue');
