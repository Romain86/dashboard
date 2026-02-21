<?php

// $settings injecté par WidgetManager::callWidget()
$campaignUrl   = $settings['campaign_url']    ?? null;
$campaignName  = $settings['campaign_name']   ?? 'Campagne';
$anchorDate    = $settings['ep_anchor_date']  ?? '';   // ex: "2026-02-18" (un mercredi)
$anchorCount   = (int) ($settings['ep_anchor_count'] ?? 0); // nb d'épisodes à cette date
$releaseHour   = (int) ($settings['ep_release_hour'] ?? 10); // heure de sortie (défaut 10h)

if (!$campaignUrl || !$anchorDate || $anchorCount === 0) {
    throw new Exception('Widget non configuré : URL, date de référence et nombre d\'épisodes requis');
}

// État de visionnage (stocké via mutate.php → setSetting)
$currentEp   = (int) ($settings['current_episode']     ?? 0);
$inProgress  = (bool) ($settings['episode_in_progress'] ?? false);

// -----------------------------------------------------------
// Calcul du nombre d'épisodes publiés à ce jour
// Principe : anchorDate est un mercredi où anchorCount épisodes existaient.
// Chaque mercredi suivant à releaseHour:00 (Europe/Paris) = +1 épisode.
// -----------------------------------------------------------
$tz = new DateTimeZone('Europe/Paris');

try {
    $anchor = new DateTime($anchorDate . ' ' . sprintf('%02d', $releaseHour) . ':00:00', $tz);
} catch (Exception $e) {
    throw new Exception('Date de référence invalide (format attendu : YYYY-MM-DD)');
}

$now = new DateTime('now', $tz);

// Compter les mercredis écoulés depuis l'ancre (exclu) jusqu'à maintenant (inclus)
$additional = 0;
$cursor = clone $anchor;
$cursor->modify('+7 days'); // premier mercredi après l'ancre
while ($cursor <= $now) {
    $additional++;
    $cursor->modify('+7 days');
}

$epTotal = $anchorCount + $additional;

// Titre du dernier épisode : on ne peut plus scraper → on indique le numéro
$latestTitle = 'Épisode ' . $epTotal;

// Prochain épisode
$nextRelease = clone $anchor;
$nextRelease->modify('+7 days');
while ($nextRelease <= $now) {
    $nextRelease->modify('+7 days');
}
$nextReleaseTs = $nextRelease->getTimestamp();

$behind = max(0, $epTotal - $currentEp);

return [
    'campaign_name'   => $campaignName,
    'campaign_url'    => $campaignUrl,
    'current_ep'      => $currentEp,
    'ep_total'        => $epTotal,
    'behind'          => $behind,
    'in_progress'     => $inProgress,
    'next_release_ts' => $nextReleaseTs,
];
