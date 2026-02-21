# Guide Développeur — Dashboard

Documentation technique pour le développement et l'ajout de nouveaux widgets.

---

## Table des matières

1. [Stack technique](#stack-technique)
2. [Architecture du projet](#architecture-du-projet)
3. [Flux de données](#flux-de-données)
4. [Créer un nouveau widget](#créer-un-nouveau-widget)
5. [Structure d'un widget](#structure-dun-widget)
6. [API backend (api.php)](#api-backend-apiphp)
7. [Rendu frontend (widget.js)](#rendu-frontend-widgetjs)
8. [Actions CRUD (mutate.php)](#actions-crud-mutatephp)
9. [Authentification OAuth2 (oauth.php)](#authentification-oauth2-oauthphp)
10. [Cache](#cache)
11. [Géolocalisation](#géolocalisation)
12. [Base de données](#base-de-données)
13. [CSS & JS modulaire](#css--js-modulaire)
14. [Conventions](#conventions)
15. [Exemples concrets](#exemples-concrets)

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | PHP 8+ (sans framework) |
| Base de données | SQLite via PDO |
| Cache | Fichiers JSON avec TTL |
| Frontend | JavaScript vanilla |
| CSS | Vanilla CSS, modulaire |
| Serveur local | Herd (`https://dashboard.test/`) |

---

## Architecture du projet

```
dashboard/
├── config.php                 # Constantes globales + autoloader PSR-like
├── index.php                  # Point d'entrée HTML
│
├── api/
│   └── widgets.php            # Routeur API REST (list, data, settings, layout, mutate, size)
│
├── core/                      # Classes auto-chargées par config.php
│   ├── WidgetManager.php      # Scanne widgets/*/config.json, appelle api.php
│   ├── Cache.php              # Cache fichier JSON (get, set, remember, delete)
│   └── Database.php           # Singleton PDO SQLite (widget_settings, widget_layout)
│
├── widgets/                   # Un dossier par widget
│   └── {id}/
│       ├── config.json        # Déclaration du widget (requis)
│       ├── api.php            # Logique de données (requis)
│       ├── widget.js          # Rendu HTML (requis)
│       ├── mutate.php         # Actions d'écriture (optionnel)
│       └── oauth.php          # Flux OAuth2 (optionnel)
│
├── assets/
│   ├── css/                   # 8 fichiers CSS modulaires
│   │   ├── tokens.css         # Variables CSS, reset, body
│   │   ├── header.css         # Header, horloge, boutons, alertes
│   │   ├── grid.css           # Grille, tailles, mode édition
│   │   ├── card.css           # Cartes widget, skeleton, erreurs
│   │   ├── modal.css          # Modale paramètres, formulaire
│   │   ├── drawers.css        # Widget Manager + Config Panel
│   │   ├── fullscreen.css     # Mode plein écran
│   │   └── utilities.css      # Utilitaires, scrollbars, responsive
│   └── js/
│       ├── dashboard.js       # Core : objet Dashboard, état, init()
│       └── modules/           # 10 modules (Object.assign sur Dashboard)
│           ├── utils.js       # _escHtml(), _renderIcon()
│           ├── api.js         # _fetchWidgetList(), _fetchWidgetData(), _saveSettings()
│           ├── clock.js       # _startClock()
│           ├── geolocation.js # _getLocation(), _updateGeoBtn()
│           ├── header.js      # _initHeaderButtons()
│           ├── widgets.js     # _mountWidget(), _createCard(), _renderWidgetContent()
│           ├── dragdrop.js    # _initDragDrop(), _saveLayout()
│           ├── settings.js    # _openSettings(), _buildSettingsForm(), _submitSettings()
│           ├── alerts.js      # _trackError(), _clearError(), _updateAlertBadge()
│           └── panels.js      # Widget Manager + Config Panel
│
└── data/                      # Créé automatiquement (gitignored)
    ├── dashboard.db           # Base SQLite
    └── cache/                 # Fichiers JSON de cache
```

---

## Flux de données

### Vue d'ensemble

```
┌─────────────┐    GET ?action=data     ┌──────────────┐    callWidget()    ┌────────────────┐
│  Frontend    │ ───────────────────────→│ api/         │ ──────────────────→│ WidgetManager  │
│  dashboard.js│    &widget=steam        │ widgets.php  │                    │                │
│              │    &lat=48.8&lon=2.3    │              │                    │                │
└──────┬───────┘                         └──────┬───────┘                    └───────┬────────┘
       │                                        │                                    │
       │                                        │ 1. getSettings('steam')            │ 2. Cache hit?
       │                                        │    → { api_key, steam_id }         │    → data/cache/widget_steam.json
       │                                        │                                    │
       │                                        │ 2. Injecte _lat, _lon             │ 3. Cache miss → require api.php
       │                                        │    dans $settings                  │    avec $settings
       │                                        │                                    │
       │     { success, data, cache_ts }        │                                    │ 4. api.php retourne [...]
       │ ←──────────────────────────────────────┘                                    │    → stocké en cache
       │                                                                             │
       │ 3. _renderWidgetContent()                                                   │
       │    → charge widget.js (une seule fois)                                      │
       │    → appelle render(data, container)                                        │
       │                                                                             │
```

### Cycle de vie complet d'une requête `data`

**1. Frontend → API**

Le module `api.js` envoie la requête avec les coordonnées GPS si disponibles :

```
GET api/widgets.php?action=data&widget=steam&lat=48.86&lon=2.35
```

**2. API → Database**

`api/widgets.php` récupère les paramètres du widget depuis SQLite :

```php
$settings = $db->getSettings($widgetId);
// → ['api_key' => 'XXXX', 'steam_id' => '76561198...']

// Injection des coordonnées GPS du navigateur
if (isset($_GET['lat'], $_GET['lon'])) {
    $settings['_lat'] = (float) $_GET['lat'];
    $settings['_lon'] = (float) $_GET['lon'];
}
```

**3. API → WidgetManager → Cache**

`WidgetManager::callWidget()` vérifie le cache avant d'exécuter `api.php` :

```php
// Clé de cache : widget_steam (ou widget_meteo_48.86_2.35 avec GPS)
$cacheKey = 'widget_' . $widgetId;
if (isset($settings['_lat'], $settings['_lon'])) {
    $cacheKey .= '_' . round($settings['_lat'], 2) . '_' . round($settings['_lon'], 2);
}

// TTL depuis config.json → refresh_interval (en secondes)
return $cache->remember($cacheKey, $ttl, function () use ($apiFile, $settings) {
    return require $apiFile;  // exécute widgets/steam/api.php
});
```

**4. api.php → API externe**

Le fichier `api.php` du widget appelle l'API externe et retourne un tableau :

```php
// $settings est disponible dans le scope
$url = "https://api.steampowered.com/...?key={$settings['api_key']}";
$data = json_decode(@file_get_contents($url, false, $ctx), true);
return ['name' => $data['personaname'], ...];
```

**5. Réponse JSON → Frontend**

`api/widgets.php` enveloppe le résultat :

```json
{
    "success": true,
    "data": { "name": "Player1", "status": "En ligne", ... },
    "cache_ts": 1708520400
}
```

**6. Frontend → Rendu**

Le module `widgets.js` charge dynamiquement `widget.js` puis appelle `render()` :

```js
// Chargement du script (une seule fois par widget)
await this._loadScript(`widgets/${widget.id}/widget.js?v=${this._pageVersion}`);

// Appel du renderer
const renderer = window.DashboardWidgets[widget.id];
renderer.render(json.data, contentEl);
```

### Cycle de vie d'une mutation

```
Frontend                    api/widgets.php              widgets/s17/mutate.php
   │                              │                              │
   │  POST ?action=mutate         │                              │
   │  &widget=s17                 │                              │
   │  body: { action: "watch" }   │                              │
   │ ────────────────────────────→│                              │
   │                              │  $input = json body          │
   │                              │  $db = Database::getInstance │
   │                              │  include mutate.php ────────→│
   │                              │                              │ $db->setSetting(...)
   │                              │                    ←─────────│ return [...]
   │                              │                              │
   │                              │  $cache->deleteByPrefix()    │
   │  { success, data }           │                              │
   │ ←────────────────────────────│                              │
   │                              │                              │
   │  widget.js: re-render        │                              │
   │  avec les données retournées │                              │
```

---

## Créer un nouveau widget

### Étape 1 — Créer le dossier

```bash
mkdir widgets/mon-widget
```

> L'`id` du widget = le nom du dossier. Utiliser des minuscules et des tirets.

### Étape 2 — Créer `config.json`

```json
{
    "id": "mon-widget",
    "name": "Mon Widget",
    "icon": "🔧",
    "description": "Description courte du widget",
    "version": "1.0",
    "params": [
        {
            "key": "api_key",
            "label": "Clé API",
            "type": "password",
            "required": true
        },
        {
            "key": "username",
            "label": "Nom d'utilisateur",
            "type": "text",
            "required": true,
            "placeholder": "ex: john_doe"
        }
    ],
    "refresh_interval": 300
}
```

**Champs obligatoires :**

| Champ | Type | Description |
|-------|------|-------------|
| `id` | string | Identique au nom du dossier |
| `name` | string | Nom affiché dans le header de la carte |
| `icon` | string | Emoji ou SVG inline (commence par `<svg`) |
| `description` | string | Description courte |
| `version` | string | Version du widget |
| `params` | array | Paramètres configurables (peut être vide `[]`) |
| `refresh_interval` | int | TTL du cache en secondes |

**Types de paramètres supportés :**

| Type | Rendu | Notes |
|------|-------|-------|
| `text` | `<input type="text">` | Champ texte classique |
| `password` | `<input type="password">` | Masqué (clés API, tokens) |
| `textarea` | `<textarea>` | Texte multiligne |
| `select` | Dropdown custom | Nécessite `options: [{value, label}]` |
| `multiselect` | Checkboxes | Nécessite `options`, valeur = CSV |

**Icône SVG (recommandé) :**

```json
"icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"20\" height=\"20\"><path fill=\"#ff6600\" d=\"M12 2L2 22h20z\"/></svg>"
```

> L'icône SVG doit avoir `width="20" height="20"` pour un rendu correct.

### Étape 3 — Créer `api.php`

```php
<?php

// $settings est injecté automatiquement par WidgetManager::callWidget()
// Il contient tous les paramètres configurés par l'utilisateur
$apiKey   = $settings['api_key']  ?? null;
$username = $settings['username'] ?? null;

if (!$apiKey || !$username) {
    throw new Exception('Widget non configuré : clé API et nom d\'utilisateur requis');
}

// Appeler l'API externe avec timeout
$ctx = stream_context_create(['http' => ['timeout' => 5, 'ignore_errors' => true]]);
$json = @file_get_contents("https://api.example.com/user/{$username}?key={$apiKey}", false, $ctx);
$data = json_decode($json ?: '{}', true);

if (!$data) {
    throw new Exception('Impossible de récupérer les données');
}

// Retourner un tableau associatif (sera converti en JSON par le framework)
return [
    'name'   => $data['display_name'],
    'score'  => $data['score'],
    'avatar' => $data['avatar_url'],
];
```

**Règles importantes :**

- Le fichier doit **retourner** un tableau (`return [...]`), pas faire d'`echo`
- `$settings` est le seul paramètre injecté (contient les valeurs de `widget_settings`)
- Les erreurs doivent être des `throw new Exception('message')`
- Le message d'erreur est affiché à l'utilisateur — soyez clair
- Si le message contient "non configuré" ou "manquants", le dashboard affiche le bouton "Configurer"
- Si le message contient "autorisation" ou "session", le dashboard affiche "Connecter mon compte"
- Ne jamais faire de `echo`, `print_r`, `var_dump` — ça corrompt la réponse JSON

### Étape 4 — Créer `widget.js`

```js
window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets['mon-widget'] = {

    render(data, container) {
        this._injectStyles();

        const { name, score, avatar } = data;

        container.innerHTML = `
            <div class="mw-wrap">
                <img class="mw-avatar" src="${this._esc(avatar)}" alt="">
                <div class="mw-info">
                    <div class="mw-name">${this._esc(name)}</div>
                    <div class="mw-score">Score : ${score}</div>
                </div>
            </div>`;
    },

    /** Échappe les caractères HTML (obligatoire pour les données utilisateur). */
    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    /** Injecte les styles CSS du widget (une seule fois). */
    _injectStyles() {
        if (document.getElementById('mw-styles')) return;
        const s = document.createElement('style');
        s.id = 'mw-styles';
        s.textContent = `
            .mw-wrap {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .mw-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
            }
            .mw-name {
                font-size: 14px;
                font-weight: 600;
                color: #e2e2e8;
            }
            .mw-score {
                font-size: 12px;
                color: #9898a6;
            }
        `;
        document.head.appendChild(s);
    },
};
```

**Règles importantes :**

- Le renderer est enregistré sur `window.DashboardWidgets['{id}']`
- La méthode `render(data, container)` reçoit les données de `api.php` et l'élément DOM
- **Toujours échapper** les données avec `_esc()` avant de les injecter dans le HTML
- Utiliser un **préfixe CSS unique** pour le widget (ex: `mw-` pour "mon-widget")
- Les styles sont injectés via `_injectStyles()` avec un `id` pour éviter les doublons
- Le thème est dark : fond sombre, texte clair (`#e2e2e8`), texte secondaire (`#9898a6`)

### Étape 5 — Tester

```
https://dashboard.test/api/widgets.php?action=data&widget=mon-widget
```

Si le widget n'est pas configuré, l'API retournera l'erreur et le dashboard affichera le bouton "Configurer".

### Étape 6 (optionnel) — Couleur d'accent

Pour ajouter une couleur de glow au survol de la carte, éditer `assets/js/modules/widgets.js` et ajouter une entrée dans `_widgetAccents` :

```js
const _widgetAccents = {
    // ...
    'mon-widget': ['rgba(255, 102, 0, 0.30)', 'rgba(255, 102, 0, 0.06)'],
};
```

---

## Structure d'un widget

### Fichiers obligatoires

| Fichier | Rôle |
|---------|------|
| `config.json` | Déclaration : id, nom, icône, paramètres, TTL |
| `api.php` | Backend : appel API externe → retourne un tableau |
| `widget.js` | Frontend : reçoit les données → génère le HTML |

### Fichiers optionnels

| Fichier | Rôle |
|---------|------|
| `mutate.php` | Actions d'écriture (POST) : +1 épisode, toggle, etc. |
| `oauth.php` | Page de callback OAuth2 (Spotify, Twitch, Google, etc.) |

---

## API backend (api.php)

### Variables disponibles

```php
$settings['api_key']    // Paramètre configuré par l'utilisateur
$settings['_lat']       // Latitude GPS (si géolocalisation active)
$settings['_lon']       // Longitude GPS (si géolocalisation active)
```

> `$settings` est injecté par `WidgetManager::callWidget()`. Il contient les valeurs de la table `widget_settings` pour ce widget, plus les coordonnées GPS préfixées par `_`.

### Appels HTTP

**Avec `file_get_contents` (simple) :**

```php
$ctx = stream_context_create(['http' => [
    'timeout'       => 5,
    'ignore_errors' => true,
]]);
$response = @file_get_contents($url, false, $ctx);
$data = json_decode($response ?: '{}', true);
```

> C'est le pattern utilisé par Steam, Météo, Spotify et GitHub.

**Avec cURL (headers custom, POST, cookies) :**

```php
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . $token],
    CURLOPT_SSL_VERIFYPEER => false,
]);
$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
// Ne PAS appeler curl_close() — déprécié depuis PHP 8.5
```

### Messages d'erreur et UI

Le message d'exception déclenche un comportement spécifique dans le frontend :

| Mot-clé dans le message | Bouton affiché |
|--------------------------|----------------|
| `non configuré` ou `manquants` | "Configurer" (ouvre la modale de paramètres) |
| `autorisation` ou `session` | "Connecter mon compte" (lance le flux OAuth) |
| Autre | Message d'erreur brut |

```php
// → Affiche le bouton "Configurer"
throw new Exception('Widget non configuré : clé API manquante');

// → Affiche le bouton "Connecter mon compte"
throw new Exception('Session Spotify expirée — autorisation requise');

// → Affiche le message tel quel
throw new Exception('API Steam indisponible (HTTP 503)');
```

---

## Rendu frontend (widget.js)

### Pattern complet

```js
window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets['mon-widget'] = {

    render(data, container) {
        this._injectStyles();
        // Générer le HTML dans container.innerHTML
    },

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _injectStyles() {
        if (document.getElementById('mw-styles')) return;
        const s = document.createElement('style');
        s.id = 'mw-styles';
        s.textContent = `/* styles ici */`;
        document.head.appendChild(s);
    },
};
```

### Re-render après mutation

Pour les widgets interactifs (boutons, toggles), appeler l'API `mutate` puis re-rendre :

```js
// Exemple tiré de widgets/s17/widget.js
async _mutate(action, container) {
    const res = await fetch('api/widgets.php?action=mutate&widget=s17', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (json.success) {
        // Re-render avec les données mises à jour
        this.render({ ...currentData, ...json.data }, container);
    }
},
```

### Animation en temps réel

Pour des mises à jour côté client (barre de progression, compte à rebours) :

```js
// Exemple tiré de widgets/spotify/widget.js
render(data, container) {
    clearInterval(this._progressInterval);
    // ... rendu initial ...

    // Barre de progression animée côté client
    this._progressInterval = setInterval(() => {
        progress = Math.min(progress + 1000, track.duration_ms);
        const fill = document.getElementById('sp-fill');
        if (fill) fill.style.width = (progress / track.duration_ms * 100) + '%';
    }, 1000);
},
```

### Variables CSS du thème

```css
var(--bg-base)       /* #0f0f13 — fond principal */
var(--bg-surface)    /* #16161d — fond cartes/modales */
var(--bg-card)       /* rgba(255,255,255,0.04) — fond léger */
var(--bg-hover)      /* rgba(255,255,255,0.07) — survol */
var(--border)        /* rgba(255,255,255,0.08) — bordures */
var(--accent)        /* #7c6af7 — violet principal */
var(--accent-dim)    /* rgba(124,106,247,0.15) — violet transparent */
var(--text)          /* #e2e2e8 — texte principal */
var(--text-dim)      /* #9898a6 — texte secondaire */
var(--muted)         /* #555560 — texte désactivé */
var(--danger)        /* #f56565 — rouge erreur */
var(--success)       /* #68d391 — vert succès */
var(--radius)        /* 12px — border-radius standard */
var(--radius-sm)     /* 8px — border-radius petit */
var(--transition)    /* 180ms ease — transition par défaut */
```

---

## Actions CRUD (mutate.php)

Pour les widgets qui ont besoin d'écriture (compteurs, toggles, etc.).

### Variables disponibles

```php
$input   // array — JSON décodé du body POST (ex: ['action' => 'watch'])
$db      // Database — singleton SQLite (getSetting, setSetting, getSettings)
```

### Pattern

```php
<?php
$action = $input['action'] ?? '';

switch ($action) {
    case 'increment':
        $current = (int) ($db->getSetting('mon-widget', 'counter') ?? 0);
        $current++;
        $db->setSetting('mon-widget', 'counter', $current);
        return ['counter' => $current];

    default:
        throw new Exception('Action inconnue');
}
```

### Appel depuis widget.js

```js
const res = await fetch('api/widgets.php?action=mutate&widget=mon-widget', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ action: 'increment' }),
});
const json = await res.json();
if (json.success) {
    // json.data contient le tableau retourné par mutate.php
}
```

> Après chaque mutation, le cache du widget est automatiquement supprimé par `api/widgets.php`.

---

## Authentification OAuth2 (oauth.php)

Pour les widgets qui nécessitent une connexion utilisateur (Spotify, Twitch, Google Calendar).

### Vue d'ensemble du flux

```
1. L'utilisateur clique "Connecter mon compte"
   │
   ▼
2. Frontend ouvre : widgets/{id}/oauth.php
   │
   ▼
3. oauth.php génère un state CSRF + redirige vers le provider
   │  → Cookie HTTPOnly sécurisé avec le state
   │  → Redirect vers https://accounts.spotify.com/authorize?...
   │
   ▼
4. L'utilisateur autorise l'application sur le site du provider
   │
   ▼
5. Le provider redirige vers : widgets/{id}/oauth.php?code=xxx&state=yyy
   │
   ▼
6. oauth.php échange le code contre des tokens
   │  → POST vers le token endpoint du provider
   │  → Reçoit access_token + refresh_token
   │
   ▼
7. Tokens stockés en SQLite (widget_settings)
   │  → Cache du widget supprimé
   │  → Redirect vers le dashboard
```

### Implémentation type

Basé sur le flux réel de `widgets/spotify/oauth.php` :

```php
<?php
require_once __DIR__ . '/../../config.php';

$db = Database::getInstance();

$clientId     = $db->getSetting('spotify', 'client_id');
$clientSecret = $db->getSetting('spotify', 'client_secret');
$redirectUri  = 'https://dashboard.test/widgets/spotify/oauth.php';
$scopes       = 'user-read-currently-playing user-read-recently-played playlist-read-private';

/* ---------- Étape 1 : Pas de code → rediriger vers le provider ---------- */

if (!isset($_GET['code'])) {
    // Générer un token CSRF
    $state = bin2hex(random_bytes(16));

    // Stocker dans un cookie sécurisé (expire dans 5 min)
    setcookie('spotify_state', $state, [
        'expires'  => time() + 300,
        'path'     => '/',
        'secure'   => true,
        'httponly'  => true,
        'samesite' => 'Lax',
    ]);

    // Rediriger vers Spotify
    $params = http_build_query([
        'client_id'     => $clientId,
        'response_type' => 'code',
        'redirect_uri'  => $redirectUri,
        'scope'         => $scopes,
        'state'         => $state,
    ]);

    header("Location: https://accounts.spotify.com/authorize?{$params}");
    exit;
}

/* ---------- Étape 2 : Code reçu → échanger contre des tokens ---------- */

// Vérification CSRF
if (($_GET['state'] ?? '') !== ($_COOKIE['spotify_state'] ?? '')) {
    die('État OAuth invalide (CSRF)');
}

// Échanger le code
$credentials = base64_encode($clientId . ':' . $clientSecret);
$tokenRes = httpPost('https://accounts.spotify.com/api/token', [
    'grant_type'   => 'authorization_code',
    'code'         => $_GET['code'],
    'redirect_uri' => $redirectUri,
], "Authorization: Basic {$credentials}");

if (!isset($tokenRes['access_token'])) {
    die('Échec de l\'authentification Spotify');
}

// Stocker les tokens en base
$db->setSetting('spotify', 'access_token',  $tokenRes['access_token']);
$db->setSetting('spotify', 'refresh_token', $tokenRes['refresh_token']);

// Récupérer le profil utilisateur (optionnel, pour affichage)
$profile = spotifyGet('https://api.spotify.com/v1/me', $tokenRes['access_token']);
if (isset($profile['display_name'])) {
    $db->setSetting('spotify', 'user_name', $profile['display_name']);
}

// Vider le cache et retourner au dashboard
(new Cache())->deleteByPrefix('widget_spotify');
header('Location: /');
exit;
```

### Rafraîchissement automatique des tokens

Les access tokens OAuth2 expirent (1h pour Spotify/Google). Le `api.php` gère le refresh :

```php
// Extrait de widgets/spotify/api.php
function spotifyRefresh(string $clientId, string $clientSecret, string $refreshToken): array {
    $credentials = base64_encode($clientId . ':' . $clientSecret);
    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/x-www-form-urlencoded\r\n"
                   . "Authorization: Basic {$credentials}",
        'content' => http_build_query([
            'grant_type'    => 'refresh_token',
            'refresh_token' => $refreshToken,
        ]),
        'timeout' => 10,
    ]]);
    return json_decode(@file_get_contents(
        'https://accounts.spotify.com/api/token', false, $ctx
    ) ?: '{}', true) ?? [];
}

// Appel API → si 401, refresh et retry
$data = spotifyGet($url, $accessToken);

if (needsRefresh($data)) {
    $new = spotifyRefresh($clientId, $clientSecret, $refreshToken);
    if (!isset($new['access_token'])) {
        throw new Exception('Session Spotify expirée — autorisation requise');
    }

    // Mettre à jour les tokens en base
    $db = Database::getInstance();
    $db->setSetting('spotify', 'access_token',  $new['access_token']);
    if (isset($new['refresh_token'])) {
        $db->setSetting('spotify', 'refresh_token', $new['refresh_token']);
    }

    $accessToken = $new['access_token'];
    $data = spotifyGet($url, $accessToken);
}
```

### Différences par provider

| Provider | Auth Header | Scopes | Spécificités |
|----------|-------------|--------|-------------|
| **Spotify** | `Basic` (base64 client_id:secret) | `user-read-currently-playing`, `playlist-read-private` | Refresh token stable |
| **Twitch** | `Client-ID` header | `user:read:follows` | Stocke aussi `user_id` et `user_name` |
| **Google** | `Basic` (base64 client_id:secret) | `calendar.readonly` | Refresh token uniquement au 1er consent (`access_type=offline`, `prompt=consent`) |

### Clés nécessaires dans config.json

Pour un widget OAuth2, ajouter les paramètres `client_id` et `client_secret` :

```json
{
    "params": [
        { "key": "client_id", "label": "Client ID", "type": "text", "required": true },
        { "key": "client_secret", "label": "Client Secret", "type": "password", "required": true }
    ]
}
```

L'utilisateur les obtient en créant une application sur le portail développeur du provider (Spotify Developer Dashboard, Twitch Developer Console, Google Cloud Console).

---

## Cache

Le cache est automatique — `WidgetManager::callWidget()` utilise `refresh_interval` du `config.json`.

- **Clé de cache** : `widget_{id}` (ou `widget_{id}_{lat}_{lon}` avec GPS)
- **TTL** : défini par `refresh_interval` en secondes dans `config.json`
- **Invalidation automatique** :
  - Quand les paramètres sont sauvegardés → `deleteByPrefix('widget_{id}')`
  - Après chaque mutation → `deleteByPrefix('widget_{id}')`
  - Après un refresh de token OAuth2 → `deleteByPrefix('widget_{id}')`

Pour invalider manuellement :

```php
$cache = new Cache();
$cache->deleteByPrefix('widget_mon-widget');
```

---

## Géolocalisation

Si le widget a besoin de la position GPS (ex: Météo) :

```php
// api.php — les coordonnées sont injectées automatiquement dans $settings
$lat = $settings['_lat'] ?? null;
$lon = $settings['_lon'] ?? null;

if ($lat !== null && $lon !== null) {
    // Utiliser les coordonnées GPS
    $url = "https://api.openweathermap.org/data/2.5/weather?lat={$lat}&lon={$lon}&appid={$apiKey}";
} else {
    // Fallback sur un paramètre configuré (ex: ville)
    $city = $settings['city'] ?? 'Paris';
    $url = "https://api.openweathermap.org/data/2.5/weather?q={$city}&appid={$apiKey}";
}
```

> Les coords sont arrondies à 0.01° dans la clé de cache pour éviter d'invalider le cache à chaque micro-déplacement.

---

## Base de données

### Tables

**`widget_settings`** — Paramètres par widget (clé/valeur)

```sql
widget_id TEXT, key TEXT, value TEXT
-- UNIQUE(widget_id, key)
```

**`widget_layout`** — Position et état d'affichage

```sql
widget_id TEXT UNIQUE, position INTEGER, enabled INTEGER, size TEXT
```

### Accès depuis mutate.php

```php
$db->getSetting('mon-widget', 'counter');       // Lire une valeur
$db->setSetting('mon-widget', 'counter', 42);   // Écrire une valeur
$db->getSettings('mon-widget');                  // Tout lire (array associatif)
```

> `$db` n'est **pas** disponible dans `api.php` — seul `$settings` est injecté. Utiliser `mutate.php` pour les écritures.

---

## CSS & JS modulaire

### CSS

8 fichiers dans `assets/css/`, chargés en ordre dans `index.php` :

1. `tokens.css` — variables `:root`, reset, body
2. `header.css` — header et ses sous-composants
3. `grid.css` — grille et tailles de widgets
4. `card.css` — carte widget et ses états
5. `modal.css` — modale et formulaire
6. `drawers.css` — panneaux latéraux
7. `fullscreen.css` — mode plein écran
8. `utilities.css` — classes utilitaires, responsive

### JS

L'objet `Dashboard` est défini dans `dashboard.js`. Chaque module ajoute ses méthodes via `Object.assign()` :

```js
// modules/monmodule.js
Object.assign(Dashboard, {
    maMethode() { ... },
});
```

Les modules sont chargés en ordre dans `index.php` (après `dashboard.js`, avant `DOMContentLoaded`).

---

## Conventions

1. **Clés API** : toujours en SQLite (`widget_settings`), jamais dans le code
2. **Préfixe CSS** : unique par widget (2-3 lettres, ex: `st-` pour steam, `sp-` pour spotify)
3. **Échappement HTML** : obligatoire pour toute donnée affichée (`_esc()`)
4. **Pas de `echo`** dans `api.php` : retourner un tableau avec `return [...]`
5. **Pas de `curl_close()`** : déprécié depuis PHP 8.5
6. **Cache** : ne pas contourner le cache du `WidgetManager` — modifier `refresh_interval` dans `config.json`
7. **Erreurs claires** : les messages d'exception sont affichés à l'utilisateur
8. **Pas de framework** : ni côté PHP, ni côté JS — garder le projet léger

---

## Exemples concrets

### Widget simple avec clé API — Steam

**`widgets/steam/config.json`** (extrait) :

```json
{
    "id": "steam",
    "name": "Steam",
    "icon": "<svg ...>",
    "params": [
        { "key": "api_key", "label": "Clé API Steam", "type": "password", "required": true },
        { "key": "steam_id", "label": "Steam ID (64 bits)", "type": "text", "required": true }
    ],
    "refresh_interval": 300
}
```

**`widgets/steam/api.php`** (extrait) :

```php
$apiKey  = $settings['api_key']  ?? null;
$steamId = $settings['steam_id'] ?? null;

if (!$apiKey || !$steamId) {
    throw new Exception('Widget non configuré : clé API ou Steam ID manquant');
}

// Appels API avec timeout
$ctx = stream_context_create(['http' => ['timeout' => 5, 'ignore_errors' => true]]);

$profileUrl = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/"
            . "?key={$apiKey}&steamids={$steamId}";
$profileRes = json_decode(@file_get_contents($profileUrl, false, $ctx) ?: '{}', true);
$player = $profileRes['response']['players'][0] ?? null;

if (!$player) {
    throw new Exception('Profil Steam introuvable');
}

return [
    'name'       => $player['personaname'],
    'avatar'     => $player['avatarfull'],
    'status'     => $statusLabel,
    'profile_url' => $player['profileurl'],
    'games'      => $recentGames,  // tableau des jeux récents
];
```

**`widgets/steam/widget.js`** (extrait) :

```js
window.DashboardWidgets.steam = {
    render(data, container) {
        this._injectStyles();

        container.innerHTML = `
            <div class="st-profile">
                <a href="${this._esc(data.profile_url)}" target="_blank">
                    <img class="st-avatar" src="${this._esc(data.avatar)}">
                </a>
                <div class="st-profile-info">
                    <a class="st-name" href="${this._esc(data.profile_url)}">
                        ${this._esc(data.name)}
                    </a>
                    <div class="st-status">${this._esc(data.status)}</div>
                </div>
            </div>
            ${this._renderGames(data.games)}`;
    },

    _renderGames(games) {
        if (!games?.length) return '';
        return `<div class="st-games">${
            games.map(g => `
                <a class="st-game" href="${this._esc(g.url)}">
                    <img src="${this._esc(g.image)}" alt="">
                    <span class="st-game-name">${this._esc(g.name)}</span>
                    <span class="st-game-time">${this._fmtHours(g.playtime_2weeks)}</span>
                </a>`
            ).join('')
        }</div>`;
    },

    _fmtHours(minutes) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}h${m > 0 ? m : ''}` : `${m}min`;
    },
    // ... _esc(), _injectStyles()
};
```

---

### Widget avec géolocalisation — Météo

**`widgets/meteo/api.php`** (extrait) :

```php
$apiKey = $settings['api_key'] ?? null;
$lat    = $settings['_lat']    ?? null;   // Injecté depuis le navigateur
$lon    = $settings['_lon']    ?? null;
$city   = $settings['city']    ?? null;   // Fallback si pas de GPS

if (!$apiKey) {
    throw new Exception('Widget non configuré : clé API manquante');
}

// Priorité : GPS > ville
if ($lat !== null && $lon !== null) {
    $url = sprintf(
        'https://api.openweathermap.org/data/2.5/weather?lat=%s&lon=%s&appid=%s&units=metric&lang=fr',
        $lat, $lon, urlencode($apiKey)
    );
} elseif ($city) {
    $url = sprintf(
        'https://api.openweathermap.org/data/2.5/weather?q=%s&appid=%s&units=metric&lang=fr',
        urlencode($city), urlencode($apiKey)
    );
} else {
    throw new Exception('Widget non configuré : activez la géolocalisation ou renseignez une ville');
}

// Météo actuelle + prévisions 5 jours (2 appels)
$current  = json_decode(@file_get_contents($url, false, $ctx) ?: '{}', true);
$forecast = json_decode(@file_get_contents($forecastUrl, false, $ctx) ?: '{}', true);

return [
    'city'     => $current['name'],
    'temp'     => (int) round($current['main']['temp']),
    'icon'     => $current['weather'][0]['icon'],
    'forecast' => $dailyForecast,  // tableau des jours suivants
];
```

---

### Widget avec OAuth2 et refresh — Spotify

**`widgets/spotify/api.php`** (extrait) :

```php
$clientId     = $settings['client_id']     ?? null;
$clientSecret = $settings['client_secret'] ?? null;
$accessToken  = $settings['access_token']  ?? null;
$refreshToken = $settings['refresh_token'] ?? null;

// Pas de tokens → l'utilisateur doit se connecter
if (!$accessToken) {
    throw new Exception('Connectez votre compte Spotify — autorisation requise');
}

// Appel API
$current = spotifyGet('https://api.spotify.com/v1/me/player/currently-playing', $accessToken);

// Token expiré ? → refresh automatique
if (needsRefresh($current)) {
    $new = spotifyRefresh($clientId, $clientSecret, $refreshToken);
    if (!isset($new['access_token'])) {
        throw new Exception('Session Spotify expirée — autorisation requise');
    }
    $db = Database::getInstance();
    $db->setSetting('spotify', 'access_token', $new['access_token']);
    if (isset($new['refresh_token'])) {
        $db->setSetting('spotify', 'refresh_token', $new['refresh_token']);
    }
    $accessToken = $new['access_token'];
    $current = spotifyGet('https://api.spotify.com/v1/me/player/currently-playing', $accessToken);
}

return [
    'is_playing'  => !empty($current['is_playing']),
    'now_playing' => isset($current['item']) ? formatTrack($current['item']) : null,
    'recent'      => $recentTracks,
];
```

---

### Widget avec mutations — Studio 17

**`widgets/s17/api.php`** — Calcul basé sur la date, sans API externe :

```php
$anchorDate  = $settings['ep_anchor_date']  ?? '';
$anchorCount = (int) ($settings['ep_anchor_count'] ?? 0);
$releaseHour = (int) ($settings['ep_release_hour'] ?? 10);
$currentEp   = (int) ($settings['current_episode']     ?? 0);
$inProgress  = (bool) ($settings['episode_in_progress'] ?? false);

// Calculer le nombre total d'épisodes depuis la date d'ancrage
$tz     = new DateTimeZone('Europe/Paris');
$anchor = new DateTime($anchorDate . ' ' . sprintf('%02d', $releaseHour) . ':00:00', $tz);
$now    = new DateTime('now', $tz);

$additional = 0;
$cursor = clone $anchor;
$cursor->modify('+7 days');
while ($cursor <= $now) {
    $additional++;
    $cursor->modify('+7 days');
}

$epTotal = $anchorCount + $additional;

return [
    'current_ep'      => $currentEp,
    'ep_total'        => $epTotal,
    'behind'          => max(0, $epTotal - $currentEp),
    'in_progress'     => $inProgress,
    'next_release_ts' => $nextRelease->getTimestamp(),
];
```

**`widgets/s17/mutate.php`** — 4 actions possibles :

```php
$action     = $input['action'] ?? '';
$current    = (int) ($db->getSetting('s17', 'current_episode')     ?? 0);
$inProgress = (int) ($db->getSetting('s17', 'episode_in_progress') ?? 0);

switch ($action) {
    case 'start':                           // Commence un épisode
        $inProgress = 1;
        break;
    case 'watch':                           // Termine un épisode → +1
        $current++;
        $inProgress = 0;
        break;
    case 'unwatch':                         // Annule le dernier → -1
        if ($current > 0) $current--;
        $inProgress = 0;
        break;
    case 'cancel':                          // Annule le visionnage en cours
        $inProgress = 0;
        break;
    default:
        throw new Exception('Action inconnue');
}

$db->setSetting('s17', 'current_episode', $current);
$db->setSetting('s17', 'episode_in_progress', $inProgress);

return ['current_ep' => $current, 'in_progress' => (bool) $inProgress];
```
