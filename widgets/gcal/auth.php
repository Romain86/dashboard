<?php

/**
 * Redirige vers Google OAuth pour autoriser l'accès au Calendar.
 * URL : https://dashboard.test/widgets/gcal/auth.php
 */

require_once __DIR__ . '/../../config.php';

$db           = Database::getInstance();
$clientId     = $db->getSetting('gcal', 'client_id');
$clientSecret = $db->getSetting('gcal', 'client_secret');

if (!$clientId || !$clientSecret) {
    die('<p style="font-family:sans-serif;color:red">Configurez d\'abord le widget (Client ID + Client Secret) depuis le dashboard.</p>');
}

$redirectUri = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http')
    . '://' . $_SERVER['HTTP_HOST'] . '/widgets/gcal/callback.php';

$params = http_build_query([
    'client_id'     => $clientId,
    'redirect_uri'  => $redirectUri,
    'response_type' => 'code',
    'scope'         => 'https://www.googleapis.com/auth/calendar.readonly',
    'access_type'   => 'offline',
    'prompt'        => 'consent', // force le retour du refresh_token
]);

header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $params);
exit;
