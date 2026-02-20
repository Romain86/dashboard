<?php

/**
 * Twitch OAuth2 — Page d'autorisation
 *
 * Visiter une seule fois pour connecter son compte Twitch :
 *   https://dashboard.test/widgets/twitch/oauth.php
 *
 * Prérequis : configurer Client ID + Secret via le modal settings du widget,
 * et ajouter l'URL de callback dans les Redirect URIs de votre app Twitch.
 */

require_once __DIR__ . '/../../config.php';

$db           = Database::getInstance();
$clientId     = $db->getSetting('twitch', 'client_id');
$clientSecret = $db->getSetting('twitch', 'client_secret');

$protocol    = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$redirectUri = $protocol . '://' . $_SERVER['HTTP_HOST'] . '/widgets/twitch/oauth.php';
$scope       = 'user:read:follows';

// -------------------------------------------------------
// Étape 2 : Twitch renvoie un code (ou une erreur)
// -------------------------------------------------------
if (isset($_GET['error'])) {
    $err = htmlspecialchars($_GET['error_description'] ?? $_GET['error']);
    die(render("Erreur Twitch : $err", 'error'));
}

if (isset($_GET['code'])) {
    // Vérification CSRF
    $state         = $_GET['state']           ?? '';
    $expectedState = $_COOKIE['twitch_state'] ?? '';
    if (!$expectedState || !hash_equals($expectedState, $state)) {
        die(render('Erreur CSRF : state invalide.', 'error'));
    }

    // Échange du code contre les tokens
    $tokenRes = httpPost('https://id.twitch.tv/oauth2/token', [
        'client_id'     => $clientId,
        'client_secret' => $clientSecret,
        'code'          => $_GET['code'],
        'grant_type'    => 'authorization_code',
        'redirect_uri'  => $redirectUri,
    ]);

    if (!isset($tokenRes['access_token'])) {
        $msg = $tokenRes['message'] ?? ($tokenRes['error'] ?? 'Réponse invalide');
        die(render("Erreur token : $msg", 'error'));
    }

    // Récupération des infos utilisateur
    $userRes = httpGet('https://api.twitch.tv/helix/users', $clientId, $tokenRes['access_token']);
    $user    = $userRes['data'][0] ?? [];

    // Sauvegarde en base
    $db->setSetting('twitch', 'access_token',  $tokenRes['access_token']);
    $db->setSetting('twitch', 'refresh_token', $tokenRes['refresh_token']);
    if (!empty($user['id']))           $db->setSetting('twitch', 'user_id',      $user['id']);
    if (!empty($user['display_name'])) $db->setSetting('twitch', 'user_name',    $user['display_name']);

    // Vider le cache
    (new Cache())->delete('widget_twitch');

    $name = htmlspecialchars($user['display_name'] ?? 'inconnu');
    die(render("Connexion réussie ! Compte <strong>$name</strong> connecté. <a href='/'>Retour au dashboard</a>", 'success'));
}

// -------------------------------------------------------
// Étape 1 : Lancer le flow OAuth
// -------------------------------------------------------
if (!$clientId || !$clientSecret) {
    die(render(
        'Client ID et Client Secret non configurés.<br>Configure-les via le bouton ⚙️ du widget Twitch, puis reviens ici.',
        'error'
    ));
}

$state = bin2hex(random_bytes(16));
setcookie('twitch_state', $state, ['expires' => time() + 300, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);

$authUrl = 'https://id.twitch.tv/oauth2/authorize?' . http_build_query([
    'client_id'     => $clientId,
    'redirect_uri'  => $redirectUri,
    'response_type' => 'code',
    'scope'         => $scope,
    'state'         => $state,
]);

header('Location: ' . $authUrl);
exit;

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function httpPost(string $url, array $params): array
{
    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => 'Content-Type: application/x-www-form-urlencoded',
        'content' => http_build_query($params),
        'timeout' => 10,
        'ignore_errors' => true,
    ]]);
    return json_decode(@file_get_contents($url, false, $ctx) ?: '{}', true) ?? [];
}

function httpGet(string $url, string $clientId, string $token): array
{
    $ctx = stream_context_create(['http' => [
        'header'  => "Client-ID: $clientId\r\nAuthorization: Bearer $token",
        'timeout' => 10,
        'ignore_errors' => true,
    ]]);
    return json_decode(@file_get_contents($url, false, $ctx) ?: '{}', true) ?? [];
}

function render(string $message, string $type): string
{
    $color = $type === 'success' ? '#68d391' : '#f56565';
    return <<<HTML
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Twitch OAuth — Dashboard</title>
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
            <div class="icon">🟣</div>
            <p>$message</p>
        </div>
    </body>
    </html>
    HTML;
}
