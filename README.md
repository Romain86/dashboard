# Dashboard Personnel

Dashboard modulaire personnel avec des widgets indépendants, développé en PHP et JavaScript vanilla.

![PHP 8+](https://img.shields.io/badge/PHP-8%2B-777BB4?logo=php&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)

## Fonctionnalités

- **Widgets modulaires** : chaque widget est un dossier autonome (`config.json` + `api.php` + `widget.js`)
- **API REST** : point d'entrée unique `api/widgets.php` pour toutes les actions
- **Cache intelligent** : cache fichier JSON avec TTL configurable par widget
- **Géolocalisation** : coordonnées GPS transmises automatiquement aux widgets qui en ont besoin
- **Drag & Drop** : réorganisation des widgets par glisser-déposer (mode édition)
- **Tailles variables** : cartes N (normal), L (2 colonnes), XL (pleine largeur)
- **Mode plein écran** : header auto-hide avec détection de la souris
- **Panneau de configuration** : vérification visuelle du statut de chaque widget
- **Alertes** : suivi des erreurs widgets avec badge et dropdown
- **Thème dark** : design sombre moderne avec accents violets

## Widgets disponibles

| Widget | Description | API | Refresh |
|--------|-------------|-----|---------|
| Météo | Prévisions 5 jours avec carousel | OpenWeatherMap | 10 min |
| Spotify | Lecture en cours, playlists | Spotify (OAuth2) | 30 sec |
| Steam | Statut en ligne, jeux récents | Steam Web API | 5 min |
| Twitch | Streams suivis en direct | Twitch (OAuth2) | 1 min |
| GitHub | Dépôts, activité, calendrier | GitHub API | 5 min |
| Google Calendar | Événements à venir | Google (OAuth2) | 5 min |
| TMDB | Films/séries tendances | TMDB API | 1h |
| RSS | Flux RSS agrégés | Flux directs | 30 min |
| Countdown | Compte à rebours personnalisé | — | 1h |
| Tablatures | Tablatures guitare | — | 1h |
| Studio 17 | Suivi campagne JDR | Calcul auto | 1h |

## Prérequis

- PHP 8.0+
- Extension PDO SQLite
- Extension cURL
- Serveur web local (Herd, WAMP, MAMP, etc.)

## Installation

```bash
git clone https://github.com/votre-user/dashboard.git
cd dashboard
```

Le dossier `data/` et la base SQLite sont créés automatiquement au premier lancement.

Configurer le serveur web pour pointer vers le dossier du projet (ex: `https://dashboard.test/`).

## Configuration des widgets

1. Ouvrir le dashboard dans le navigateur
2. Cliquer sur le bouton **Configuration** (icône sliders) dans le header
3. Pour chaque widget, cliquer sur **Configurer** et renseigner les clés API requises
4. Les clés sont stockées en base SQLite, jamais dans le code

## Architecture

```
dashboard/
├── index.php                  # Frontend (HTML)
├── config.php                 # Constantes, autoload
├── api/
│   └── widgets.php            # API REST
├── core/
│   ├── WidgetManager.php      # Découverte et appel des widgets
│   ├── Cache.php              # Cache JSON avec TTL
│   └── Database.php           # Singleton SQLite
├── widgets/
│   └── {id}/
│       ├── config.json        # Métadonnées du widget
│       ├── api.php            # Logique backend (données)
│       ├── widget.js          # Rendu frontend
│       └── mutate.php         # Actions CRUD (optionnel)
├── assets/
│   ├── css/                   # CSS modulaire (8 fichiers)
│   └── js/
│       ├── dashboard.js       # Core (état + init)
│       └── modules/           # 10 modules JS
└── data/                      # Auto-créé
    ├── dashboard.db           # Base SQLite
    └── cache/                 # Fichiers cache JSON
```

## API

Toutes les requêtes passent par `api/widgets.php` :

| Action | Méthode | Paramètres | Description |
|--------|---------|------------|-------------|
| `list` | GET | — | Liste tous les widgets |
| `data` | GET | `widget`, `?lat`, `?lon` | Données d'un widget |
| `settings-get` | GET | `widget` | Paramètres sauvegardés |
| `settings` | POST | `widget` + body JSON | Sauvegarde paramètres |
| `layout` | POST | body JSON | Sauvegarde positions |
| `size` | POST | `widget` + body JSON | Sauvegarde taille |
| `mutate` | POST | `widget` + body JSON | Action CRUD custom |

## Licence

Projet personnel.
