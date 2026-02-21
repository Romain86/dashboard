<?php

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$action   = $_GET['action'] ?? 'list';
$widgetId = $_GET['widget'] ?? null;

$manager = new WidgetManager(WIDGETS_PATH);
$db      = Database::getInstance();
$cache   = new Cache();

try {
    switch ($action) {

        // Lister tous les widgets disponibles avec leur état (activé/position)
        case 'list':
            $available = $manager->getAvailableWidgets();
            $layout    = $db->getLayout();
            $layoutMap = array_column($layout, null, 'widget_id');

            $result = [];
            foreach ($available as $id => $config) {
                $result[] = [
                    'id'       => $id,
                    'name'     => $config['name'],
                    'icon'     => $config['icon'],
                    'enabled'  => isset($layoutMap[$id]) ? (bool) $layoutMap[$id]['enabled'] : true,
                    'position' => $layoutMap[$id]['position'] ?? 999,
                    'size'     => $layoutMap[$id]['size']     ?? 'normal',
                ];
            }

            // Trier par position
            usort($result, fn($a, $b) => $a['position'] <=> $b['position']);

            echo json_encode(['success' => true, 'widgets' => $result]);
            break;

        // Récupérer les données d'un widget
        case 'data':
            if (!$widgetId) {
                throw new Exception('Paramètre widget manquant');
            }

            $settings = $db->getSettings($widgetId);

            // Transmettre la géolocalisation du navigateur si fournie
            if (isset($_GET['lat'], $_GET['lon'])) {
                $settings['_lat'] = (float) $_GET['lat'];
                $settings['_lon'] = (float) $_GET['lon'];
            }

            // Force refresh : vider le cache avant l'appel
            if (!empty($_GET['force'])) {
                $cache->deleteByPrefix('widget_' . $widgetId);
            }

            $data     = $manager->callWidget($widgetId, $settings, $cache);
            $cacheKey = $manager->getCacheKey($widgetId, $settings);
            $cacheTs  = $cache->getCachedAt($cacheKey);

            echo json_encode(['success' => true, 'data' => $data, 'cache_ts' => $cacheTs]);
            break;

        // Récupérer les paramètres d'un widget
        case 'settings-get':
            if (!$widgetId) {
                throw new Exception('Paramètre widget manquant');
            }

            $settings = $db->getSettings($widgetId);
            echo json_encode(['success' => true, 'settings' => $settings]);
            break;

        // Sauvegarder les paramètres d'un widget
        case 'settings':
            if (!$widgetId || $_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Requête invalide');
            }

            $input = json_decode(file_get_contents('php://input'), true) ?? [];

            foreach ($input as $key => $value) {
                $db->setSetting($widgetId, $key, $value);
            }

            // Vider toutes les variantes de cache (y compris les clés avec coordonnées GPS)
            $cache->deleteByPrefix('widget_' . $widgetId);

            echo json_encode(['success' => true]);
            break;

        // Sauvegarder la disposition des widgets
        case 'layout':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Requête invalide');
            }

            $input = json_decode(file_get_contents('php://input'), true) ?? [];

            foreach ($input as $item) {
                $db->saveLayout($item['id'], $item['position'], $item['enabled']);
            }

            echo json_encode(['success' => true]);
            break;

        // Action CRUD générique — appelle widgets/{id}/mutate.php sans cache
        case 'mutate':
            if (!$widgetId || $_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Requête invalide');
            }

            $mutatePath = WIDGETS_PATH . '/' . $widgetId . '/mutate.php';
            if (!file_exists($mutatePath)) {
                throw new Exception("Le widget '$widgetId' ne supporte pas les mutations");
            }

            $input  = json_decode(file_get_contents('php://input'), true) ?? [];
            $pdo    = $db->getPdo();
            $result = include $mutatePath;

            $cache->deleteByPrefix('widget_' . $widgetId);

            echo json_encode(['success' => true, 'data' => $result]);
            break;

        // Sauvegarder la taille d'un widget
        case 'size':
            if (!$widgetId || $_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Requête invalide');
            }

            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $db->saveSize($widgetId, $input['size'] ?? 'normal');

            echo json_encode(['success' => true]);
            break;

        default:
            throw new Exception("Action '$action' inconnue");
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
