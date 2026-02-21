<?php

// $settings est injecté par WidgetManager::callWidget()
$username = $settings['username'] ?? null;
$token    = $settings['token']    ?? null;

if (!$username) {
    throw new Exception('Widget non configuré : nom d\'utilisateur GitHub requis');
}

$headers = ['User-Agent: DashboardWidget/1.0'];
if ($token) {
    $headers[] = 'Authorization: Bearer ' . $token;
}

$ctx = stream_context_create(['http' => [
    'timeout'       => 8,
    'ignore_errors' => true,
    'header'        => implode("\r\n", $headers),
]]);

function ghGet(string $url, $ctx): array
{
    $raw = @file_get_contents($url, false, $ctx);
    if (!$raw) return [];
    $data = json_decode($raw, true);
    // Erreur API GitHub (ex: rate limit, user not found)
    if (isset($data['message'])) {
        throw new Exception('GitHub API : ' . $data['message']);
    }
    return is_array($data) ? $data : [];
}

// -------------------------------------------------------
// Activité récente (events)
// -------------------------------------------------------
$rawEvents = ghGet("https://api.github.com/users/{$username}/events/public?per_page=20", $ctx);

$events = [];
foreach ($rawEvents as $e) {
    $type    = $e['type']         ?? '';
    $repo    = $e['repo']['name'] ?? '';
    $payload = $e['payload']      ?? [];
    $date    = isset($e['created_at']) ? strtotime($e['created_at']) : 0;

    switch ($type) {
        case 'PushEvent':
            $count = $payload['size'] ?? count($payload['commits'] ?? []);
            $desc  = "Push de {$count} commit" . ($count > 1 ? 's' : '');
            break;
        case 'PullRequestEvent':
            $action = $payload['action'] ?? '';
            $pr     = $payload['pull_request']['title'] ?? '';
            $desc   = 'PR ' . $action . ($pr ? ' : ' . mb_strimwidth($pr, 0, 50, '…') : '');
            break;
        case 'IssuesEvent':
            $action = $payload['action'] ?? '';
            $title  = $payload['issue']['title'] ?? '';
            $desc   = 'Issue ' . $action . ($title ? ' : ' . mb_strimwidth($title, 0, 50, '…') : '');
            break;
        case 'CreateEvent':
            $refType = $payload['ref_type'] ?? '';
            $ref     = $payload['ref'] ?? '';
            $desc    = 'Créé ' . $refType . ($ref ? ' ' . $ref : '');
            break;
        case 'WatchEvent':
            $desc = 'Étoile ajoutée';
            break;
        case 'ForkEvent':
            $desc = 'Fork';
            break;
        case 'IssueCommentEvent':
            $desc = 'Commentaire sur une issue';
            break;
        case 'DeleteEvent':
            $desc = 'Supprimé ' . ($payload['ref_type'] ?? '') . ' ' . ($payload['ref'] ?? '');
            break;
        case 'ReleaseEvent':
            $tag  = $payload['release']['tag_name'] ?? '';
            $desc = 'Release ' . $tag;
            break;
        default:
            $desc = str_replace('Event', '', $type);
    }

    $events[] = [
        'type' => $type,
        'desc' => $desc,
        'repo' => $repo,
        'url'  => 'https://github.com/' . $repo,
        'date' => $date,
    ];
}

// -------------------------------------------------------
// Dépôts (triés par mise à jour)
// -------------------------------------------------------
$rawRepos = ghGet("https://api.github.com/users/{$username}/repos?sort=updated&per_page=6&type=owner", $ctx);

$repos = array_map(fn($r) => [
    'name'        => $r['name']              ?? '',
    'description' => $r['description']       ?? '',
    'stars'       => $r['stargazers_count']  ?? 0,
    'language'    => $r['language']          ?? null,
    'url'         => $r['html_url']          ?? '',
    'updated_at'  => isset($r['updated_at']) ? strtotime($r['updated_at']) : 0,
    'private'     => $r['private']           ?? false,
    'fork'        => $r['fork']              ?? false,
], $rawRepos);

// -------------------------------------------------------
// Calendrier de contributions (GraphQL — nécessite token)
// -------------------------------------------------------
$calendar = null;
if ($token) {
    $gqlQuery = json_encode([
        'query' => sprintf(
            '{ user(login: "%s") { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { contributionCount date } } } } } }',
            addslashes($username)
        ),
    ]);

    $gqlCtx = stream_context_create(['http' => [
        'method'        => 'POST',
        'timeout'       => 8,
        'ignore_errors' => true,
        'header'        => implode("\r\n", array_merge($headers, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($gqlQuery),
        ])),
        'content' => $gqlQuery,
    ]]);

    $gqlRaw = @file_get_contents('https://api.github.com/graphql', false, $gqlCtx);
    if ($gqlRaw) {
        $gqlData = json_decode($gqlRaw, true);
        $cal     = $gqlData['data']['user']['contributionsCollection']['contributionCalendar'] ?? null;
        if ($cal) {
            $calendar = [
                'total' => (int) $cal['totalContributions'],
                'weeks' => $cal['weeks'],
            ];
        }
    }
}

return [
    'events'   => $events,
    'repos'    => $repos,
    'username' => $username,
    'calendar' => $calendar,
];
