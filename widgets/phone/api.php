<?php

// Widget Phone — Lit les notifications depuis Phone Link (Mobile connecté)
// Source : base SQLite locale de Microsoft.YourPhone

// -------------------------------------------------------
// 1. Trouver le chemin Phone Link
// -------------------------------------------------------
$phoneLinkBase = getenv('LOCALAPPDATA') . '\\Packages\\Microsoft.YourPhone_8wekyb3d8bbwe\\LocalCache\\Indexed';

if (!is_dir($phoneLinkBase)) {
    return [
        'error' => 'Phone Link non installé',
        'notifications' => [],
        'device' => null,
    ];
}

// Trouver le premier sous-dossier GUID contenant les DB
$deviceGuid = null;
$deviceDir  = null;
foreach (scandir($phoneLinkBase) as $entry) {
    if ($entry === '.' || $entry === '..') continue;
    $candidate = "$phoneLinkBase\\$entry\\System\\Database\\notifications.db";
    if (file_exists($candidate)) {
        $deviceGuid = $entry;
        $deviceDir  = "$phoneLinkBase\\$entry\\System\\Database";
        break;
    }
}

if (!$deviceDir) {
    return [
        'error' => 'Aucun appareil Phone Link trouvé',
        'notifications' => [],
        'device' => null,
    ];
}

// -------------------------------------------------------
// 2. Lire les métadonnées de l'appareil
// -------------------------------------------------------
$device = ['name' => 'Téléphone', 'os' => '', 'model' => ''];

$metaPaths = [
    getenv('LOCALAPPDATA') . '\\Packages\\MicrosoftWindows.CrossDevice_cw5n1h2txyewy\\LocalCache\\DeviceMetadataStorage.json',
    getenv('LOCALAPPDATA') . '\\Packages\\Microsoft.YourPhone_8wekyb3d8bbwe\\LocalCache\\DeviceMetadataStorage.json',
];

foreach ($metaPaths as $metaPath) {
    if (!file_exists($metaPath)) continue;
    $metaJson = @json_decode(file_get_contents($metaPath), true);
    if (!$metaJson || empty($metaJson['DeviceMetadatas'])) continue;

    foreach ($metaJson['DeviceMetadatas'] as $devices) {
        foreach ($devices as $dev) {
            $id = $dev['Metadata']['Id'] ?? '';
            if ($id !== $deviceGuid) continue;
            $meta = $dev['Metadata']['Metadata'] ?? [];
            if (!empty($meta['DisplayName'])) $device['name'] = $meta['DisplayName'];
            if (!empty($meta['OsName']))      $device['os']   = $meta['OsName'] . ' ' . ($meta['OsVersion'] ?? '');
            if (!empty($meta['ModelName']) && $meta['ModelName'] !== 'Unknown') {
                $device['model'] = $meta['Manufacture'] . ' ' . $meta['ModelName'];
            }
            $device['last_seen'] = $dev['Metadata']['LastSeenTime'] ?? '';
            break 3;
        }
    }
}

// -------------------------------------------------------
// 3. Copier la DB notifications pour éviter le verrou
// -------------------------------------------------------
$srcDb  = "$deviceDir\\notifications.db";
$tmpDb  = CACHE_PATH . '/phone_notif.db';
$tmpShm = CACHE_PATH . '/phone_notif.db-shm';
$tmpWal = CACHE_PATH . '/phone_notif.db-wal';

@copy($srcDb, $tmpDb);
@copy("$srcDb-shm", $tmpShm);
@copy("$srcDb-wal", $tmpWal);

if (!file_exists($tmpDb)) {
    return [
        'error' => 'Impossible de copier la base notifications',
        'notifications' => [],
        'device' => $device,
    ];
}

// -------------------------------------------------------
// 4. Lire les notifications
// -------------------------------------------------------
$notifications = [];

try {
    $pdo = new PDO("sqlite:$tmpDb");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->query("
        SELECT id, package_name, json, post_time, state
        FROM notifications
        ORDER BY post_time DESC
        LIMIT 30
    ");

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $json = @json_decode($row['json'], true);
        if (!$json) continue;

        // Ignorer les notifications système/ongoing non intéressantes
        if (!empty($json['isOngoing'])) continue;

        $notifications[] = [
            'id'       => $row['id'],
            'app'      => $json['appName'] ?? $row['package_name'],
            'package'  => $row['package_name'],
            'title'    => $json['title'] ?? '',
            'text'     => $json['bigText'] ?? $json['text'] ?? '',
            'time'     => $json['postTime'] ?? 0, // Unix ms
            'category' => $json['category'] ?? '',
        ];
    }

    $pdo = null;
} catch (Exception $e) {
    return [
        'error' => 'Erreur lecture DB : ' . $e->getMessage(),
        'notifications' => [],
        'device' => $device,
    ];
}

// Nettoyage des copies temporaires
@unlink($tmpDb);
@unlink($tmpShm);
@unlink($tmpWal);

// -------------------------------------------------------
// 5. Retourner les données
// -------------------------------------------------------
return [
    'notifications' => $notifications,
    'count'         => count($notifications),
    'device'        => $device,
];
