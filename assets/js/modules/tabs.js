/* ============================================================
 *  Module : Tabs
 *  dashboard/assets/js/modules/tabs.js
 *
 *  Gestion des onglets (pages) du dashboard.
 *  Chaque onglet a son propre layout de widgets.
 * ============================================================ */

Object.assign(Dashboard, {

    _tabs:       [],
    _currentTab: 1,

    async _loadTabs() {
        try {
            const res  = await fetch('api/widgets.php?action=tabs');
            const json = await res.json();
            this._tabs = json.tabs ?? [];
        } catch (_) {
            this._tabs = [{ id: 1, name: 'Accueil', position: 0 }];
        }
    },

    _renderTabBar() {
        const bar = document.getElementById('tab-bar');
        if (!bar) return;

        bar.innerHTML = this._tabs.map(t => `
            <button class="tab-btn${t.id === this._currentTab ? ' active' : ''}"
                    data-tab-id="${t.id}">${this._escHtml(t.name)}</button>`
        ).join('') + '<button class="tab-btn tab-btn-add" id="tab-add" title="Nouvel onglet">+</button>';

        // Clic sur un onglet
        bar.querySelectorAll('[data-tab-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                this._switchTab(+btn.dataset.tabId);
            });

            // Clic droit en mode édition → menu contextuel
            btn.addEventListener('contextmenu', (e) => {
                if (!this._editMode) return;
                e.preventDefault();
                this._showTabContext(+btn.dataset.tabId, e.clientX, e.clientY);
            });
        });

        // Bouton +
        document.getElementById('tab-add')?.addEventListener('click', () => this._createTab());
    },

    async _switchTab(tabId) {
        if (tabId === this._currentTab) return;
        this._currentTab = tabId;
        localStorage.setItem('db_current_tab', String(tabId));

        // Retirer toutes les cartes widget
        const grid = document.getElementById('widgets-grid');
        grid.querySelectorAll('.widget-card').forEach(c => c.remove());

        // Recharger les widgets de cet onglet
        const widgetList = await this._fetchWidgetList();
        if (!widgetList) return;
        this._widgetList = widgetList;

        const enabled = this._widgetList.filter(w => w.enabled);
        document.getElementById('widgets-empty').classList.toggle('hidden', enabled.length > 0);

        if (enabled.length > 0) {
            await Promise.all(enabled.map(w => this._mountWidget(w)));
        }

        this._renderTabBar();
    },

    async _createTab() {
        const name = prompt('Nom du nouvel onglet :');
        if (!name || !name.trim()) return;

        try {
            const res  = await fetch('api/widgets.php?action=tab-create', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ name: name.trim(), position: this._tabs.length }),
            });
            const json = await res.json();
            if (json.success) {
                await this._loadTabs();
                this._renderTabBar();
                this._switchTab(json.id);
            }
        } catch (err) {
            console.error('Erreur création onglet :', err);
        }
    },

    _showTabContext(tabId, x, y) {
        // Supprimer l'ancien menu
        document.getElementById('tab-ctx')?.remove();

        const tab = this._tabs.find(t => t.id === tabId);
        if (!tab) return;

        const menu = document.createElement('div');
        menu.id = 'tab-ctx';
        menu.className = 'tab-ctx';
        menu.style.left = x + 'px';
        menu.style.top  = y + 'px';

        let html = `<button class="tab-ctx-item" data-action="rename">Renommer</button>`;
        if (tabId !== 1) {
            html += `<button class="tab-ctx-item tab-ctx-item--danger" data-action="delete">Supprimer</button>`;
        }
        menu.innerHTML = html;
        document.body.appendChild(menu);

        menu.querySelector('[data-action="rename"]').addEventListener('click', async () => {
            menu.remove();
            const newName = prompt('Nouveau nom :', tab.name);
            if (!newName || !newName.trim()) return;
            await fetch('api/widgets.php?action=tab-rename', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ id: tabId, name: newName.trim() }),
            });
            await this._loadTabs();
            this._renderTabBar();
        });

        menu.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
            menu.remove();
            if (!confirm(`Supprimer l'onglet « ${tab.name} » et ses widgets ?`)) return;
            await fetch('api/widgets.php?action=tab-delete', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ id: tabId }),
            });
            await this._loadTabs();
            if (this._currentTab === tabId) {
                this._switchTab(1);
            } else {
                this._renderTabBar();
            }
        });

        // Fermer au clic en dehors
        const close = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', close);
            }
        };
        setTimeout(() => document.addEventListener('click', close), 0);
    },
});
