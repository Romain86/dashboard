<?php

// $settings est injecté par WidgetManager::callWidget()
$apiKey = $settings['api_key'] ?? null;
$city   = $settings['city'] ?? null;
$lat    = $settings['_lat'] ?? null;
$lon    = $settings['_lon'] ?? null;

if (!$apiKey) {
    throw new Exception('Widget non configuré : clé API manquante');
}

if ($lat !== null && $lon !== null) {
    // Géolocalisation du navigateur
    $url = sprintf(
        'https://api.openweathermap.org/data/2.5/weather?lat=%s&lon=%s&appid=%s&units=metric&lang=fr',
        $lat,
        $lon,
        urlencode($apiKey)
    );
} elseif ($city) {
    // Ville configurée manuellement
    $url = sprintf(
        'https://api.openweathermap.org/data/2.5/weather?q=%s&appid=%s&units=metric&lang=fr',
        urlencode($city),
        urlencode($apiKey)
    );
} else {
    throw new Exception('Widget non configuré : ville manquante');
}

$ctx      = stream_context_create(['http' => ['timeout' => 5]]);
$response = @file_get_contents($url, false, $ctx);

if ($response === false) {
    throw new Exception('Impossible de contacter OpenWeatherMap');
}

$data = json_decode($response, true);

if (!isset($data['cod']) || (int) $data['cod'] !== 200) {
    throw new Exception($data['message'] ?? 'Erreur OpenWeatherMap');
}

// --- Prévisions pour demain (forecast 3h) ---
if ($lat !== null && $lon !== null) {
    $forecastUrl = sprintf(
        'https://api.openweathermap.org/data/2.5/forecast?lat=%s&lon=%s&appid=%s&units=metric&lang=fr',
        $lat, $lon, urlencode($apiKey)
    );
} else {
    $forecastUrl = sprintf(
        'https://api.openweathermap.org/data/2.5/forecast?q=%s&appid=%s&units=metric&lang=fr',
        urlencode($city), urlencode($apiKey)
    );
}

$fResponse = @file_get_contents($forecastUrl, false, $ctx);
$fData     = json_decode($fResponse ?: '{}', true);

$todayDate    = date('Y-m-d');
$tomorrowDate = date('Y-m-d', strtotime('tomorrow'));
$currentHour  = (int) date('H');
$forecastList = $fData['list'] ?? [];

// --- Créneau intermédiaire : cet après-midi (si matin) ou cette nuit ---
$middleLabel  = $currentHour < 12 ? 'Cet après-midi' : 'Cette nuit';
$middleTarget = $currentHour < 12 ? 14 : 22;
$middleItem   = null;
$middleDiff   = PHP_INT_MAX;

foreach ($forecastList as $item) {
    $itemDate = substr($item['dt_txt'], 0, 10);
    $itemHour = (int) substr($item['dt_txt'], 11, 2);
    if (strtotime($item['dt_txt']) <= time()) continue;

    if ($currentHour < 12) {
        if ($itemDate !== $todayDate || $itemHour < 12) continue;
        $diff = abs($itemHour - $middleTarget);
    } else {
        if ($itemDate === $todayDate && $itemHour >= 18) {
            $diff = abs($itemHour - $middleTarget);
        } elseif ($itemDate === $tomorrowDate && $itemHour <= 6) {
            $diff = abs($itemHour - 0) + 6;
        } else {
            continue;
        }
    }
    if ($diff < $middleDiff) { $middleDiff = $diff; $middleItem = $item; }
}

$middle = null;
if ($middleItem) {
    $middle = [
        'label'       => $middleLabel,
        'temp'        => (int) round($middleItem['main']['temp']),
        'feels_like'  => (int) round($middleItem['main']['feels_like']),
        'humidity'    => $middleItem['main']['humidity'],
        'wind_speed'  => (int) round($middleItem['wind']['speed'] * 3.6),
        'description' => ucfirst($middleItem['weather'][0]['description']),
        'icon'        => $middleItem['weather'][0]['icon'],
    ];
}

// --- Demain ---
$tomorrowItems = array_filter(
    $forecastList,
    fn($item) => strpos($item['dt_txt'], $tomorrowDate) === 0
);

$tomorrow = null;
if ($tomorrowItems) {
    $temps  = array_column(array_column($tomorrowItems, 'main'), 'temp');
    $midday = null;
    $minDiff = PHP_INT_MAX;
    foreach ($tomorrowItems as $item) {
        $hour = (int) substr($item['dt_txt'], 11, 2);
        $diff = abs($hour - 12);
        if ($diff < $minDiff) { $minDiff = $diff; $midday = $item; }
    }
    // Lever/coucher du soleil pour demain via les coordonnées de la ville
    $sunInfo = date_sun_info(
        strtotime('tomorrow'),
        (float) $data['coord']['lat'],
        (float) $data['coord']['lon']
    );
    $tzOffset        = (int) $data['timezone'];
    $tomorrowSunrise = gmdate('H:i', $sunInfo['sunrise'] + $tzOffset);
    $tomorrowSunset  = gmdate('H:i', $sunInfo['sunset']  + $tzOffset);

    $tomorrow = [
        'temp'        => (int) round($midday['main']['temp']),
        'feels_like'  => (int) round($midday['main']['feels_like']),
        'temp_min'    => (int) round(min($temps)),
        'temp_max'    => (int) round(max($temps)),
        'humidity'    => $midday['main']['humidity'],
        'wind_speed'  => (int) round($midday['wind']['speed'] * 3.6),
        'description' => ucfirst($midday['weather'][0]['description']),
        'icon'        => $midday['weather'][0]['icon'],
        'sunrise'     => $tomorrowSunrise,
        'sunset'      => $tomorrowSunset,
    ];
}

// --- J+2, J+3, J+4 ---
$frDays = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
$forecast = [];
for ($d = 2; $d <= 4; $d++) {
    $targetDate = date('Y-m-d', strtotime("+{$d} days"));
    $dayItems   = array_values(array_filter(
        $forecastList,
        fn($item) => strpos($item['dt_txt'], $targetDate) === 0
    ));
    if (!$dayItems) continue;

    $temps   = array_column(array_column($dayItems, 'main'), 'temp');
    $midday  = $dayItems[0];
    $minDiff = PHP_INT_MAX;
    foreach ($dayItems as $item) {
        $hour = (int) substr($item['dt_txt'], 11, 2);
        $diff = abs($hour - 12);
        if ($diff < $minDiff) { $minDiff = $diff; $midday = $item; }
    }

    $dayOfWeek = (int) date('w', strtotime($targetDate));
    $sunInfo   = date_sun_info(
        strtotime($targetDate),
        (float) $data['coord']['lat'],
        (float) $data['coord']['lon']
    );
    $tzOffset = (int) $data['timezone'];

    $forecast[] = [
        'label'       => $frDays[$dayOfWeek],
        'temp'        => (int) round($midday['main']['temp']),
        'feels_like'  => (int) round($midday['main']['feels_like']),
        'temp_min'    => (int) round(min($temps)),
        'temp_max'    => (int) round(max($temps)),
        'humidity'    => $midday['main']['humidity'],
        'wind_speed'  => (int) round($midday['wind']['speed'] * 3.6),
        'description' => ucfirst($midday['weather'][0]['description']),
        'icon'        => $midday['weather'][0]['icon'],
        'sunrise'     => gmdate('H:i', $sunInfo['sunrise'] + $tzOffset),
        'sunset'      => gmdate('H:i', $sunInfo['sunset']  + $tzOffset),
    ];
}

// --- Qualité de l'air (AQI) ---
$aqi = null;
$aqiLat = $data['coord']['lat'];
$aqiLon = $data['coord']['lon'];
$aqiUrl = sprintf(
    'https://api.openweathermap.org/data/2.5/air_pollution?lat=%s&lon=%s&appid=%s',
    $aqiLat, $aqiLon, urlencode($apiKey)
);
$aqiResponse = @file_get_contents($aqiUrl, false, $ctx);
if ($aqiResponse !== false) {
    $aqiData  = json_decode($aqiResponse, true);
    $aqiValue = $aqiData['list'][0]['main']['aqi'] ?? null;
    if ($aqiValue !== null) {
        $aqiLabels = [1 => 'Bon', 2 => 'Correct', 3 => 'Modéré', 4 => 'Mauvais', 5 => 'Très mauvais'];
        $aqiColors = [1 => 'green', 2 => 'yellow', 3 => 'orange', 4 => 'red', 5 => 'purple'];
        $aqi = [
            'value' => $aqiValue,
            'label' => $aqiLabels[$aqiValue] ?? 'Inconnu',
            'color' => $aqiColors[$aqiValue] ?? 'gray',
        ];
    }
}

return [
    'city'        => $data['name'],
    'country'     => $data['sys']['country'],
    'temp'        => (int) round($data['main']['temp']),
    'feels_like'  => (int) round($data['main']['feels_like']),
    'temp_min'    => (int) round($data['main']['temp_min']),
    'temp_max'    => (int) round($data['main']['temp_max']),
    'humidity'    => $data['main']['humidity'],
    'description' => ucfirst($data['weather'][0]['description']),
    'icon'        => $data['weather'][0]['icon'],
    'wind_speed'  => (int) round($data['wind']['speed'] * 3.6), // m/s → km/h
    'sunrise'     => gmdate('H:i', $data['sys']['sunrise'] + $data['timezone']),
    'sunset'      => gmdate('H:i', $data['sys']['sunset']  + $data['timezone']),
    'middle'      => $middle,
    'tomorrow'    => $tomorrow,
    'forecast'    => $forecast,
    'aqi'         => $aqi,
];
