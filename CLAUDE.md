# Dashboard Personnel — Briefing Claude Code

## Contexte du projet

Application web personnelle de type dashboard modulaire avec des widgets indépendants.
Développée en PHP (backend API REST) + JavaScript (frontend).

## Stack technique

- **Backend** : PHP 8+, API REST
- **Base de données** : SQLite (via PDO)
- **Cache** : Fichiers JSON locaux
- **Frontend** : JavaScript vanilla ou Vue.js (à venir)
- **Serveur local** : Herd

---

## Architecture des fichiers

```
dashboard/
├── index.php                  # (à créer) Frontend principal
├── config.php                 # Constantes globales, autoload
├── api/
│   └── widgets.php            # Point d'entrée API (actions: list, data, settings, layout)
├── widgets/
│   ├── steam/
│   │   ├── config.json
│   │   ├── api.php
│   │   └── widget.js
│   ├── twitch/
│   │   ├── config.json
│   │   ├── api.php
│   │   └── widget.js
│   ├── spotify/
│   │   ├── config.json
│   │   ├── api.php
│   │   └── widget.js
│   └── meteo/
│       ├── config.json
│       ├── api.php
│       └── widget.js
├── core/
│   ├── WidgetManager.php      # Scanne et appelle les widgets
│   ├── Cache.php              # Cache JSON avec TTL + méthode remember()
│   └── Database.php           # Singleton SQLite
├── assets/
│   ├── css/
│   │   └── dashboard.css
│   └── js/
│       └── dashboard.js
└── data/
    ├── dashboard.db           # Créé automatiquement par Database.php
    └── cache/                 # Créé automatiquement par Cache.php
```

---

## Fichiers déjà développés

### config.php
- Définit les constantes : `ROOT_PATH`, `WIDGETS_PATH`, `DATA_PATH`, `CACHE_PATH`, `DB_PATH`, `DEFAULT_CACHE_TTL`
- Timezone : Europe/Paris
- Autoload PSR-like des classes dans `/core/`

### core/Database.php
- Singleton PDO SQLite
- Tables : `widget_settings` (clé/valeur par widget) et `widget_layout` (position + enabled)
- Méthodes : `getSetting`, `getSettings`, `setSetting`, `getLayout`, `saveLayout`

### core/Cache.php
- Cache fichier JSON avec TTL
- Méthodes : `get`, `set`, `delete`, `clear`, `remember(key, ttl, callback)`

### core/WidgetManager.php
- Scanne `widgets/*/config.json` pour découvrir les widgets
- `callWidget()` passe automatiquement par le cache (TTL depuis `refresh_interval` du config.json)

### api/widgets.php
- `?action=list` — Liste tous les widgets avec leur état (activé/position)
- `?action=data&widget=steam` — Retourne les données d'un widget (avec cache)
- `POST ?action=settings&widget=steam` — Sauvegarde les paramètres
- `POST ?action=layout` — Sauvegarde la disposition

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
```php
<?php
// $settings est injecté par WidgetManager::callWidget()
// Retourner un tableau de données
return [
    'now_playing' => '...',
];
```

### widget.js
Reçoit les données de l'API et génère le HTML du widget.

---

## Widgets prévus

| Widget   | API                        | Auth         | Refresh |
|----------|----------------------------|--------------|---------|
| Steam    | api.steampowered.com       | API Key      | 5 min   |
| Twitch   | api.twitch.tv              | OAuth2       | 1 min   |
| Spotify  | api.spotify.com            | OAuth2       | 30 sec  |
| Météo    | openweathermap.org         | API Key      | 10 min  |
| TMDB     | api.themoviedb.org         | API Key      | 1h      |
| RSS      | Flux RSS directs           | Aucune       | 30 min  |

---

## Prochaine étape

Développer le **premier widget** : Steam ou Twitch (APIs bien documentées).

Pour chaque widget, il faudra :
1. Créer `widgets/{id}/config.json`
2. Créer `widgets/{id}/api.php` qui appelle l'API externe et retourne les données
3. Créer `widgets/{id}/widget.js` pour le rendu HTML
4. Tester via `api/widgets.php?action=data&widget={id}`

---

## Notes importantes

- Les dossiers `data/` et `data/cache/` sont créés automatiquement
- Ne jamais committer `data/dashboard.db` ni `data/cache/`
- Les clés API et tokens sont stockés en base SQLite (table `widget_settings`), jamais en dur dans le code
- Le cache est basé sur fichiers JSON dans `data/cache/`, TTL défini par `refresh_interval` dans config.json
