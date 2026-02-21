<?php

// $settings est injecté par WidgetManager::callWidget()
$apiKey      = $settings['api_key']      ?? null;
$filter      = $settings['filter']      ?? 'trending'; // trending | now_playing | popular | top_rated
$genreIds    = $settings['genre_ids']   ?? '';         // "28,12,..." ou vide
$providerIds = $settings['provider_ids'] ?? '';        // "8,119,..." ou vide

// Support multiselect : "movie", "tv", ou "movie,tv"
$contentTypes = array_values(array_filter(
    array_map('trim', explode(',', $settings['content_type'] ?? 'movie'))
));
if (empty($contentTypes)) {
    $contentTypes = ['movie'];
}

if (!$apiKey) {
    throw new Exception('Widget non configuré : clé API TMDB manquante');
}

$ctx  = stream_context_create(['http' => ['timeout' => 8, 'ignore_errors' => true]]);
$base = 'https://api.themoviedb.org/3';
$lang = 'fr-FR';
$useDiscover = $genreIds !== '' || $providerIds !== '';

// -------------------------------------------------------
// Construire l'URL selon le filtre et le type de contenu
// -------------------------------------------------------
function tmdbUrl(string $type, string $filter, string $apiKey, string $lang, string $base, string $genreIds, string $providerIds, bool $useDiscover): string
{
    if ($useDiscover) {
        $sortMap = [
            'trending'    => 'popularity.desc',
            'now_playing' => 'popularity.desc',
            'popular'     => 'popularity.desc',
            'top_rated'   => 'vote_average.desc',
        ];
        $query = [
            'api_key'        => $apiKey,
            'language'       => $lang,
            'sort_by'        => $sortMap[$filter] ?? 'popularity.desc',
            'page'           => 1,
            'vote_count.gte' => $filter === 'top_rated' ? 200 : 0,
        ];
        if ($genreIds !== '') {
            $query['with_genres'] = str_replace(',', '|', $genreIds);
        }
        if ($providerIds !== '') {
            $query['with_watch_providers'] = str_replace(',', '|', $providerIds);
            $query['watch_region']         = 'FR';
        }
        $params = http_build_query($query);
        return "{$base}/discover/{$type}?{$params}";
    }

    if ($filter === 'trending') {
        $params = http_build_query(['api_key' => $apiKey, 'language' => $lang]);
        return "{$base}/trending/{$type}/day?{$params}";
    }

    if ($filter === 'now_playing') {
        // Films : now_playing  |  Séries : on_the_air
        $endpoint = $type === 'movie' ? 'now_playing' : 'on_the_air';
        $params = http_build_query(['api_key' => $apiKey, 'language' => $lang, 'page' => 1]);
        return "{$base}/{$type}/{$endpoint}?{$params}";
    }

    // popular | top_rated
    $params = http_build_query(['api_key' => $apiKey, 'language' => $lang, 'page' => 1]);
    return "{$base}/{$type}/{$filter}?{$params}";
}

// -------------------------------------------------------
// Appels API pour chaque type sélectionné
// -------------------------------------------------------
$allRaw = [];

foreach ($contentTypes as $type) {
    $url      = tmdbUrl($type, $filter, $apiKey, $lang, $base, $genreIds, $providerIds, $useDiscover);
    $response = json_decode(@file_get_contents($url, false, $ctx) ?: '{}', true);

    if (isset($response['status_message'])) {
        if (count($contentTypes) === 1) {
            throw new Exception('TMDB : ' . $response['status_message']);
        }
        continue; // on ignore l'erreur si l'autre type fonctionne
    }

    foreach ($response['results'] ?? [] as $item) {
        $item['_type'] = $type;
        $allRaw[] = $item;
    }
}

if (empty($allRaw)) {
    throw new Exception('Aucun résultat TMDB pour cette sélection.');
}

// Tri par popularité décroissante, puis limite à 10
usort($allRaw, fn($a, $b) => ($b['popularity'] ?? 0) <=> ($a['popularity'] ?? 0));

// -------------------------------------------------------
// Formater les résultats (max 10)
// -------------------------------------------------------
$items = array_map(function ($item) {
    $type    = $item['_type'];
    $isMovie = $type === 'movie';
    $title   = $isMovie ? ($item['title'] ?? '') : ($item['name'] ?? '');
    $dateRaw = $isMovie ? ($item['release_date'] ?? '') : ($item['first_air_date'] ?? '');
    $year    = $dateRaw ? substr($dateRaw, 0, 4) : null;
    $poster  = $item['poster_path']
        ? 'https://image.tmdb.org/t/p/w300' . $item['poster_path']
        : null;
    $rating  = isset($item['vote_average']) ? round($item['vote_average'], 1) : null;
    $id      = $item['id'];
    $urlTmdb = $isMovie
        ? "https://www.themoviedb.org/movie/{$id}"
        : "https://www.themoviedb.org/tv/{$id}";

    return [
        'id'           => $id,
        'title'        => $title,
        'year'         => $year,
        'poster'       => $poster,
        'rating'       => $rating,
        'overview'     => $item['overview'] ?? '',
        'url'          => $urlTmdb,
        'content_type' => $type,
    ];
}, array_slice($allRaw, 0, 10));

return [
    'items'         => $items,
    'filter'        => $filter,
    'content_types' => $contentTypes,
];
