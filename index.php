<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
    <!-- CSS modulaire -->
    <link rel="stylesheet" href="assets/css/tokens.css?v=<?= filemtime(__DIR__ . '/assets/css/tokens.css') ?>">
    <link rel="stylesheet" href="assets/css/header.css?v=<?= filemtime(__DIR__ . '/assets/css/header.css') ?>">
    <link rel="stylesheet" href="assets/css/grid.css?v=<?= filemtime(__DIR__ . '/assets/css/grid.css') ?>">
    <link rel="stylesheet" href="assets/css/card.css?v=<?= filemtime(__DIR__ . '/assets/css/card.css') ?>">
    <link rel="stylesheet" href="assets/css/modal.css?v=<?= filemtime(__DIR__ . '/assets/css/modal.css') ?>">
    <link rel="stylesheet" href="assets/css/drawers.css?v=<?= filemtime(__DIR__ . '/assets/css/drawers.css') ?>">
    <link rel="stylesheet" href="assets/css/fullscreen.css?v=<?= filemtime(__DIR__ . '/assets/css/fullscreen.css') ?>">
    <link rel="stylesheet" href="assets/css/tabs.css?v=<?= filemtime(__DIR__ . '/assets/css/tabs.css') ?>">
    <link rel="stylesheet" href="assets/css/utilities.css?v=<?= filemtime(__DIR__ . '/assets/css/utilities.css') ?>">
</head>
<body>

    <header class="dashboard-header">

        <div class="header-brand">
            <svg class="header-logo" width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                <rect x="2"  y="2"  width="10" height="10" rx="3" fill="var(--accent)"/>
                <rect x="14" y="2"  width="10" height="10" rx="3" fill="var(--accent)" opacity=".45"/>
                <rect x="2"  y="14" width="10" height="10" rx="3" fill="var(--accent)" opacity=".45"/>
                <rect x="14" y="14" width="10" height="10" rx="3" fill="var(--accent)" opacity=".2"/>
            </svg>
            <h1 class="dashboard-title">Dashboard</h1>
        </div>

        <div class="header-clock">
            <span id="clock-time" class="clock-time"></span>
            <span id="clock-date" class="clock-date"></span>
        </div>

        <div class="header-actions">

            <button id="btn-edit" class="header-btn" title="Mode édition" aria-label="Mode édition">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>

            <button id="btn-config" class="header-btn" title="Configuration des widgets" aria-label="Configuration">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="4" y1="6" x2="20" y2="6"/><circle cx="8" cy="6" r="2.2" fill="var(--bg-base)" stroke="currentColor"/>
                    <line x1="4" y1="12" x2="20" y2="12"/><circle cx="16" cy="12" r="2.2" fill="var(--bg-base)" stroke="currentColor"/>
                    <line x1="4" y1="18" x2="20" y2="18"/><circle cx="10" cy="18" r="2.2" fill="var(--bg-base)" stroke="currentColor"/>
                </svg>
            </button>

            <button id="btn-manage" class="header-btn" title="Gérer les widgets" aria-label="Gérer les widgets">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
            </button>

            <div class="header-btn-wrap">
                <button id="btn-notif" class="header-btn" title="Notifications" aria-label="Notifications">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2z"/>
                        <path d="M18 16v-5c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                    </svg>
                </button>
                <span id="notif-badge" class="notif-badge hidden">0</span>
                <div id="notif-dropdown" class="notif-dropdown hidden"></div>
            </div>

            <div class="header-btn-wrap">
                <button id="btn-alerts" class="header-btn" title="Alertes" aria-label="Alertes">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                </button>
                <span id="alert-badge" class="alert-badge hidden">0</span>
                <div id="alert-dropdown" class="alert-dropdown hidden"></div>
            </div>

            <button id="btn-geo" class="header-btn" title="Géolocalisation inactive" aria-label="Géolocalisation">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="10" r="3"/>
                    <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/>
                </svg>
            </button>

            <button id="btn-refresh-all" class="header-btn" title="Rafraîchir tous les widgets" aria-label="Rafraîchir tout">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/>
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>
                </svg>
            </button>

            <button id="btn-fullscreen" class="header-btn" title="Plein écran" aria-label="Plein écran">
                <svg class="icon-expand" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
                <svg class="icon-compress hidden" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                </svg>
            </button>

        </div>

    </header>

    <nav id="tab-bar" class="tab-bar"></nav>

    <main class="dashboard-main">
        <div id="widgets-grid" class="widgets-grid">
            <div id="widgets-empty" class="widgets-empty hidden">
                <p>Aucun widget activé.</p>
                <p class="muted">Ajoutez un dossier dans <code>widgets/</code> pour commencer.</p>
            </div>
        </div>
    </main>

    <!-- Modal settings -->
    <div id="settings-modal" class="modal hidden" role="dialog" aria-modal="true">
        <div class="modal-overlay" id="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <span id="modal-icon" class="modal-icon"></span>
                <h2 id="modal-title" class="modal-title"></h2>
                <button class="modal-close" id="modal-close" aria-label="Fermer">&times;</button>
            </div>
            <form id="settings-form" class="settings-form" novalidate>
                <div id="settings-fields"></div>
                <div class="modal-actions">
                    <button type="button" id="cancel-settings" class="btn btn-secondary">Annuler</button>
                    <button type="submit" id="save-settings" class="btn btn-primary">Sauvegarder</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Widget Manager Drawer -->
    <div id="widget-manager" class="wm-panel hidden">
        <div class="wm-overlay" id="wm-overlay"></div>
        <div class="wm-drawer">
            <div class="wm-header">
                <h2 class="wm-title">Widgets</h2>
                <button class="header-btn" id="wm-close" aria-label="Fermer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div id="wm-list" class="wm-list"></div>
        </div>
    </div>

    <!-- Config Panel Drawer -->
    <div id="config-panel" class="cp-panel hidden">
        <div class="cp-overlay" id="cp-overlay"></div>
        <aside class="cp-drawer">
            <div class="cp-header">
                <h2 class="cp-title">Configuration</h2>
                <button class="header-btn" id="cp-close" aria-label="Fermer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div id="cp-list" class="cp-list"></div>
        </aside>
    </div>

    <!-- JS modulaire — core + modules (ordre de chargement important) -->
    <script src="assets/js/dashboard.js?v=<?= filemtime(__DIR__ . '/assets/js/dashboard.js') ?>"></script>
    <script src="assets/js/modules/utils.js?v=<?= filemtime(__DIR__ . '/assets/js/modules/utils.js') ?>"></script>
    <script src="assets/js/modules/api.js?v=<?= filemtime(__DIR__ . '/assets/js/modules/api.js') ?>"></script>
    <script src="assets/js/modules/clock.js?v=<?= filemtime(__DIR__ . '/assets/js/modules/clock.js') ?>"></script>
    <script src="assets/js/modules/geolocation.js?v=<?= filemtime(__DIR__ . '/assets/js/modules/geolocation.js') ?>"></script>
    <script src="assets/js/modules/header.js?v=<?= filemtime(__DIR__ . '/assets/js/modules/header.js') ?>"></script>
    <script src="assets/js/modules/tabs.js?v=<?= filemtime(__DIR__ . '/assets/js/modules/tabs.js') ?>"></script>
    <script src="assets/js/modules/widgets.js?v=<?= filemtime(__DIR__ . '/assets/js/modules/widgets.js') ?>"></script>
    <script src="assets/js/modules/dragdrop.js?v=<?= filemtime(__DIR__ . '/assets/js/modules/dragdrop.js') ?>"></script>
    <script src="assets/js/modules/settings.js?v=<?= filemtime(__DIR__ . '/assets/js/modules/settings.js') ?>"></script>
    <script src="assets/js/modules/alerts.js?v=<?= filemtime(__DIR__ . '/assets/js/modules/alerts.js') ?>"></script>
    <script src="assets/js/modules/notifications.js?v=<?= filemtime(__DIR__ . '/assets/js/modules/notifications.js') ?>"></script>
    <script src="assets/js/modules/keyboard.js?v=<?= filemtime(__DIR__ . '/assets/js/modules/keyboard.js') ?>"></script>
    <script src="assets/js/modules/panels.js?v=<?= filemtime(__DIR__ . '/assets/js/modules/panels.js') ?>"></script>

</body>
</html>
