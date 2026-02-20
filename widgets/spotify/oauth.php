<?php

/**
 * Spotify OAuth2 — Page d'autorisation
 *
 * Visiter une seule fois pour connecter son compte Spotify :
 *   https://dashboard.test/widgets/spotify/oauth.php
 *
 * Prérequis : configurer Client ID + Secret via le modal settings du widget,
 * et ajouter l'URL de callback dans le Dashboard Spotify.
 */

require_once __DIR__ . '/../../config.php';

$db           = Database::getInstance();
$clientId     = $db->getSetting('spotify', 'client_id');
$clientSecret = $db->getSetting('spotify', 'client_secret');

$protocol    = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$redirectUri = $protocol . '://' . $_SERVER['HTTP_HOST'] . '/widgets/spotify/oauth.php';
$scopes      = 'user-read-currently-playing user-read-recently-played user-top-read';

// -------------------------------------------------------
// Étape 2 : callback Spotify
// -------------------------------------------------------
if (isset($_GET['error'])) {
    die(render('Accès refusé : ' . htmlspecialchars($_GET['error']), 'error'));
}

if (isset($_GET['code'])) {
    // Vérification CSRF
    $state         = $_GET['state']           ?? '';
    $expectedState = $_COOKIE['spotify_state'] ?? '';
    if (!$expectedState || !hash_equals($expectedState, $state)) {
        die(render('Erreur CSRF : state invalide.', 'error'));
    }

    // Échange code → tokens
    $credentials = base64_encode($clientId . ':' . $clientSecret);
    $tokenRes = httpPost('https://accounts.spotify.com/api/token', [
        'grant_type'   => 'authorization_code',
        'code'         => $_GET['code'],
        'redirect_uri' => $redirectUri,
    ], "Authorization: Basic $credentials");

    if (!isset($tokenRes['access_token'])) {
        $msg = $tokenRes['error_description'] ?? ($tokenRes['error'] ?? 'Réponse invalide');
        die(render("Erreur token : $msg", 'error'));
    }

    // Récupération du profil utilisateur
    $profile = httpGet('https://api.spotify.com/v1/me', $tokenRes['access_token']);

    // Sauvegarde en base
    $db->setSetting('spotify', 'access_token',  $tokenRes['access_token']);
    $db->setSetting('spotify', 'refresh_token', $tokenRes['refresh_token']);
    if (!empty($profile['id']))           $db->setSetting('spotify', 'user_id',   $profile['id']);
    if (!empty($profile['display_name'])) $db->setSetting('spotify', 'user_name', $profile['display_name']);

    (new Cache())->delete('widget_spotify');

    $name = htmlspecialchars($profile['display_name'] ?? $profile['id'] ?? 'inconnu');
    die(render("Connexion réussie ! Compte <strong>$name</strong> connecté. <a href='/'>Retour au dashboard</a>", 'success'));
}

// -------------------------------------------------------
// Étape 1 : lancer le flow OAuth
// -------------------------------------------------------
if (!$clientId || !$clientSecret) {
    die(render(
        'Client ID et Client Secret non configurés.<br>Configure-les via le bouton ⚙️ du widget Spotify.',
        'error'
    ));
}

$state = bin2hex(random_bytes(16));
setcookie('spotify_state', $state, ['expires' => time() + 300, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);

$authUrl = 'https://accounts.spotify.com/authorize?' . http_build_query([
    'client_id'     => $clientId,
    'response_type' => 'code',
    'redirect_uri'  => $redirectUri,
    'scope'         => $scopes,
    'state'         => $state,
]);

header('Location: ' . $authUrl);
exit;

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function httpPost(string $url, array $params, string $extraHeader = ''): array
{
    $headers = ['Content-Type: application/x-www-form-urlencoded'];
    if ($extraHeader) $headers[] = $extraHeader;

    $ctx = stream_context_create(['http' => [
        'method'        => 'POST',
        'header'        => implode("\r\n", $headers),
        'content'       => http_build_query($params),
        'timeout'       => 10,
        'ignore_errors' => true,
    ]]);
    return json_decode(@file_get_contents($url, false, $ctx) ?: '{}', true) ?? [];
}

function httpGet(string $url, string $token): array
{
    $ctx = stream_context_create(['http' => [
        'header'        => "Authorization: Bearer $token",
        'timeout'       => 10,
        'ignore_errors' => true,
    ]]);
    return json_decode(@file_get_contents($url, false, $ctx) ?: '{}', true) ?? [];
}

function render(string $message, string $type): string
{
    $color = $type === 'success' ? '#1DB954' : '#f56565';
    return <<<HTML
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Spotify OAuth — Dashboard</title>
        <style>
            body { background:#0f0f13; color:#e2e2e8; font-family:sans-serif;
                   display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
            .box { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
                   border-radius:12px; padding:32px 40px; max-width:480px; text-align:center; }
            .icon { font-size:40px; margin-bottom:16px; }
            p { color:{$color}; margin:0; line-height:1.6; }
            a { color:#7c6af7; }
        </style>
    </head>
    <body>
        <div class="box">
            <div class="icon">🎵</div>
            <p>$message</p>
        </div>
    </body>
    </html>
    HTML;
}
