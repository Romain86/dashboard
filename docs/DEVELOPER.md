# Guide Développeur — Dashboard

Documentation technique complète du projet. Ce guide permet à un développeur qui découvre le projet de comprendre l'architecture, le flux de données, et de contribuer (ajout de widgets, modifications du core).

---

## Table des matières

1. [Stack technique](#stack-technique)
2. [Installation et prérequis](#installation-et-prérequis)
3. [Architecture du projet](#architecture-du-projet)
4. [Flux de données](#flux-de-données)
5. [Base de données](#base-de-données)
6. [API REST](#api-rest)
7. [Frontend : objet Dashboard et modules](#frontend--objet-dashboard-et-modules)
8. [CSS modulaire et thème](#css-modulaire-et-thème)
9. [Créer un nouveau widget](#créer-un-nouveau-widget)
10. [Structure d'un widget](#structure-dun-widget)
11. [API backend (api.php)](#api-backend-apiphp)
12. [Rendu frontend (widget.js)](#rendu-frontend-widgetjs)
13. [Actions CRUD (mutate.php)](#actions-crud-mutatephp)
14. [Authentification OAuth2](#authentification-oauth2)
15. [Cache](#cache)
16. [Géolocalisation](#géolocalisation)
17. [Système d'onglets](#système-donglets)
18. [Auto-refresh intelligent](#auto-refresh-intelligent)
19. [Animations](#animations)
20. [Notifications](#notifications)
21. [Raccourcis clavier](#raccourcis-clavier)
22. [Import / Export](#import--export)
23. [PWA (Progressive Web App)](#pwa-progressive-web-app)
24. [Conventions](#conventions)
25. [Exemples concrets](#exemples-concrets)

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | PHP 8+ (sans framework) |
| Base de données | SQLite via PDO |
| Cache | Fichiers JSON avec TTL |
| Frontend | JavaScript vanilla |
| CSS | Vanilla CSS, modulaire (9 fichiers) |
| Serveur local | Herd (`https://dashboard.test/`) |
| PWA | manifest.json + service worker |

Pas de bundler, pas de framework JS, pas de npm. Tout est servi directement par PHP.

---

## Installation et prérequis

### Prérequis

- PHP 8.0+ avec les extensions : PDO SQLite, cURL, GD (pour les icônes)
- Serveur web local (Herd, WAMP, MAMP, etc.)
- HTTPS requis pour le service worker et les notifications desktop

### Installation

```bash
git clone https://github.com/Romain86/dashboard.git
cd dashboard
# Configurer le serveur web pour pointer vers ce dossier
# Ex: https://dashboard.test/
```

Le dossier `data/` et la base SQLite sont créés automatiquement au premier chargement.

### Premier lancement

1. Ouvrir `https://dashboard.test/` dans le navigateur
2. Cliquer sur le bouton **Configuration** (icône sliders) dans le header
3. Pour chaque widget, cliquer **Configurer** et renseigner les clés API
4. Les clés sont stockées en SQLite, jamais dans le code

---

## Architecture du projet

```
dashboard/
├── index.php                  # Point d'entrée HTML unique
├── config.php                 # Constantes globales + autoloader PSR-like
├── manifest.json              # Manifest PWA (standalone, thème violet)
├── service-worker.js          # Cache shell assets (stale-while-revalidate)
├── offline.html               # Page affichée hors-ligne
│
├── api/
│   └── widgets.php            # Routeur API REST (13 actions)
│
├── core/                      # Classes auto-chargées par config.php
│   ├── WidgetManager.php      # Scanne widgets/*/config.json, appelle api.php via cache
│   ├── Cache.php              # Cache fichier JSON (get, set, remember, delete)
│   └── Database.php           # Singleton PDO SQLite (3 tables)
│
├── widgets/                   # Un dossier par widget
│   └── {id}/
│       ├── config.json        # Déclaration du widget (requis)
│       ├── api.php            # Logique de données (requis)
│       ├── widget.js          # Rendu HTML (requis)
│       ├── mutate.php         # Actions d'écriture (optionnel)
│       ├── auth.php           # Redirection OAuth2 (optionnel)
│       └── callback.php       # Callback OAuth2 (optionnel)
│
├── assets/
│   ├── icons/                 # Icônes PWA (icon-192.png, icon-512.png)
│   ├── css/                   # 9 fichiers CSS modulaires
│   │   ├── tokens.css         # Variables :root, reset, body
│   │   ├── header.css         # Header, horloge, boutons, alertes, notifications
│   │   ├── grid.css           # Grille auto-fill, tailles N/L/XL, mode édition
│   │   ├── card.css           # Cartes widget, animations enter/exit, skeleton
│   │   ├── modal.css          # Modale paramètres, formulaire, champs custom
│   │   ├── drawers.css        # Widget Manager, Config Panel, section backup
│   │   ├── fullscreen.css     # Mode plein écran, auto-hide header
│   │   ├── tabs.css           # Barre d'onglets, bouton +, bouton ×
│   │   └── utilities.css      # Classes utilitaires, scrollbars, responsive
│   └── js/
│       ├── dashboard.js       # Core : objet Dashboard, état interne, init()
│       └── modules/           # 14 modules (Object.assign sur Dashboard)
│           ├── utils.js       # _escHtml(), _renderIcon()
│           ├── api.js         # _fetchWidgetList(), _fetchWidgetData(), _saveSettings()
│           ├── clock.js       # _startClock() — horloge temps réel dans le header
│           ├── geolocation.js # _getLocation(), _updateGeoBtn()
│           ├── header.js      # _initHeaderButtons() — edit, fullscreen, refresh, geo
│           ├── tabs.js        # _loadTabs(), _switchTab(), _createTab(), _renderTabBar()
│           ├── widgets.js     # _mountWidget(), _createCard(), _renderWidgetContent()
│           ├── autorefresh.js # IntersectionObserver + setTimeout par widget
│           ├── dragdrop.js    # _initDragDrop(), _saveLayout() — réordonnement
│           ├── settings.js    # _openSettings(), _buildSettingsForm(), _submitSettings()
│           ├── alerts.js      # _trackError(), _clearError(), _updateAlertBadge()
│           ├── notifications.js # Toasts, dropdown, desktop notifications
│           ├── keyboard.js    # Raccourcis E/F/R/?/Esc + overlay d'aide
│           └── panels.js      # Widget Manager + Config Panel + Import/Export
│
└── data/                      # Auto-créé, gitignored
    ├── dashboard.db           # Base SQLite
    └── cache/                 # Fichiers JSON de cache
```

### Ordre de chargement des scripts (index.php)

```
1.  dashboard.js       ← définit l'objet Dashboard + init()
2.  modules/utils.js
3.  modules/api.js
4.  modules/clock.js
5.  modules/geolocation.js
6.  modules/header.js
7.  modules/tabs.js
8.  modules/widgets.js
9.  modules/autorefresh.js
10. modules/dragdrop.js
11. modules/settings.js
12. modules/alerts.js
13. modules/notifications.js
14. modules/keyboard.js
15. modules/panels.js
    ↓
    DOMContentLoaded → Dashboard.init()
```

Tous les scripts utilisent `filemtime()` pour le cache-busting : `?v=<?= filemtime(...) ?>`.

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
       │    → _processWidgetNotifications()                                          │
       │    → _observeWidget() pour auto-refresh                                     │
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
$url = "https://api.steampowered.com/...?key={$settings['api_key']}";
$data = json_decode(@file_get_contents($url, false, $ctx), true);
return ['name' => $data['personaname'], ...];
```

**5. Réponse JSON → Frontend**

```json
{
    "success": true,
    "data": { "name": "Player1", "status": "En ligne" },
    "cache_ts": 1708520400
}
```

**6. Frontend → Rendu → Auto-refresh**

```js
// widgets.js charge le script puis appelle render()
await this._loadScript(`widgets/${widget.id}/widget.js`);
const renderer = window.DashboardWidgets[widget.id];
renderer.render(json.data, contentEl);

// Traite les éventuelles notifications
this._processWidgetNotifications(widgetId, data);

// Enregistre pour l'auto-refresh (IntersectionObserver)
this._observeWidget(card);
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
   │  widget.js: re-render        │                              │
```

---

## Base de données

SQLite, fichier `data/dashboard.db`, créé automatiquement par `Database::__construct()`.

### Tables

**`widget_settings`** — Paramètres par widget (clé/valeur)

```sql
CREATE TABLE widget_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    widget_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(widget_id, key)
);
```

Stocke les clés API, tokens OAuth, préférences de chaque widget.

**`widget_layout`** — Position et état d'affichage par onglet

```sql
CREATE TABLE widget_layout (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    widget_id TEXT NOT NULL,
    tab_id INTEGER DEFAULT 1,
    position INTEGER DEFAULT 0,
    enabled INTEGER DEFAULT 1,
    size TEXT DEFAULT 'normal',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(widget_id, tab_id)
);
```

Chaque widget peut avoir un layout différent par onglet. `size` vaut `normal`, `lg` (2 colonnes) ou `xl` (pleine largeur).

**`dashboard_tabs`** — Onglets (pages)

```sql
CREATE TABLE dashboard_tabs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position INTEGER DEFAULT 0
);
-- L'onglet id=1 "Accueil" est créé au premier lancement et ne peut pas être supprimé.
```

### Méthodes de Database.php

```php
// Singleton
$db = Database::getInstance();
$pdo = $db->getPdo();

// Settings
$db->getSetting('steam', 'api_key');          // → string|null
$db->getSettings('steam');                     // → ['api_key' => '...', 'steam_id' => '...']
$db->setSetting('steam', 'api_key', 'XXXX');  // INSERT OR REPLACE
$db->getAllSettings();                          // → ['steam' => [...], 'meteo' => [...]]

// Layout (tab-aware)
$db->getLayout(1);                             // → [{widget_id, position, enabled, size}, ...]
$db->saveLayout('steam', 0, true, 1);         // (widgetId, position, enabled, tabId)
$db->saveSize('steam', 'lg', 1);              // (widgetId, size, tabId)

// Tabs
$db->getTabs();                                // → [{id, name, position}, ...]
$db->createTab('Gaming', 1);                   // → int (new id)
$db->renameTab(2, 'Nouveau nom');
$db->deleteTab(2);                             // Supprime aussi les layouts associés
```

---

## API REST

Point d'entrée unique : `api/widgets.php`. Le routage se fait via `$_GET['action']`.

### Paramètres globaux

| Paramètre | Source | Description |
|-----------|--------|-------------|
| `action` | GET | Action à exécuter (obligatoire) |
| `widget` | GET | ID du widget (pour les actions widget-spécifiques) |
| `tab` | GET | ID de l'onglet (défaut: 1) |
| `lat`, `lon` | GET | Coordonnées GPS du navigateur |
| `force` | GET | Si `1`, vide le cache avant l'appel |

### Actions

| Action | Méthode | Params requis | Description |
|--------|---------|---------------|-------------|
| `list` | GET | — | Liste tous les widgets avec état pour l'onglet courant. Retourne aussi `refresh_interval`. |
| `data` | GET | `widget` | Données d'un widget (via cache). Accepte `lat`/`lon` et `force=1`. |
| `settings-get` | GET | `widget` | Paramètres sauvegardés d'un widget. |
| `settings` | POST | `widget` | Sauvegarde les paramètres (body JSON). Vide le cache. |
| `layout` | POST | — | Sauvegarde la disposition (body JSON: `[{id, position, enabled}]`). Tab-aware via `&tab=N`. |
| `size` | POST | `widget` | Sauvegarde la taille (body JSON: `{size}`). Tab-aware via `&tab=N`. |
| `mutate` | POST | `widget` | Action CRUD (body JSON transmis à `mutate.php`). Vide le cache. |
| `export` | GET | — | Export complet JSON v2 (tabs + layouts + settings). Header `Content-Disposition: attachment`. |
| `import` | POST | — | Import depuis un backup JSON. Vide tout le cache. |
| `tabs` | GET | — | Liste des onglets. |
| `tab-create` | POST | — | Crée un onglet (body: `{name, position}`). Retourne `{id}`. |
| `tab-rename` | POST | — | Renomme (body: `{id, name}`). |
| `tab-delete` | POST | — | Supprime (body: `{id}`). Interdit pour `id=1`. |

### Format de réponse

```json
// Succès
{ "success": true, "data": { ... }, "cache_ts": 1708520400 }
{ "success": true, "widgets": [...] }

// Erreur (HTTP 400)
{ "success": false, "error": "Message d'erreur" }
```

---

## Frontend : objet Dashboard et modules

### Architecture

Un seul objet global `Dashboard` défini dans `dashboard.js`. Les 14 modules ajoutent leurs méthodes via `Object.assign()` :

```js
// dashboard.js
const Dashboard = {
    _widgetList: [],
    _editMode: false,
    _currentTab: 1,
    _tabs: [],
    // ...

    async init() {
        // 1. Horloge + boutons header
        // 2. Restaurer mode édition
        // 3. Charger les onglets
        // 4. Géolocalisation + liste widgets en parallèle
        // 5. Monter les widgets activés
        // 6. Init drag-drop, raccourcis, notifications, auto-refresh
    },
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());
```

```js
// modules/monmodule.js — ajoute des méthodes
Object.assign(Dashboard, {
    maMethode() { /* this = Dashboard */ },
});
```

### État interne (propriétés de Dashboard)

| Propriété | Type | Description |
|-----------|------|-------------|
| `_widgetList` | array | Liste complète des widgets (issue de l'API) |
| `_settingsWidget` | object|null | Widget en cours d'édition (modale ouverte) |
| `_location` | object|null | `{lat, lon}` ou null |
| `_widgetErrors` | object | Erreurs widgets actives `{widgetId → {name, icon, msg}}` |
| `_editMode` | boolean | Mode édition actif (drag-drop, resize, onglets) |
| `_fsHideTimer` | number|null | Timer auto-hide header en plein écran |
| `_pageVersion` | number | Timestamp pour cache-busting des widget.js |
| `_lastVisit` | number | Timestamp dernière visite (badges « nouveau ») |
| `_tabs` | array | Onglets `[{id, name, position}]` |
| `_currentTab` | number | ID de l'onglet actif |
| `_autoRefreshTimers` | object | setTimeout IDs par widget |
| `_autoRefreshLastTs` | object | Timestamp du dernier refresh par widget |
| `_autoRefreshObserver` | IntersectionObserver | Observateur de visibilité |
| `_autoRefreshIntervals` | object | refresh_interval par widget (secondes) |

---

## CSS modulaire et thème

### 9 fichiers CSS, chargés en ordre dans `index.php`

| # | Fichier | Rôle |
|---|---------|------|
| 1 | `tokens.css` | Variables `:root`, reset, body, fonts |
| 2 | `header.css` | Header, horloge, boutons, alertes, notifications dropdown |
| 3 | `grid.css` | Grille `auto-fill minmax(300px, 1fr)`, tailles, mode édition |
| 4 | `card.css` | Carte widget, header carte, badges, drag, skeleton, animations enter/exit |
| 5 | `modal.css` | Modale paramètres, formulaire, champs custom select/multiselect |
| 6 | `drawers.css` | Widget Manager, Config Panel, section backup import/export |
| 7 | `fullscreen.css` | Mode plein écran, auto-hide header |
| 8 | `tabs.css` | Barre d'onglets, boutons tab, bouton +, bouton ×, menu contextuel |
| 9 | `utilities.css` | Classes utilitaires, scrollbars, responsive breakpoints |

### Variables CSS du thème (tokens.css)

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

### Convention de nommage CSS dans les widgets

Chaque widget utilise un **préfixe unique** de 2-3 lettres pour éviter les collisions :

| Widget | Préfixe | Exemples |
|--------|---------|----------|
| Steam | `st-` | `.st-avatar`, `.st-game` |
| Spotify | `sp-` | `.sp-track`, `.sp-fill` |
| Météo | `meteo-` | `.meteo-grid`, `.meteo-aqi-badge` |
| GitHub | `gh-` | `.gh-repo`, `.gh-calendar` |
| YouTube | `yt-` | `.yt-channel`, `.yt-video` |

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
| `refresh_interval` | int | TTL du cache en secondes. Sert aussi pour l'auto-refresh frontend. |

**Types de paramètres supportés :**

| Type | Rendu | Notes |
|------|-------|-------|
| `text` | `<input type="text">` | Champ texte classique |
| `password` | `<input type="password">` | Masqué (clés API, tokens) |
| `textarea` | `<textarea>` | Texte multiligne |
| `select` | Dropdown custom | Nécessite `options: [{value, label}]` |
| `multiselect` | Checkboxes | Nécessite `options`, valeur = CSV |

**Icône SVG (recommandé pour un rendu précis) :**

```json
"icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" width=\"20\" height=\"20\"><path fill=\"#ff6600\" d=\"M12 2L2 22h20z\"/></svg>"
```

### Étape 3 — Créer `api.php`

```php
<?php

// $settings est injecté automatiquement par WidgetManager::callWidget()
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

// Retourner un tableau associatif
return [
    'name'   => $data['display_name'],
    'score'  => $data['score'],
    'avatar' => $data['avatar_url'],
];
```

**Règles :**

- **Retourner** un tableau (`return [...]`), ne jamais faire `echo`
- `$settings` est le seul paramètre injecté
- Erreurs via `throw new Exception('message lisible')`
- Le message d'erreur est affiché à l'utilisateur — voir la section [Messages d'erreur et UI](#messages-derreur-et-ui)

### Étape 4 — Créer `widget.js`

```js
window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets['mon-widget'] = {

    render(data, container) {
        this._injectStyles();

        container.innerHTML = `
            <div class="mw-wrap">
                <img class="mw-avatar" src="${this._esc(data.avatar)}" alt="">
                <div class="mw-info">
                    <div class="mw-name">${this._esc(data.name)}</div>
                    <div class="mw-score">Score : ${data.score}</div>
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
            .mw-wrap { display: flex; align-items: center; gap: 12px; }
            .mw-avatar { width: 40px; height: 40px; border-radius: 50%; }
            .mw-name { font-size: 14px; font-weight: 600; color: var(--text); }
            .mw-score { font-size: 12px; color: var(--text-dim); }
        `;
        document.head.appendChild(s);
    },
};
```

**Règles :**

- Le renderer est enregistré sur `window.DashboardWidgets['{id}']`
- `render(data, container)` reçoit les données et l'élément DOM `.widget-content`
- **Toujours échapper** les données avec `_esc()` avant injection HTML
- Utiliser un **préfixe CSS unique** (ex: `mw-` pour "mon-widget")
- Styles injectés via `_injectStyles()` avec un `id` pour éviter les doublons
- Utiliser les variables CSS du thème (`var(--text)`, `var(--text-dim)`, etc.)

### Étape 5 — Tester

```
https://dashboard.test/api/widgets.php?action=data&widget=mon-widget
```

Si le widget n'est pas configuré, le dashboard affiche le bouton "Configurer".

### Étape 6 (optionnel) — Couleur d'accent

Pour ajouter un glow au survol de la carte, éditer `assets/js/modules/widgets.js` et ajouter une entrée dans `_widgetAccents` :

```js
'mon-widget': ['rgba(255, 102, 0, 0.30)', 'rgba(255, 102, 0, 0.06)'],
```

### Étape 7 (optionnel) — Notifications

Pour émettre des notifications depuis le widget, retourner une clé `_notifications` dans `api.php` :

```php
return [
    'items' => [...],
    '_notifications' => [
        ['id' => 'event_123', 'title' => 'Nouvel événement !', 'message' => 'Détails ici'],
    ],
];
```

Chaque notification doit avoir un `id` unique (dédupliqué par le frontend via `{widgetId}_{notif.id}`).

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
| `mutate.php` | Actions d'écriture (POST) : +1 épisode, toggle, ajout/suppression |
| `oauth.php` | Page de redirection/callback OAuth2 |
| `auth.php` | Variante : page de lancement OAuth2 (redirige vers le provider) |
| `callback.php` | Variante : callback OAuth2 (reçoit le code d'autorisation) |

---

## API backend (api.php)

### Variables disponibles

```php
$settings['api_key']    // Paramètre configuré par l'utilisateur
$settings['_lat']       // Latitude GPS (si géolocalisation active)
$settings['_lon']       // Longitude GPS (si géolocalisation active)
```

> `$settings` est injecté par `WidgetManager::callWidget()`. Contient les valeurs de `widget_settings` + les coordonnées GPS préfixées `_`.

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
// NE PAS appeler curl_close() — déprécié depuis PHP 8.5
```

### Messages d'erreur et UI

Le message d'exception déclenche un comportement spécifique dans le frontend :

| Mot-clé dans le message | Bouton affiché |
|--------------------------|----------------|
| `non configuré` ou `manquants` | "Configurer" (ouvre la modale de paramètres) |
| `autorisation` ou `session` | "Connecter mon compte" (lance le flux OAuth) |
| Autre | Message d'erreur brut |

```php
throw new Exception('Widget non configuré : clé API manquante');     // → "Configurer"
throw new Exception('Session Spotify expirée — autorisation requise'); // → "Connecter"
throw new Exception('API Steam indisponible (HTTP 503)');             // → message brut
```

---

## Rendu frontend (widget.js)

### Re-render après mutation

```js
async _mutate(action, container) {
    const res = await fetch('api/widgets.php?action=mutate&widget=s17', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (json.success) {
        this.render({ ...currentData, ...json.data }, container);
    }
},
```

### Animation en temps réel

Pour des mises à jour côté client (barre de progression, compte à rebours) :

```js
render(data, container) {
    clearInterval(this._progressInterval);
    // ... rendu initial ...

    this._progressInterval = setInterval(() => {
        progress = Math.min(progress + 1000, track.duration_ms);
        const fill = document.getElementById('sp-fill');
        if (fill) fill.style.width = (progress / track.duration_ms * 100) + '%';
    }, 1000);
},
```

---

## Actions CRUD (mutate.php)

Pour les widgets interactifs (compteurs, toggles, listes).

### Variables disponibles

```php
$input   // array — JSON décodé du body POST (ex: ['action' => 'watch'])
$db      // Database — singleton SQLite
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

> Après chaque mutation, le cache du widget est automatiquement supprimé par `api/widgets.php`.

---

## Authentification OAuth2

### Flux standard (Spotify, Twitch)

```
1. Clic "Connecter mon compte" → ouvre widgets/{id}/oauth.php
2. oauth.php génère un state CSRF (cookie HTTPOnly) → redirect provider
3. L'utilisateur autorise sur le site du provider
4. Provider redirige vers oauth.php?code=xxx&state=yyy
5. oauth.php échange le code contre access_token + refresh_token
6. Tokens stockés en SQLite → cache vidé → redirect vers /
```

### Variante Google (Calendar, YouTube)

Le domaine `.test` n'est pas accepté par Google. Solution : **Google OAuth Playground**.

1. Redirect URI = `https://developers.google.com/oauthplayground`
2. L'utilisateur récupère manuellement le refresh_token via OAuth Playground
3. Le refresh_token est sauvegardé dans le panneau de configuration

### Rafraîchissement automatique des tokens

Les access tokens expirent (1h pour Spotify/Google). Le `api.php` gère le refresh :

```php
$data = spotifyGet($url, $accessToken);

if (needsRefresh($data)) {
    $new = spotifyRefresh($clientId, $clientSecret, $refreshToken);
    if (!isset($new['access_token'])) {
        throw new Exception('Session expirée — autorisation requise');
    }
    $db->setSetting('spotify', 'access_token', $new['access_token']);
    if (isset($new['refresh_token'])) {
        $db->setSetting('spotify', 'refresh_token', $new['refresh_token']);
    }
    $data = spotifyGet($url, $new['access_token']);
}
```

### Différences par provider

| Provider | Auth Header | Scopes clés | Spécificités |
|----------|-------------|-------------|-------------|
| **Spotify** | Basic (base64 id:secret) | `user-read-currently-playing` | Refresh token stable |
| **Twitch** | Client-ID header | `user:read:follows` | Stocke user_id et user_name |
| **Google Calendar** | Basic (base64 id:secret) | `calendar.readonly` | Via OAuth Playground |
| **YouTube** | POST form body | `youtube.readonly` | Via OAuth Playground, filtre Shorts |

---

## Cache

Le cache est automatique — `WidgetManager::callWidget()` utilise `refresh_interval` du `config.json`.

- **Clé de cache** : `widget_{id}` (ou `widget_{id}_{lat}_{lon}` avec GPS)
- **TTL** : défini par `refresh_interval` en secondes
- **Stockage** : fichiers JSON dans `data/cache/`
- **Invalidation automatique** :
  - Sauvegarde de paramètres → `deleteByPrefix('widget_{id}')`
  - Après mutation → `deleteByPrefix('widget_{id}')`
  - Après refresh de token OAuth2 → `deleteByPrefix('widget_{id}')`
- **Force-refresh** : bouton de refresh envoie `?force=1` qui vide le cache avant l'appel

---

## Géolocalisation

Le module `geolocation.js` demande la position GPS via `navigator.geolocation`. Les coordonnées sont transmises aux widgets via `?lat=xx&lon=yy`.

```php
// Dans api.php — les coordonnées sont dans $settings
$lat = $settings['_lat'] ?? null;
$lon = $settings['_lon'] ?? null;

if ($lat !== null && $lon !== null) {
    $url = "https://api.openweathermap.org/data/2.5/weather?lat={$lat}&lon={$lon}&appid={$apiKey}";
}
```

> Les coordonnées sont arrondies à 0.01° dans la clé de cache pour éviter d'invalider le cache à chaque micro-déplacement.

---

## Système d'onglets

### Principe

Le dashboard supporte plusieurs pages (onglets). Chaque onglet a son propre layout de widgets (quels widgets sont activés, dans quel ordre, quelle taille).

### Table `dashboard_tabs`

L'onglet `id=1` ("Accueil") est créé automatiquement et ne peut pas être supprimé.

### Frontend (tabs.js)

- `_loadTabs()` — charge les onglets depuis l'API
- `_renderTabBar()` — rend la barre d'onglets avec bouton `+` (visible en mode édition) et bouton `×` (sauf sur Accueil)
- `_switchTab(tabId)` — anime la sortie des cartes, recharge les widgets, redémarre l'auto-refresh
- `_createTab()` — prompt pour le nom, POST vers l'API
- Clic droit en mode édition → menu contextuel (renommer / supprimer)
- Onglet courant sauvé en `localStorage('db_current_tab')`

### Impact sur l'API

Toutes les actions layout-related acceptent `&tab=N` :
- `?action=list&tab=2` — widgets de l'onglet 2
- `?action=layout&tab=2` — sauvegarder les positions de l'onglet 2
- `?action=size&widget=steam&tab=2` — taille dans l'onglet 2

---

## Auto-refresh intelligent

### Principe

Les widgets se rafraîchissent automatiquement selon leur `refresh_interval`, mais **uniquement s'ils sont visibles** à l'écran. Un widget hors du viewport ne consomme pas de bande passante.

### Implémentation (autorefresh.js)

- `IntersectionObserver` avec seuil 10% sur chaque `.widget-card`
- `setTimeout` individuel par widget (pas d'intervalle global)
- Quand un widget entre dans le viewport :
  - Si `elapsed >= refresh_interval` → refresh immédiat
  - Sinon → programme un timer pour le temps restant
- Quand un widget sort du viewport → annule son timer
- Quand la fenêtre perd le focus (`document.visibilitychange`) → pause tous les timers
- Quand la fenêtre reprend le focus → reprend uniquement les widgets visibles
- Refresh manuel (bouton) → reset le timer de ce widget

### Intégration

- `widgets.js` appelle `_observeWidget(card)` après le mount
- `tabs.js` appelle `_stopAllAutoRefresh()` avant un switch et `_restartAutoRefresh()` après
- `panels.js` appelle `_unobserveWidget(id)` quand un widget est désactivé

---

## Animations

### Keyframes (card.css)

```css
@keyframes widget-enter {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0);    }
}

@keyframes widget-exit {
    from { opacity: 1; transform: translateY(0);    }
    to   { opacity: 0; transform: translateY(-8px); }
}

.widget-card--entering { animation: widget-enter 280ms ease both; }
.widget-card--exiting  { animation: widget-exit  200ms ease both; pointer-events: none; }
```

### Comportement

| Événement | Animation | Stagger |
|-----------|-----------|---------|
| Mount (chargement initial) | `widget-enter` 280ms | 60ms entre chaque carte |
| Tab switch (sortie) | `widget-exit` 200ms | 30ms entre chaque carte |
| Tab switch (entrée) | `widget-enter` 280ms | 60ms entre chaque carte |
| Toggle widget off | `widget-exit` 200ms | — |

### Accessibilité

```css
@media (prefers-reduced-motion: reduce) {
    .widget-card--entering, .widget-card--exiting {
        animation-duration: 0.01ms !important;
        animation-delay: 0ms !important;
    }
}
```

---

## Notifications

### Principe

Les widgets peuvent émettre des notifications. Le système gère les toasts (en bas à droite), un dropdown dans le header, et les notifications desktop du navigateur.

### Stockage

- `localStorage('db_notifications')` — tableau JSON, max 50 entrées
- Pas de table DB (les notifs sont éphémères)

### Émission (côté widget)

Dans `api.php`, retourner une clé `_notifications` :

```php
return [
    'streams' => [...],
    '_notifications' => [
        ['id' => 'live_streamer1', 'title' => 'StreamerName est en live !', 'message' => 'Joue à Elden Ring'],
    ],
];
```

### Déduplication

Chaque notification a un ID composite `{widgetId}_{notif.id}`. Les doublons sont ignorés.

### Desktop notifications

Permission demandée au premier clic sur le bouton notifications (pas au chargement). Requiert HTTPS.

---

## Raccourcis clavier

| Touche | Action |
|--------|--------|
| `E` | Toggle mode édition |
| `F` | Toggle plein écran |
| `R` | Rafraîchir tous les widgets |
| `?` | Afficher/masquer l'overlay d'aide |
| `Escape` | Fermer modale, drawer, dropdown, aide |

Ignorés quand le focus est dans `input`, `textarea`, `select`, ou un élément `contentEditable`.

---

## Import / Export

### Export

`GET api/widgets.php?action=export` → fichier JSON téléchargé.

Format v2 :
```json
{
    "version": 2,
    "exported_at": "2026-02-22T...",
    "settings": { "steam": { "api_key": "..." }, ... },
    "layout": [ { "widget_id": "steam", "tab_id": 1, "position": 0, "enabled": 1, "size": "normal" } ],
    "tabs": [ { "id": 1, "name": "Accueil", "position": 0 } ]
}
```

> Le fichier contient les clés API en clair.

### Import

`POST api/widgets.php?action=import` avec le JSON en body. Restaure tout et vide le cache.

Accessible via le Config Panel (boutons Exporter / Importer).

---

## PWA (Progressive Web App)

### Manifest (`manifest.json`)

- Display : `standalone` (app plein écran sans barre d'adresse)
- Thème : violet (#7c6af7) sur fond sombre (#0f0f13)
- Icônes : 192x192 et 512x512 (maskable)

### Service Worker (`service-worker.js`)

| Pattern | Stratégie | Fallback |
|---------|-----------|----------|
| `/api/*` | Network-only | JSON `{success: false, error: "Hors ligne"}` |
| `/widgets/*.js` | Network-first | Cache |
| Google Fonts | Cache-first | Network |
| Assets shell (CSS, JS) | Stale-while-revalidate | `offline.html` |

Pour déployer une nouvelle version des assets, incrémenter `CACHE_NAME` dans `service-worker.js` (ex: `dashboard-shell-v1` → `v2`).

### Enregistrement

```html
<script>
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js');
}
</script>
```

---

## Conventions

1. **Clés API** : toujours en SQLite (`widget_settings`), jamais dans le code
2. **Préfixe CSS** : unique par widget (2-3 lettres, ex: `st-` pour steam)
3. **Échappement HTML** : obligatoire pour toute donnée affichée (`_esc()`)
4. **Pas de `echo`** dans `api.php` : retourner un tableau avec `return [...]`
5. **Pas de `curl_close()`** : déprécié depuis PHP 8.5
6. **Cache** : ne pas contourner le cache du `WidgetManager` — modifier `refresh_interval`
7. **Erreurs claires** : les messages d'exception sont affichés à l'utilisateur
8. **Pas de framework** : ni côté PHP, ni côté JS — garder le projet léger
9. **Tab-aware** : les appels layout et size doivent inclure `&tab=N`
10. **Notifications** : utiliser des IDs stables pour la déduplication

---

## Exemples concrets

### Widget simple avec clé API — Steam

**`widgets/steam/config.json`** :
```json
{
    "id": "steam", "name": "Steam", "icon": "<svg ...>",
    "params": [
        { "key": "api_key", "label": "Clé API Steam", "type": "password", "required": true },
        { "key": "steam_id", "label": "Steam ID (64 bits)", "type": "text", "required": true }
    ],
    "refresh_interval": 300
}
```

**`widgets/steam/api.php`** :
```php
$apiKey  = $settings['api_key']  ?? null;
$steamId = $settings['steam_id'] ?? null;
if (!$apiKey || !$steamId) {
    throw new Exception('Widget non configuré : clé API ou Steam ID manquant');
}
$ctx = stream_context_create(['http' => ['timeout' => 5, 'ignore_errors' => true]]);
$url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key={$apiKey}&steamids={$steamId}";
$player = json_decode(@file_get_contents($url, false, $ctx) ?: '{}', true)['response']['players'][0] ?? null;
if (!$player) throw new Exception('Profil Steam introuvable');
return ['name' => $player['personaname'], 'avatar' => $player['avatarfull'], ...];
```

### Widget avec mutations — Studio 17

`widgets/s17/mutate.php` — 4 actions (start, watch, unwatch, cancel) qui modifient `current_episode` et `episode_in_progress` dans `widget_settings`.

### Widget avec notifications — Twitch

`widgets/twitch/api.php` retourne `_notifications` avec les streams live :
```php
'_notifications' => array_map(fn($s) => [
    'id'      => 'live_' . $s['user_login'],
    'title'   => $s['user_name'] . ' est en live !',
    'message' => $s['game_name'],
], $liveStreams),
```

### Widget local sans API — Colis

`widgets/parcels/api.php` lit `tracking_list` depuis SQLite. `widgets/parcels/mutate.php` gère add/remove/status. Détection automatique du transporteur par regex sur le numéro de suivi.

### Widget OAuth2 via Google Playground — YouTube

Redirect URI = `https://developers.google.com/oauthplayground`. Filtre automatique des Shorts (durée < 3min). Limite à 25 chaînes pour éviter le timeout de 30s.
