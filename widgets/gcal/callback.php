<?php

/**
 * Reçoit le code OAuth de Google, l'échange contre les tokens
 * et stocke le refresh_token en base.
 * URL : https://dashboard.test/widgets/gcal/callback.php
 */

require_once __DIR__ . '/../../config.php';

$db           = Database::getInstance();
$clientId     = $db->getSetting('gcal', 'client_id');
$clientSecret = $db->getSetting('gcal', 'client_secret');
$code         = $_GET['code'] ?? null;

if (!$code) {
    $error = $_GET['error'] ?? 'Accès refusé';
    die('<p style="font-family:sans-serif;color:red">Erreur OAuth : ' . htmlspecialchars($error) . '</p>');
}

$redirectUri = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http')
    . '://' . $_SERVER['HTTP_HOST'] . '/widgets/gcal/callback.php';

// Échange du code contre les tokens
$ctx = stream_context_create(['http' => [
    'method'  => 'POST',
    'header'  => 'Content-Type: application/x-www-form-urlencoded',
    'content' => http_build_query([
        'code'          => $code,
        'client_id'     => $clientId,
        'client_secret' => $clientSecret,
        'redirect_uri'  => $redirectUri,
        'grant_type'    => 'authorization_code',
    ]),
    'timeout'       => 10,
    'ignore_errors' => true,
]]);

$raw      = @file_get_contents('https://oauth2.googleapis.com/token', false, $ctx);
$response = json_decode($raw ?: '{}', true);

if (!isset($response['refresh_token'])) {
    $error = $response['error_description'] ?? $response['error'] ?? 'Aucun refresh_token reçu';
    die('<p style="font-family:sans-serif;color:red">Erreur : ' . htmlspecialchars($error) . '</p>');
}

// Stockage des tokens
$db->setSetting('gcal', 'refresh_token',           $response['refresh_token']);
$db->setSetting('gcal', 'access_token',            $response['access_token'] ?? '');
$db->setSetting('gcal', 'access_token_expires_at', (string) (time() + ($response['expires_in'] ?? 3600)));

// Vider le cache du widget
$cache = new Cache();
$cache->deleteByPrefix('widget_gcal');

// Redirection vers le dashboard
header('Location: /');
exit;
