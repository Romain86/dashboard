# Dashboard Personnel — Briefing Claude Code

## Contexte du projet

Application web personnelle de type dashboard modulaire avec des widgets indépendants.
Développée en PHP (backend API REST) + JavaScript (frontend). Installable en PWA.

## Stack technique

- **Backend** : PHP 8+, API REST
- **Base de données** : SQLite (via PDO)
- **Cache** : Fichiers JSON locaux
- **Frontend** : JavaScript vanilla
- **Serveur local** : Herd (`https://dashboard.test/`)
- **PWA** : manifest.json + service worker

---

## Architecture des fichiers

```
dashboard/
├── index.php                  # Frontend principal (HTML)
├── config.php                 # Constantes globales, autoload
├── manifest.json              # Manifest PWA
├── service-worker.js          # Service worker (cache shell)
├── offline.html               # Page hors-ligne
├── api/
│   └── widgets.php            # API REST (13 actions)
├── widgets/
│   └── {id}/
│       ├── config.json        # Métadonnées du widget
│       ├── api.php            # Logique backend (données)
│       ├── widget.js          # Rendu frontend
│       ├── mutate.php         # Actions CRUD (optionnel)
│       ├── auth.php           # Redirection OAuth2 (optionnel)
│       └── callback.php       # Callback OAuth2 (optionnel)
├── core/
│   ├── WidgetManager.php      # Scanne et appelle les widgets
│   ├── Cache.php              # Cache JSON avec TTL + méthode remember()
│   └── Database.php           # Singleton SQLite (3 tables)
├── assets/
│   ├── icons/                 # Icônes PWA (192px, 512px)
│   ├── css/                   # 10 fichiers CSS modulaires
│   │   ├── tokens.css         # Variables CSS, reset, body
│   │   ├── header.css         # Header, horloge, boutons
│   │   ├── grid.css           # Grille, tailles, mode édition
│   │   ├── card.css           # Cartes widget, animations, skeleton
│   │   ├── modal.css          # Modale paramètres
│   │   ├── drawers.css        # Widget Manager + Config Panel + backup
│   │   ├── fullscreen.css     # Mode plein écran
│   │   ├── tabs.css           # Barre d'onglets
│   │   ├── utilities.css      # Utilitaires, scrollbars
│   │   └── responsive.css    # Breakpoints mobile + tablette
│   └── js/
│       ├── dashboard.js       # Core (état + init)
│       └── modules/           # 14 modules JS
│           ├── utils.js       # _escHtml(), _renderIcon()
│           ├── api.js         # _fetchWidgetList(), _fetchWidgetData()
│           ├── clock.js       # _startClock()
│           ├── geolocation.js # _getLocation()
│           ├── header.js      # _initHeaderButtons()
│           ├── tabs.js        # Onglets multi-pages
│           ├── widgets.js     # _mountWidget(), _createCard()
│           ├── autorefresh.js # IntersectionObserver + timers
│           ├── dragdrop.js    # _initDragDrop(), _saveLayout()
│           ├── settings.js    # _openSettings(), modale paramètres
│           ├── alerts.js      # Suivi erreurs + badge
│           ├── notifications.js # Toasts + dropdown + desktop notifs
│           ├── keyboard.js    # Raccourcis clavier (E/F/R/?/Esc)
│           └── panels.js      # Widget Manager + Config Panel
└── data/                      # Créé automatiquement (gitignored)
    ├── dashboard.db           # Base SQLite
    └── cache/                 # Fichiers cache JSON
```

---

## Fichiers core

### config.php
- Définit les constantes : `ROOT_PATH`, `WIDGETS_PATH`, `DATA_PATH`, `CACHE_PATH`, `DB_PATH`, `DEFAULT_CACHE_TTL`
- Timezone : Europe/Paris
- Autoload PSR-like des classes dans `/core/`

### core/Database.php
- Singleton PDO SQLite
- **3 tables** : `widget_settings`, `widget_layout` (avec `tab_id`), `dashboard_tabs`
- Settings : `getSetting`, `getSettings`, `setSetting`, `getAllSettings`
- Layout : `getLayout(tabId)`, `saveLayout(widgetId, position, enabled, tabId)`, `saveSize(widgetId, size, tabId)`
- Tabs : `getTabs`, `createTab`, `renameTab`, `deleteTab`

### core/Cache.php
- Cache fichier JSON avec TTL
- Méthodes : `get`, `set`, `delete`, `deleteByPrefix`, `clear`, `remember(key, ttl, callback)`

### core/WidgetManager.php
- Scanne `widgets/*/config.json` pour découvrir les widgets
- `callWidget()` passe automatiquement par le cache (TTL depuis `refresh_interval` du config.json)

### api/widgets.php

| Action | Méthode | Description |
|--------|---------|-------------|
| `list` | GET | Liste widgets avec état pour un onglet (`&tab=N`) |
| `data` | GET | Données d'un widget (avec cache, `&force=1` pour bypass) |
| `settings-get` | GET | Paramètres sauvegardés d'un widget |
| `settings` | POST | Sauvegarde paramètres |
| `layout` | POST | Sauvegarde disposition (tab-aware) |
| `mutate` | POST | Action CRUD custom (appelle mutate.php) |
| `size` | POST | Sauvegarde taille (tab-aware) |
| `export` | GET | Export JSON complet (v2 : tabs + layouts + settings) |
| `import` | POST | Import depuis un backup JSON |
| `tabs` | GET | Liste des onglets |
| `tab-create` | POST | Créer un onglet |
| `tab-rename` | POST | Renommer un onglet |
| `tab-delete` | POST | Supprimer un onglet (id≠1) |

---

## Structure d'un widget

Chaque widget est un dossier dans `/widgets/` avec 3 fichiers :

### config.json
```json
{
    "id": "steam",
    "name": "Steam",
    "icon": "🎮",
    "description": "Tes jeux récents et temps de jeu",
    "version": "1.0",
    "params": [
        { "key": "api_key", "label": "Clé API Steam", "type": "password", "required": true },
        { "key": "steam_id", "label": "Steam ID", "type": "text", "required": true }
    ],
    "refresh_interval": 300
}
```

### api.php
Doit retourner un tableau de données. Reçoit `$settings` (array avec les paramètres configurés).
Peut retourner `_notifications` pour le système de notifications.

### widget.js
Enregistre un renderer : `window.DashboardWidgets['{id}'] = { render(data, container) {} }`

---

## Widgets

| Widget | API | Auth | Refresh |
|--------|-----|------|---------|
| Météo | OpenWeatherMap + Air Pollution | API Key | 10 min |
| Spotify | Spotify Web API | OAuth2 | 30 sec |
| Steam | Steam Web API | API Key | 5 min |
| Twitch | Twitch Helix API | OAuth2 | 1 min |
| GitHub | GitHub REST API | Token | 5 min |
| Google Calendar | Google Calendar API | OAuth2 (OAuth Playground) | 5 min |
| TMDB | TMDB API | API Key | 1h |
| RSS | Flux RSS directs | — | 30 min |
| Countdown | — | — | 1h |
| Tablatures | — | — | 1h |
| Studio 17 | — (calcul local) | — | 1h |
| YouTube | YouTube Data API v3 | OAuth2 (OAuth Playground) | 10 min |
| Colis | — (suivi local) | — | 1h |
| Phone | Phone Link (SQLite locale) | — | 2 min |

### Notes spécifiques

- **Météo** : Inclut la qualité de l'air (AQI) via l'API Air Pollution (gratuite, même clé).
- **YouTube** : OAuth2 via Google OAuth Playground. Filtre automatique des Shorts (durée < 3min). Limite à 25 chaînes.
- **Colis** : Pas d'API externe. Détection automatique du transporteur par regex. Liens directs de suivi.
- **Spotify** : Controles playback (play/pause, next, previous, restart, shuffle) via `mutate.php`. Scopes : `user-modify-playback-state`, `user-read-playback-state`. Refresh silencieux apres action (pas de skeleton). Boutons prev/next disabled selon `actions.disallows` de l'API.
- **Twitch** : Émet des notifications (`_notifications`) quand un stream passe en live.
- **Phone** : Lit les notifications depuis la base SQLite de Microsoft Phone Link. Auto-détection du chemin. Copie .db+.db-shm+.db-wal pour éviter le verrou. Groupement par app avec icônes emoji. Pas de données batterie (non stockées localement).

---

## Fonctionnalités transverses

### Onglets (tabs)
- Table `dashboard_tabs` + colonne `tab_id` dans `widget_layout`
- Chaque onglet a son propre layout de widgets
- Tab 1 ("Accueil") est protégée (non supprimable)
- Bouton `×` visible en mode édition sur les autres onglets

### Auto-refresh intelligent
- `IntersectionObserver` sur chaque carte widget (seuil 10%)
- Timers individuels basés sur `refresh_interval` du config.json
- Pause quand le widget sort du viewport ou la fenêtre perd le focus
- Refresh immédiat si stale au retour dans le viewport

### Animations
- `widget-enter` (280ms) : fade-in + translateY(12px) au mount avec stagger 60ms
- `widget-exit` (200ms) : fade-out + translateY(-8px) au démontage
- `prefers-reduced-motion` respecté

### Notifications
- Stockage localStorage (max 50), pas de table DB
- Clé `_notifications` dans les données API widget
- Toasts auto-dismiss 5s, dropdown avec historique, desktop notifications
- Permission Notification demandée au premier clic

### Raccourcis clavier
- `E` mode édition, `F` plein écran, `R` refresh all, `?` aide, `Esc` tout fermer
- Ignorés quand focus dans input/textarea/select

### Import/Export
- Export v2 : tabs + layouts + settings en JSON
- Import : restaure tout + vide le cache

### PWA
- `manifest.json` : standalone, thème violet (#7c6af7), fond sombre (#0f0f13)
- `service-worker.js` : stale-while-revalidate pour assets, network-only pour API
- `offline.html` : page hors-ligne

---

## Notes importantes

- Les dossiers `data/` et `data/cache/` sont créés automatiquement
- Ne jamais committer `data/dashboard.db` ni `data/cache/`
- Les clés API et tokens sont stockés en base SQLite (table `widget_settings`), jamais en dur dans le code
- Le cache est basé sur fichiers JSON dans `data/cache/`, TTL défini par `refresh_interval` dans config.json
- Cache key inclut les coords GPS arrondies à 0.01° quand elles sont présentes
