<?php

// $input injecté par api/widgets.php (action=mutate)
// $db    injecté par WidgetManager

$action = $input['action'] ?? '';

$current    = (int) ($db->getSetting('s17', 'current_episode')      ?? 0);
$inProgress = (int) ($db->getSetting('s17', 'episode_in_progress')  ?? 0);

switch ($action) {
    case 'start':
        // Commence à regarder l'épisode suivant (sans le terminer)
        $inProgress = 1;
        break;

    case 'watch':
        // Épisode terminé → +1 et on réinitialise "en cours"
        $current++;
        $inProgress = 0;
        break;

    case 'unwatch':
        // Annuler le dernier épisode vu
        if ($current > 0) $current--;
        $inProgress = 0;
        break;

    case 'cancel':
        // Annuler "en cours" (finalement pas commencé)
        $inProgress = 0;
        break;

    default:
        throw new Exception('Action inconnue');
}

$db->setSetting('s17', 'current_episode', $current);
$db->setSetting('s17', 'episode_in_progress', $inProgress);

return ['current_ep' => $current, 'in_progress' => (bool) $inProgress];
