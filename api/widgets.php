<?php

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$action   = $_GET['action'] ?? 'list';
$widgetId = $_GET['widget'] ?? null;
$tabId    = (int) ($_GET['tab'] ?? 1);

$manager = new WidgetManager(WIDGETS_PATH);
$db      = Database::getInstance();
$cache   = new Cache();

try {
    switch ($action) {

        // Lister tous les widgets disponibles avec leur état (activé/position)
        case 'list':
            $available = $manager->getAvailableWidgets();
            $layout    = $db->getLayout($tabId);
            $layoutMap = array_column($layout, null, 'widget_id');

            $result = [];
            foreach ($available as $id => $config) {
                $result[] = [
                    'id'       => $id,
                    'name'     => $config['name'],
                    'icon'     => $config['icon'],
                    'enabled'  => isset($layoutMap[$id]) ? (bool) $layoutMap[$id]['enabled'] : ($tabId === 1),
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
                $db->saveLayout($item['id'], $item['position'], $item['enabled'], $tabId);
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

        // Exporter tous les paramètres et le layout
        case 'export':
            $tabs = $db->getTabs();
            $allLayouts = [];
            foreach ($tabs as $tab) {
                $layouts = $db->getLayout($tab['id']);
                foreach ($layouts as &$l) {
                    $l['tab_id'] = $tab['id'];
                }
                $allLayouts = array_merge($allLayouts, $layouts);
            }
            $export = [
                'version'     => 2,
                'exported_at' => date('c'),
                'settings'    => $db->getAllSettings(),
                'layout'      => $allLayouts,
                'tabs'        => $tabs,
            ];
            header('Content-Disposition: attachment; filename="dashboard-backup-' . date('Y-m-d') . '.json"');
            echo json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            break;

        // Importer paramètres et layout depuis un fichier JSON
        case 'import':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Requête invalide');
            }
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['settings']) || !isset($input['layout'])) {
                throw new Exception('Format de fichier invalide');
            }
            foreach ($input['settings'] as $wId => $pairs) {
                foreach ($pairs as $key => $value) {
                    $db->setSetting($wId, $key, $value);
                }
            }
            foreach ($input['layout'] as $item) {
                $itemTab = (int) ($item['tab_id'] ?? 1);
                $db->saveLayout($item['widget_id'], (int) $item['position'], (bool) $item['enabled'], $itemTab);
                if (isset($item['size'])) {
                    $db->saveSize($item['widget_id'], $item['size'], $itemTab);
                }
            }
            // Importer les onglets si présents
            if (!empty($input['tabs'])) {
                foreach ($input['tabs'] as $tab) {
                    if ((int) $tab['id'] === 1) {
                        $db->renameTab(1, $tab['name']);
                    } else {
                        // Créer seulement si l'onglet n'existe pas déjà
                        $existing = $db->getTabs();
                        $ids = array_column($existing, 'id');
                        if (!in_array((int) $tab['id'], $ids)) {
                            $db->createTab($tab['name'], (int) ($tab['position'] ?? 999));
                        }
                    }
                }
            }
            $cache->clear();
            echo json_encode(['success' => true]);
            break;

        // Sauvegarder la taille d'un widget
        case 'size':
            if (!$widgetId || $_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Requête invalide');
            }

            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $db->saveSize($widgetId, $input['size'] ?? 'normal', $tabId);

            echo json_encode(['success' => true]);
            break;

        // --- Tabs ---

        case 'tabs':
            echo json_encode(['success' => true, 'tabs' => $db->getTabs()]);
            break;

        case 'tab-create':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Requête invalide');
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $name  = trim($input['name'] ?? '');
            if (!$name) throw new Exception('Nom de l\'onglet requis');
            $id = $db->createTab($name, (int) ($input['position'] ?? 999));
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        case 'tab-rename':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Requête invalide');
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $name  = trim($input['name'] ?? '');
            if (!$name) throw new Exception('Nom requis');
            $db->renameTab((int) $input['id'], $name);
            echo json_encode(['success' => true]);
            break;

        case 'tab-delete':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Requête invalide');
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            $delId = (int) $input['id'];
            if ($delId === 1) throw new Exception('Impossible de supprimer l\'onglet principal');
            $db->deleteTab($delId);
            echo json_encode(['success' => true]);
            break;

        default:
            throw new Exception("Action '$action' inconnue");
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
