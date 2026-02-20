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
    'sunrise'     => date('H:i', $data['sys']['sunrise'] + $data['timezone']),
    'sunset'      => date('H:i', $data['sys']['sunset']  + $data['timezone']),
];
