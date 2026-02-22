<?php

/**
 * Redirige vers Google OAuth pour autoriser l'accès en lecture à Gmail.
 * URL : https://dashboard.test/widgets/gmail/auth.php
 */

require_once __DIR__ . '/../../config.php';

$db           = Database::getInstance();
$clientId     = $db->getSetting('gmail', 'client_id');
$clientSecret = $db->getSetting('gmail', 'client_secret');

if (!$clientId || !$clientSecret) {
    die('<p style="font-family:sans-serif;color:red">Configurez d\'abord le widget (Client ID + Client Secret) depuis le dashboard.</p>');
}

$redirectUri = 'https://developers.google.com/oauthplayground';

$params = http_build_query([
    'client_id'     => $clientId,
    'redirect_uri'  => $redirectUri,
    'response_type' => 'code',
    'scope'         => 'https://www.googleapis.com/auth/gmail.readonly',
    'access_type'   => 'offline',
    'prompt'        => 'consent',
]);

header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $params);
exit;
