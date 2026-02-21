<?php

// $settings est injecté par WidgetManager::callWidget()
$clientId     = $settings['client_id']     ?? null;
$clientSecret = $settings['client_secret'] ?? null;
$maxVideos    = (int) ($settings['max_videos'] ?? 12);

if (!$clientId || !$clientSecret) {
    throw new Exception('Widget non configuré : Client ID et Client Secret requis');
}

$db           = Database::getInstance();
$refreshToken = $settings['refresh_token'] ?? $db->getSetting('youtube', 'refresh_token');

if (!$refreshToken) {
    return ['needs_auth' => true, 'videos' => []];
}

$db->setSetting('youtube', 'refresh_token', $refreshToken);

// -------------------------------------------------------
// Obtenir un access_token (depuis le cache ou en le rafraîchissant)
// -------------------------------------------------------
$accessToken = $db->getSetting('youtube', 'access_token');
$expiresAt   = (int) ($db->getSetting('youtube', 'access_token_expires_at') ?? 0);

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
        'timeout'       => 5,
        'ignore_errors' => true,
    ]]);

    $raw      = @file_get_contents('https://oauth2.googleapis.com/token', false, $ctx);
    $response = json_decode($raw ?: '{}', true);

    if (!isset($response['access_token'])) {
        $db->setSetting('youtube', 'refresh_token', '');
        return ['needs_auth' => true, 'auth_error' => $response['error'] ?? 'Token expiré'];
    }

    $accessToken = $response['access_token'];
    $db->setSetting('youtube', 'access_token',            $accessToken);
    $db->setSetting('youtube', 'access_token_expires_at', (string) (time() + ($response['expires_in'] ?? 3600)));
}

// -------------------------------------------------------
// Helper : appel YouTube API avec Bearer token
// -------------------------------------------------------
function ytGet(string $url, string $token): array {
    $ctx = stream_context_create(['http' => [
        'header'        => 'Authorization: Bearer ' . $token,
        'timeout'       => 5,
        'ignore_errors' => true,
    ]]);
    $raw = @file_get_contents($url, false, $ctx);
    return json_decode($raw ?: '{}', true);
}

// -------------------------------------------------------
// 1. Récupérer les abonnements (max 50, triés par pertinence)
// -------------------------------------------------------
$maxChannels = 25; // Limiter pour éviter le timeout (1 appel API / chaîne)

$url = 'https://www.googleapis.com/youtube/v3/subscriptions'
     . '?part=snippet&mine=true&maxResults=50';

$res = ytGet($url, $accessToken);

if (isset($res['error'])) {
    throw new Exception('YouTube API : ' . ($res['error']['message'] ?? 'Erreur inconnue'));
}

$subs = [];
foreach ($res['items'] ?? [] as $item) {
    $channelId = $item['snippet']['resourceId']['channelId'] ?? null;
    if ($channelId) {
        $subs[] = $channelId;
    }
}

if (empty($subs)) {
    return ['needs_auth' => false, 'videos' => []];
}

// Limiter le nombre de chaînes requêtées
$subs = array_slice($subs, 0, $maxChannels);

// -------------------------------------------------------
// 2. Pour chaque chaîne, récupérer les dernières vidéos
//    Upload playlist = remplacer "UC" par "UU" dans le channel ID
// -------------------------------------------------------
$allVideos    = [];
$videosPerSub = max(2, (int) ceil($maxVideos / count($subs)));

foreach ($subs as $channelId) {
    $playlistId = 'UU' . substr($channelId, 2);

    $url = 'https://www.googleapis.com/youtube/v3/playlistItems'
         . '?part=snippet&maxResults=' . $videosPerSub
         . '&playlistId=' . urlencode($playlistId);

    $res = ytGet($url, $accessToken);

    foreach ($res['items'] ?? [] as $item) {
        $snippet = $item['snippet'] ?? [];
        $videoId = $snippet['resourceId']['videoId'] ?? null;
        if (!$videoId) continue;

        $allVideos[] = [
            'id'        => $videoId,
            'title'     => $snippet['title'] ?? '',
            'channel'   => $snippet['channelTitle'] ?? '',
            'thumbnail' => $snippet['thumbnails']['medium']['url']
                        ?? $snippet['thumbnails']['default']['url']
                        ?? '',
            'published' => $snippet['publishedAt'] ?? '',
            'url'       => 'https://www.youtube.com/watch?v=' . $videoId,
        ];
    }
}

// -------------------------------------------------------
// 3. Filtrer les Shorts (durée < 3min ou #shorts dans le titre)
// -------------------------------------------------------
$videoIds = array_map(fn($v) => $v['id'], $allVideos);
$shortIds = [];

// Titre contenant #shorts
foreach ($allVideos as $v) {
    if (preg_match('/#shorts?\b/i', $v['title'])) {
        $shortIds[] = $v['id'];
    }
}

// Durée < 3 minutes via videos.list
foreach (array_chunk($videoIds, 50) as $chunk) {
    $url = 'https://www.googleapis.com/youtube/v3/videos'
         . '?part=contentDetails&id=' . implode(',', $chunk);
    $res = ytGet($url, $accessToken);

    foreach ($res['items'] ?? [] as $item) {
        $duration = $item['contentDetails']['duration'] ?? '';
        if (preg_match('/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/', $duration, $m)) {
            $seconds = ((int)($m[1] ?? 0)) * 3600 + ((int)($m[2] ?? 0)) * 60 + (int)($m[3] ?? 0);
            if ($seconds > 0 && $seconds < 180) {
                $shortIds[] = $item['id'];
            }
        }
    }
}

if (!empty($shortIds)) {
    $shortSet = array_flip($shortIds);
    $allVideos = array_filter($allVideos, fn($v) => !isset($shortSet[$v['id']]));
}

// -------------------------------------------------------
// 4. Trier par date de publication décroissante, limiter
// -------------------------------------------------------
usort($allVideos, fn($a, $b) => strcmp($b['published'], $a['published']));
$allVideos = array_slice($allVideos, 0, $maxVideos);

return [
    'needs_auth' => false,
    'videos'     => $allVideos,
];
