<?php

// $settings est injecté par WidgetManager::callWidget()
$clientId     = $settings['client_id']     ?? null;
$clientSecret = $settings['client_secret'] ?? null;
$maxEmails    = (int) ($settings['max_emails'] ?? 10);

if (!$clientId || !$clientSecret) {
    throw new Exception('Widget non configuré : Client ID et Client Secret requis');
}

$db           = Database::getInstance();
$refreshToken = $settings['refresh_token'] ?? $db->getSetting('gmail', 'refresh_token');

if (!$refreshToken) {
    return ['needs_auth' => true, 'emails' => [], 'unread_count' => 0];
}

$db->setSetting('gmail', 'refresh_token', $refreshToken);

// -------------------------------------------------------
// Obtenir un access_token (depuis le cache ou en le rafraîchissant)
// -------------------------------------------------------
$accessToken = $db->getSetting('gmail', 'access_token');
$expiresAt   = (int) ($db->getSetting('gmail', 'access_token_expires_at') ?? 0);

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
        $db->setSetting('gmail', 'refresh_token', '');
        return ['needs_auth' => true, 'auth_error' => $response['error'] ?? 'Token expiré'];
    }

    $accessToken = $response['access_token'];
    $db->setSetting('gmail', 'access_token',            $accessToken);
    $db->setSetting('gmail', 'access_token_expires_at', (string) (time() + ($response['expires_in'] ?? 3600)));
}

// -------------------------------------------------------
// Helper : appel Gmail API avec Bearer token
// -------------------------------------------------------
function gmailGet(string $url, string $token): array {
    $ctx = stream_context_create(['http' => [
        'header'        => 'Authorization: Bearer ' . $token,
        'timeout'       => 5,
        'ignore_errors' => true,
    ]]);
    $raw = @file_get_contents($url, false, $ctx);
    return json_decode($raw ?: '{}', true);
}

// -------------------------------------------------------
// 1. Récupérer le nombre d'emails non lus (via le label INBOX)
// -------------------------------------------------------
$labelData   = gmailGet('https://www.googleapis.com/gmail/v1/users/me/labels/INBOX', $accessToken);
$unreadCount = (int) ($labelData['messagesUnread'] ?? 0);

// -------------------------------------------------------
// 2. Lister les derniers messages de la boîte de réception
// -------------------------------------------------------
$listUrl = 'https://www.googleapis.com/gmail/v1/users/me/messages'
         . '?maxResults=' . $maxEmails
         . '&labelIds=INBOX';

$listData = gmailGet($listUrl, $accessToken);

if (isset($listData['error'])) {
    throw new Exception('Gmail API : ' . ($listData['error']['message'] ?? 'Erreur inconnue'));
}

$messages = $listData['messages'] ?? [];

// -------------------------------------------------------
// 3. Récupérer les métadonnées de chaque message
// -------------------------------------------------------
$emails = [];

foreach ($messages as $msg) {
    $msgUrl = 'https://www.googleapis.com/gmail/v1/users/me/messages/' . $msg['id']
            . '?format=metadata'
            . '&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date';

    $msgData = gmailGet($msgUrl, $accessToken);
    if (empty($msgData['id'])) continue;

    // Extraire les headers
    $headers = [];
    foreach ($msgData['payload']['headers'] ?? [] as $h) {
        $headers[$h['name']] = $h['value'];
    }

    // Parser l'expéditeur (extraire le nom et l'adresse email)
    $fromRaw   = $headers['From'] ?? '';
    $fromName  = $fromRaw;
    $fromEmail = '';
    if (preg_match('/^"?(.+?)"?\s*<(.+?)>$/', $fromRaw, $m)) {
        $fromName  = $m[1];
        $fromEmail = $m[2];
    } elseif (strpos($fromRaw, '@') !== false) {
        $fromEmail = $fromRaw;
    }

    // Déterminer si non lu
    $labels = $msgData['labelIds'] ?? [];
    $unread = in_array('UNREAD', $labels);

    $emails[] = [
        'id'         => $msgData['id'],
        'from'       => $fromName,
        'from_email' => $fromEmail,
        'subject'    => $headers['Subject'] ?? '(sans objet)',
        'date'       => (int) floor(($msgData['internalDate'] ?? 0) / 1000),
        'unread'     => $unread,
    ];
}

return [
    'needs_auth'   => false,
    'unread_count' => $unreadCount,
    'emails'       => $emails,
];
