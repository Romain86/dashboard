<?php

// $settings est injecté par WidgetManager::callWidget()
$apiKey  = $settings['api_key']  ?? null;
$steamId = $settings['steam_id'] ?? null;

if (!$apiKey || !$steamId) {
    throw new Exception('Widget non configuré : clé API ou Steam ID manquant');
}

$ctx = stream_context_create(['http' => ['timeout' => 5, 'ignore_errors' => true]]);

// -------------------------------------------------------
// Profil + statut en ligne
// -------------------------------------------------------
$profileUrl = sprintf(
    'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=%s&steamids=%s',
    urlencode($apiKey),
    urlencode($steamId)
);
$profileRes = json_decode(@file_get_contents($profileUrl, false, $ctx) ?: '{}', true);
$player     = $profileRes['response']['players'][0] ?? null;

if (!$player) {
    throw new Exception('Profil Steam introuvable. Vérifie le Steam ID.');
}

// -------------------------------------------------------
// Jeux récents (14 derniers jours)
// -------------------------------------------------------
$recentUrl = sprintf(
    'https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=%s&steamid=%s&count=5',
    urlencode($apiKey),
    urlencode($steamId)
);
$recentRes  = json_decode(@file_get_contents($recentUrl, false, $ctx) ?: '{}', true);
$recentGames = array_map(fn($g) => [
    'name'             => $g['name'],
    'appid'            => $g['appid'],
    'playtime_2weeks'  => $g['playtime_2weeks']  ?? 0,
    'playtime_forever' => $g['playtime_forever'] ?? 0,
    'image'            => "https://media.steampowered.com/steamapp/{$g['appid']}/header.jpg",
    'url'              => "https://store.steampowered.com/app/{$g['appid']}",
], $recentRes['response']['games'] ?? []);

// -------------------------------------------------------
// Statut
// -------------------------------------------------------
$stateLabels = [
    0 => 'Hors ligne', 1 => 'En ligne',   2 => 'Occupé',
    3 => 'Absent',     4 => 'Somnolent',  5 => 'Disponible',  6 => 'Disponible',
];
$state     = (int) ($player['personastate'] ?? 0);
$inGame    = !empty($player['gameid']);
$statusLabel = $inGame ? 'En jeu' : ($stateLabels[$state] ?? 'Hors ligne');

return [
    'name'        => $player['personaname'],
    'avatar'      => $player['avatarfull'],
    'profile_url' => $player['profileurl'],
    'status'      => $statusLabel,
    'in_game'     => $inGame,
    'game'        => $inGame ? [
        'name'  => $player['gameextrainfo'] ?? 'Jeu inconnu',
        'id'    => $player['gameid'],
        'image' => "https://media.steampowered.com/steamapp/{$player['gameid']}/header.jpg",
        'url'   => "https://store.steampowered.com/app/{$player['gameid']}",
    ] : null,
    'recent_games' => $recentGames,
];
