# Dashboard Personnel

Dashboard modulaire personnel avec des widgets indépendants, développé en PHP et JavaScript vanilla. Installable en PWA.

![PHP 8+](https://img.shields.io/badge/PHP-8%2B-777BB4?logo=php&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)

## Fonctionnalités

- **Widgets modulaires** : chaque widget est un dossier autonome (`config.json` + `api.php` + `widget.js`)
- **API REST** : point d'entrée unique `api/widgets.php` pour toutes les actions (13 endpoints)
- **Onglets** : multiples pages avec layouts indépendants par onglet
- **Cache intelligent** : cache fichier JSON avec TTL configurable par widget
- **Auto-refresh** : rafraîchissement automatique des widgets visibles (IntersectionObserver)
- **Géolocalisation** : coordonnées GPS transmises automatiquement aux widgets
- **Drag & Drop** : réorganisation des widgets par glisser-déposer (mode édition)
- **Tailles variables** : cartes N (normal), L (2 colonnes), XL (pleine largeur)
- **Mode plein écran** : header auto-hide avec détection de la souris
- **Animations** : transitions fluides au montage/démontage des widgets
- **Notifications** : toasts, dropdown, et notifications desktop
- **Raccourcis clavier** : E (édition), F (plein écran), R (refresh), ? (aide)
- **Import/Export** : sauvegarde et restauration complète en JSON
- **PWA** : installable comme application standalone
- **Panneau de configuration** : vérification visuelle du statut de chaque widget
- **Alertes** : suivi des erreurs widgets avec badge et dropdown
- **Thème dark** : design sombre moderne avec accents violets

## Widgets disponibles

| Widget | Description | API | Refresh |
|--------|-------------|-----|---------|
| Météo | Prévisions 5 jours + qualité de l'air (AQI) | OpenWeatherMap | 10 min |
| Spotify | Lecture en cours, playlists | Spotify (OAuth2) | 30 sec |
| Steam | Statut en ligne, jeux récents | Steam Web API | 5 min |
| Twitch | Streams suivis en direct + notifications | Twitch (OAuth2) | 1 min |
| GitHub | Dépôts, activité, calendrier | GitHub API | 5 min |
| Google Calendar | Événements à venir | Google (OAuth2) | 5 min |
| TMDB | Films/séries tendances | TMDB API | 1h |
| RSS | Flux RSS agrégés | Flux directs | 30 min |
| Countdown | Compte à rebours personnalisé | — | 1h |
| Tablatures | Tablatures guitare | — | 1h |
| Studio 17 | Suivi campagne JDR | Calcul auto | 1h |
| YouTube | Dernières vidéos des abonnements | YouTube Data API (OAuth2) | 10 min |
| Colis | Suivi de livraisons | Local + liens transporteurs | 1h |

## Prérequis

- PHP 8.0+
- Extension PDO SQLite
- Extension cURL
- Serveur web local avec HTTPS (Herd, WAMP, MAMP, etc.)

## Installation

```bash
git clone https://github.com/Romain86/dashboard.git
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
├── manifest.json              # PWA manifest
├── service-worker.js          # Cache shell assets
├── offline.html               # Page hors-ligne
├── api/
│   └── widgets.php            # API REST (13 actions)
├── core/
│   ├── WidgetManager.php      # Découverte et appel des widgets
│   ├── Cache.php              # Cache JSON avec TTL
│   └── Database.php           # Singleton SQLite (3 tables)
├── widgets/
│   └── {id}/
│       ├── config.json        # Métadonnées du widget
│       ├── api.php            # Logique backend (données)
│       ├── widget.js          # Rendu frontend
│       └── mutate.php         # Actions CRUD (optionnel)
├── assets/
│   ├── icons/                 # Icônes PWA
│   ├── css/                   # CSS modulaire (9 fichiers)
│   └── js/
│       ├── dashboard.js       # Core (état + init)
│       └── modules/           # 14 modules JS
└── data/                      # Auto-créé, gitignored
    ├── dashboard.db           # Base SQLite
    └── cache/                 # Fichiers cache JSON
```

## API

Toutes les requêtes passent par `api/widgets.php` :

| Action | Méthode | Description |
|--------|---------|-------------|
| `list` | GET | Liste tous les widgets (tab-aware) |
| `data` | GET | Données d'un widget (avec cache) |
| `settings-get` | GET | Paramètres sauvegardés |
| `settings` | POST | Sauvegarde paramètres |
| `layout` | POST | Sauvegarde positions (tab-aware) |
| `size` | POST | Sauvegarde taille (tab-aware) |
| `mutate` | POST | Action CRUD custom |
| `export` | GET | Export JSON complet |
| `import` | POST | Import depuis un backup |
| `tabs` | GET | Liste des onglets |
| `tab-create` | POST | Créer un onglet |
| `tab-rename` | POST | Renommer un onglet |
| `tab-delete` | POST | Supprimer un onglet |

## Documentation développeur

Voir [docs/DEVELOPER.md](docs/DEVELOPER.md) pour le guide complet : architecture détaillée, flux de données, création de widgets, OAuth2, cache, et toutes les fonctionnalités.

## Licence

Projet personnel.
