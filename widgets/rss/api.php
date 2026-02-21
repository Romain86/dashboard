<?php

// $settings est injecté par WidgetManager::callWidget()
$feedUrls = array_values(array_filter(
    array_map('trim', explode("\n", $settings['feed_urls'] ?? ''))
));
$maxItems = max(1, (int)($settings['max_items'] ?? 10));

if (empty($feedUrls)) {
    throw new Exception('Widget non configuré : aucun flux RSS renseigné');
}

$ctx = stream_context_create(['http' => [
    'timeout'       => 8,
    'ignore_errors' => true,
    'user_agent'    => 'Mozilla/5.0 (Dashboard RSS Reader)',
]]);

// -------------------------------------------------------
// Parser un flux RSS 2.0 ou Atom
// -------------------------------------------------------
function parseFeed(string $url, $ctx): array
{
    $content = @file_get_contents($url, false, $ctx);
    if (!$content) return [];

    $xml = @simplexml_load_string($content, 'SimpleXMLElement', LIBXML_NOCDATA);
    if (!$xml) return [];

    $items = [];

    // RSS 2.0
    if (isset($xml->channel->item)) {
        $source = html_entity_decode((string)$xml->channel->title, ENT_QUOTES, 'UTF-8');
        foreach ($xml->channel->item as $item) {
            $items[] = [
                'title'  => html_entity_decode(strip_tags((string)$item->title), ENT_QUOTES, 'UTF-8'),
                'link'   => (string)$item->link,
                'date'   => strtotime((string)$item->pubDate) ?: 0,
                'source' => $source,
                'desc'   => mb_substr(strip_tags((string)$item->description), 0, 200, 'UTF-8'),
            ];
        }
        return $items;
    }

    // Atom
    if ($xml->getName() === 'feed') {
        $source = html_entity_decode(strip_tags((string)$xml->title), ENT_QUOTES, 'UTF-8');
        foreach ($xml->entry as $entry) {
            // Trouver le lien href
            $link = '';
            foreach ($entry->link as $l) {
                $href = (string)$l['href'];
                if ($href) { $link = $href; break; }
            }
            $date = strtotime((string)($entry->updated ?: $entry->published)) ?: 0;
            $desc = (string)($entry->summary ?: $entry->content ?? '');
            $items[] = [
                'title'  => html_entity_decode(strip_tags((string)$entry->title), ENT_QUOTES, 'UTF-8'),
                'link'   => $link,
                'date'   => $date,
                'source' => $source,
                'desc'   => mb_substr(strip_tags($desc), 0, 200, 'UTF-8'),
            ];
        }
        return $items;
    }

    return [];
}

// -------------------------------------------------------
// Agréger tous les flux
// -------------------------------------------------------
$allItems = [];
$errors   = [];

foreach ($feedUrls as $url) {
    $parsed = parseFeed($url, $ctx);
    if (empty($parsed)) {
        $errors[] = $url;
    } else {
        $allItems = array_merge($allItems, $parsed);
    }
}

if (empty($allItems)) {
    throw new Exception('Aucun article récupéré. Vérifiez les URLs des flux.');
}

// Tri par date décroissante + limite
usort($allItems, fn($a, $b) => $b['date'] <=> $a['date']);
$allItems = array_slice($allItems, 0, $maxItems);

return [
    'items'  => $allItems,
    'errors' => $errors,
];
