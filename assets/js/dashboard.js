'use strict';

/* ============================================================
 *  Dashboard — Core
 *  dashboard/assets/js/dashboard.js
 *
 *  Point d'entrée principal. Définit l'objet Dashboard,
 *  son état interne et la méthode init().
 *  Les modules ajoutent leurs méthodes via Object.assign().
 *
 *  Ordre de chargement requis :
 *    1. dashboard.js       (ce fichier)
 *    2. modules/utils.js
 *    3. modules/api.js
 *    4. modules/clock.js
 *    5. modules/geolocation.js
 *    6. modules/header.js
 *    7. modules/tabs.js
 *    8. modules/widgets.js
 *    9. modules/autorefresh.js
 *   10. modules/dragdrop.js
 *   11. modules/settings.js
 *   12. modules/alerts.js
 *   13. modules/notifications.js
 *   14. modules/keyboard.js
 *   15. modules/panels.js
 * ============================================================ */

const Dashboard = {

    /* ---- État interne ---- */
    _widgetList:    [],     // liste complète des widgets (issue de l'API)
    _settingsWidget: null,  // widget dont on édite les paramètres
    _location:      null,   // { lat, lon } ou null
    _widgetErrors:  {},     // erreurs widgets actives (widgetId → { name, icon, msg })
    _editMode:      false,  // mode édition (drag-drop, resize)
    _fsHideTimer:   null,   // timer auto-hide du header en plein écran
    _pageVersion:   null,   // timestamp pour le cache-busting des widget.js
    _lastVisit:     0,      // timestamp de la dernière visite (pour les badges)

    /* ---- Initialisation ---- */
    async init() {
        this._startClock();
        this._initHeaderButtons();

        this._pageVersion = Date.now();

        // Restaurer le mode édition depuis le localStorage
        this._editMode = localStorage.getItem('db_edit_mode') === '1';
        if (this._editMode) {
            document.body.classList.add('edit-mode');
            document.getElementById('btn-edit')?.classList.add('active');
        }

        // Horodatage de la visite précédente (pour les badges « nouveau »)
        this._lastVisit = parseInt(localStorage.getItem('dashboard_last_visit') || '0');
        localStorage.setItem('dashboard_last_visit', Math.floor(Date.now() / 1000));

        // Charger les onglets et restaurer le dernier actif
        await this._loadTabs();
        this._currentTab = parseInt(localStorage.getItem('db_current_tab') || '1');
        if (!this._tabs.find(t => t.id === this._currentTab)) {
            this._currentTab = this._tabs[0]?.id || 1;
        }
        this._renderTabBar();

        // Géolocalisation en parallèle du chargement de la liste
        const [widgetList] = await Promise.all([
            this._fetchWidgetList().catch(e => { console.error('Liste widgets :', e); return null; }),
            this._getLocation(),
        ]);

        if (!widgetList) return;
        this._widgetList = widgetList;

        const enabled = this._widgetList.filter(w => w.enabled);

        // Charger les notifications existantes AVANT le montage des widgets
        // (sinon _processWidgetNotifications les traite toutes comme nouvelles)
        this._initNotifications();

        if (enabled.length === 0) {
            document.getElementById('widgets-empty').classList.remove('hidden');
        } else {
            // Monter tous les widgets en parallèle
            await Promise.all(enabled.map(w => this._mountWidget(w)));
        }

        this._bindModal();
        this._initDragDrop();
        this._initKeyboard();
        this._initAutoRefresh();

        // Fermer les dropdowns custom au clic en dehors
        document.addEventListener('click', () => {
            document.querySelectorAll('.field-custom-select.open')
                    .forEach(s => s.classList.remove('open'));
        });
    },
};

/* ---- Lancement au chargement du DOM ---- */
document.addEventListener('DOMContentLoaded', () => Dashboard.init());
