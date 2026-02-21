# Dashboard Personnel — Briefing Claude Code

## Contexte du projet

Application web personnelle de type dashboard modulaire avec des widgets indépendants.
Développée en PHP (backend API REST) + JavaScript (frontend).

## Stack technique

- **Backend** : PHP 8+, API REST
- **Base de données** : SQLite (via PDO)
- **Cache** : Fichiers JSON locaux
- **Frontend** : JavaScript vanilla
- **Serveur local** : Herd (`https://dashboard.test/`)

---

## Architecture des fichiers

```
dashboard/
├── index.php                  # Frontend principal (HTML)
├── config.php                 # Constantes globales, autoload
├── api/
│   └── widgets.php            # API REST (list, data, settings, layout, mutate, size)
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
│   └── Database.php           # Singleton SQLite
├── assets/
│   ├── css/                   # 8 fichiers CSS modulaires
│   └── js/
│       ├── dashboard.js       # Core (état + init)
│       └── modules/           # 10 modules JS
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
- Tables : `widget_settings` (clé/valeur par widget) et `widget_layout` (position + enabled + size)
- Méthodes : `getSetting`, `getSettings`, `setSetting`, `getLayout`, `saveLayout`

### core/Cache.php
- Cache fichier JSON avec TTL
- Méthodes : `get`, `set`, `delete`, `deleteByPrefix`, `clear`, `remember(key, ttl, callback)`

### core/WidgetManager.php
- Scanne `widgets/*/config.json` pour découvrir les widgets
- `callWidget()` passe automatiquement par le cache (TTL depuis `refresh_interval` du config.json)

### api/widgets.php
- `?action=list` — Liste tous les widgets avec leur état (activé/position)
- `?action=data&widget=steam` — Retourne les données d'un widget (avec cache)
- `?action=data&widget=steam&force=1` — Force le vidage du cache avant rechargement
- `POST ?action=settings&widget=steam` — Sauvegarde les paramètres
- `POST ?action=layout` — Sauvegarde la disposition
- `POST ?action=mutate&widget=s17` — Action CRUD custom
- `POST ?action=size&widget=steam` — Sauvegarde la taille

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

## Widgets

| Widget | API | Auth | Refresh |
|--------|-----|------|---------|
| Météo | OpenWeatherMap | API Key | 10 min |
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

### Notes spécifiques

- **YouTube** : OAuth2 via Google OAuth Playground (`redirect_uri = https://developers.google.com/oauthplayground`). Filtre automatique des Shorts (durée < 3min). Limite à 25 chaînes pour éviter le timeout.
- **Colis** : Pas d'API externe (17TRACK/La Poste nécessitent un compte pro). Détection automatique du transporteur par regex sur le numéro. Liens directs vers les pages de suivi.
- **Google Calendar** : Même méthode OAuth Playground que YouTube.

---

## Notes importantes

- Les dossiers `data/` et `data/cache/` sont créés automatiquement
- Ne jamais committer `data/dashboard.db` ni `data/cache/`
- Les clés API et tokens sont stockés en base SQLite (table `widget_settings`), jamais en dur dans le code
- Le cache est basé sur fichiers JSON dans `data/cache/`, TTL défini par `refresh_interval` dans config.json
