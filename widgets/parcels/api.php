<?php

// Widget Colis — mode local (pas d'API externe)
// Les colis sont stockés en SQLite avec statut manuel

$db       = Database::getInstance();
$listJson = $db->getSetting('parcels', 'tracking_list');
$list     = $listJson ? json_decode($listJson, true) : [];

// -------------------------------------------------------
// Transporteurs connus et leurs pages de suivi
// -------------------------------------------------------
$carriers = [
    'laposte'    => ['name' => 'La Poste',    'url' => 'https://www.laposte.fr/outils/suivre-vos-envois?code={number}'],
    'colissimo'  => ['name' => 'Colissimo',   'url' => 'https://www.laposte.fr/outils/suivre-vos-envois?code={number}'],
    'chronopost' => ['name' => 'Chronopost',  'url' => 'https://www.chronopost.fr/tracking-no-powerful/tracking-recherche/{number}'],
    'ups'        => ['name' => 'UPS',         'url' => 'https://www.ups.com/track?tracknum={number}'],
    'dhl'        => ['name' => 'DHL',         'url' => 'https://www.dhl.com/fr-fr/home/suivi.html?tracking-id={number}'],
    'fedex'      => ['name' => 'FedEx',       'url' => 'https://www.fedex.com/fedextrack/?trknbr={number}'],
    'mondialrelay' => ['name' => 'Mondial Relay', 'url' => 'https://www.mondialrelay.fr/suivi-de-colis/?NumeroExpedition={number}'],
    'gls'        => ['name' => 'GLS',         'url' => 'https://gls-group.com/FR/fr/suivi-colis?match={number}'],
    'dpd'        => ['name' => 'DPD',         'url' => 'https://trace.dpd.fr/fr/trace/{number}'],
    'amazon'     => ['name' => 'Amazon',      'url' => 'https://www.amazon.fr/gp/css/shiptrack/view.html/ref=pe_tracking?ie=UTF8&trackId={number}'],
    'cainiao'    => ['name' => 'Cainiao',     'url' => 'https://global.cainiao.com/detail.htm?mailNoList={number}'],
    'autre'      => ['name' => 'Autre',       'url' => ''],
];

// -------------------------------------------------------
// Statuts possibles
// -------------------------------------------------------
$statusLabels = [
    'pending'     => 'En attente',
    'shipped'     => 'Expédié',
    'in_transit'  => 'En transit',
    'out_delivery'=> 'En livraison',
    'delivered'   => 'Livré',
    'issue'       => 'Problème',
];

$carrierNames = array_map(fn($c) => $c['name'], $carriers);

if (empty($list)) {
    return ['parcels' => [], 'count' => 0, 'carriers' => $carrierNames];
}

// -------------------------------------------------------
// Construire la réponse
// -------------------------------------------------------
$parcels = [];
foreach ($list as $parcel) {
    $carrierId = $parcel['carrier'] ?? 'autre';
    $carrier   = $carriers[$carrierId] ?? $carriers['autre'];
    $status    = $parcel['status'] ?? 'pending';

    $trackingUrl = '';
    if ($carrier['url']) {
        $trackingUrl = str_replace('{number}', urlencode($parcel['number']), $carrier['url']);
    }

    $parcels[] = [
        'number'       => $parcel['number'],
        'label'        => $parcel['label'] ?? $parcel['number'],
        'carrier_id'   => $carrierId,
        'carrier'      => $carrier['name'],
        'tracking_url' => $trackingUrl,
        'status'       => $status,
        'status_label' => $statusLabels[$status] ?? $status,
        'delivered'    => $status === 'delivered',
        'added_at'     => $parcel['added_at'] ?? '',
    ];
}

// Tri : en cours en premier, livrés en dernier
usort($parcels, function ($a, $b) {
    if ($a['delivered'] !== $b['delivered']) return $a['delivered'] ? 1 : -1;
    return strcmp($b['added_at'], $a['added_at']);
});

return [
    'parcels'  => $parcels,
    'count'    => count($parcels),
    'carriers' => $carrierNames,
];
