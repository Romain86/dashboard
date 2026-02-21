<?php

// $input = JSON décodé du body POST
// $db    = instance Database (singleton)

$action = $input['action'] ?? '';

// Lire la liste actuelle
$listJson = $db->getSetting('parcels', 'tracking_list');
$list     = $listJson ? json_decode($listJson, true) : [];

// -------------------------------------------------------
// Auto-détection du transporteur par format du numéro
// -------------------------------------------------------
function detectCarrier(string $number): string {
    $n = strtoupper(trim($number));

    // Colissimo / La Poste : 13 chiffres commençant par 6A, 8R, 8V, CC, CB, CF, CI, CJ
    if (preg_match('/^(6A|8[A-Z]|C[A-Z])/i', $n) && strlen($n) >= 11) return 'colissimo';
    // La Poste lettre suivie : 13 caractères commençant par 1, 2, 3, 4, 5
    if (preg_match('/^[1-5][A-Z]\d{9}[A-Z]{2}$/', $n)) return 'laposte';

    // Chronopost : commence par XY, EY, ou numéro à 13 chiffres avec préfixe spécifique
    if (preg_match('/^(XY|EY|GY)/i', $n)) return 'chronopost';

    // UPS : 1Z + 16 chars
    if (preg_match('/^1Z[A-Z0-9]{16}$/i', $n)) return 'ups';

    // FedEx : 12, 15 ou 20 chiffres
    if (preg_match('/^\d{12}$/', $n) || preg_match('/^\d{15}$/', $n) || preg_match('/^\d{20}$/', $n)) return 'fedex';

    // DHL : 10 ou 11 chiffres, ou commence par JD/JJD + chiffres
    if (preg_match('/^(JD|JJD)\d{18,}$/', $n)) return 'dhl';
    if (preg_match('/^\d{10,11}$/', $n)) return 'dhl';

    // Mondial Relay : 8-12 chiffres (souvent 8)
    if (preg_match('/^\d{8}$/', $n)) return 'mondialrelay';

    // GLS : commence par un chiffre, 8-11 chiffres
    if (preg_match('/^\d{9,11}$/', $n)) return 'gls';

    // DPD : 14 chiffres
    if (preg_match('/^\d{14}$/', $n)) return 'dpd';

    // Cainiao / AliExpress : LP, LX, ou format international R + 9 chiffres + 2 lettres
    if (preg_match('/^(LP|LX|YANWEN)/i', $n)) return 'cainiao';
    if (preg_match('/^[A-Z]{2}\d{9}[A-Z]{2}$/', $n)) return 'cainiao';

    return 'autre';
}

switch ($action) {

    case 'add':
        $number  = trim($input['number'] ?? '');
        $label   = trim($input['label']  ?? '');
        $carrier = trim($input['carrier'] ?? '');

        if (!$number) {
            throw new Exception('Numéro de suivi requis');
        }

        // Vérifier doublon
        foreach ($list as $p) {
            if ($p['number'] === $number) {
                throw new Exception('Ce numéro est déjà suivi');
            }
        }

        // Auto-détection du transporteur si non spécifié
        if (!$carrier) {
            $carrier = detectCarrier($number);
        }

        // Ajouter à la liste locale
        $list[] = [
            'number'   => $number,
            'label'    => $label ?: $number,
            'carrier'  => $carrier,
            'status'   => 'pending',
            'added_at' => date('c'),
        ];

        $db->setSetting('parcels', 'tracking_list', json_encode($list));
        return ['success' => true, 'carrier' => $carrier, 'count' => count($list)];

    case 'remove':
        $number = trim($input['number'] ?? '');
        if (!$number) {
            throw new Exception('Numéro de suivi requis');
        }

        $list = array_values(array_filter($list, fn($p) => $p['number'] !== $number));
        $db->setSetting('parcels', 'tracking_list', json_encode($list));
        return ['success' => true, 'count' => count($list)];

    case 'status':
        $number = trim($input['number'] ?? '');
        $status = trim($input['status'] ?? '');
        if (!$number || !$status) {
            throw new Exception('Numéro et statut requis');
        }

        $validStatuses = ['pending', 'shipped', 'in_transit', 'out_delivery', 'delivered', 'issue'];
        if (!in_array($status, $validStatuses)) {
            throw new Exception('Statut invalide');
        }

        $found = false;
        foreach ($list as &$p) {
            if ($p['number'] === $number) {
                $p['status'] = $status;
                $found = true;
                break;
            }
        }
        unset($p);

        if (!$found) {
            throw new Exception('Colis non trouvé');
        }

        $db->setSetting('parcels', 'tracking_list', json_encode($list));
        return ['success' => true];

    default:
        throw new Exception('Action inconnue');
}
