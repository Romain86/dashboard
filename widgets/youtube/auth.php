<?php

/**
 * Redirige vers Google OAuth pour autoriser l'accès aux abonnements YouTube.
 * URL : https://dashboard.test/widgets/youtube/auth.php
 */

require_once __DIR__ . '/../../config.php';

$db           = Database::getInstance();
$clientId     = $db->getSetting('youtube', 'client_id');
$clientSecret = $db->getSetting('youtube', 'client_secret');

if (!$clientId || !$clientSecret) {
    die('<p style="font-family:sans-serif;color:red">Configurez d\'abord le widget (Client ID + Client Secret) depuis le dashboard.</p>');
}

$redirectUri = 'https://developers.google.com/oauthplayground';

$params = http_build_query([
    'client_id'     => $clientId,
    'redirect_uri'  => $redirectUri,
    'response_type' => 'code',
    'scope'         => 'https://www.googleapis.com/auth/youtube.readonly',
    'access_type'   => 'offline',
    'prompt'        => 'consent',
]);

header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $params);
exit;
