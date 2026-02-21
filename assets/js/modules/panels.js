/* ============================================================
 *  Module : Panels — Widget Manager + Config Panel
 *  dashboard/assets/js/modules/panels.js
 *
 *  Drawers latéraux :
 *  - Widget Manager : activer/désactiver les widgets
 *  - Config Panel   : vérifier et configurer les paramètres
 * ============================================================ */

Object.assign(Dashboard, {

    /* ======================
     *  Widget Manager
     * ====================== */

    /** Ouvre le drawer Widget Manager et rend la liste. */
    _openWidgetManager() {
        const panel = document.getElementById('widget-manager');
        panel.classList.remove('hidden');
        this._renderWidgetManager();
    },

    /** Ferme le drawer Widget Manager. */
    _closeWidgetManager() {
        document.getElementById('widget-manager').classList.add('hidden');
    },

    /** Rend la liste des widgets avec toggle on/off. */
    _renderWidgetManager() {
        const list = document.getElementById('wm-list');
        list.innerHTML = this._widgetList.map(w => `
            <div class="wm-item">
                <span class="wm-item-icon">${this._renderIcon(w.icon)}</span>
                <span class="wm-item-name">${this._escHtml(w.name)}</span>
                <label class="wm-toggle" title="${w.enabled ? 'Désactiver' : 'Activer'}">
                    <input type="checkbox" data-wm-id="${this._escHtml(w.id)}" ${w.enabled ? 'checked' : ''}>
                    <span class="wm-toggle-track"></span>
                </label>
            </div>`).join('');

        list.querySelectorAll('[data-wm-id]').forEach(cb => {
            cb.addEventListener('change', async () => {
                const widget = this._widgetList.find(w => w.id === cb.dataset.wmId);
                if (widget) await this._toggleWidget(widget, cb.checked);
            });
        });
    },

    /** Active ou désactive un widget, monte/démonte la carte. */
    async _toggleWidget(widget, enabled) {
        widget.enabled = enabled;
        const position = this._widgetList.indexOf(widget);

        await fetch('api/widgets.php?action=layout', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify([{ id: widget.id, position, enabled }]),
        }).catch(console.error);

        if (enabled) {
            await this._mountWidget(widget);
        } else {
            document.getElementById(`widget-card-${widget.id}`)?.remove();
            this._clearError(widget.id);
        }

        const hasCards = document.querySelectorAll('#widgets-grid .widget-card').length > 0;
        document.getElementById('widgets-empty').classList.toggle('hidden', hasCards);
    },

    /* ======================
     *  Config Panel
     * ====================== */

    /** Ouvre le drawer Config Panel, charge le statut de chaque widget. */
    async _openConfigPanel() {
        const panel = document.getElementById('config-panel');
        panel.classList.remove('hidden');

        const list = document.getElementById('cp-list');
        list.innerHTML = '<div class="cp-loading">Chargement…</div>';

        // Vérifier le statut de chaque widget en parallèle
        const items = await Promise.all(this._widgetList.map(async w => {
            let status = 'none'; // pas de params requis
            try {
                const [cfgRes, setRes] = await Promise.all([
                    fetch(`widgets/${w.id}/config.json`).then(r => r.json()),
                    fetch(`api/widgets.php?action=settings-get&widget=${encodeURIComponent(w.id)}`).then(r => r.json()),
                ]);
                const requiredParams = (cfgRes.params ?? []).filter(p => p.required);
                if (requiredParams.length > 0) {
                    const settings = setRes.settings ?? {};
                    const allSet = requiredParams.every(p => settings[p.key] && String(settings[p.key]).trim() !== '');
                    status = allSet ? 'ok' : 'warn';
                }
            } catch (_) {}
            return { widget: w, status };
        }));

        this._renderConfigPanel(items);
    },

    /** Ferme le drawer Config Panel. */
    _closeConfigPanel() {
        document.getElementById('config-panel').classList.add('hidden');
    },

    /** Rend la liste des widgets avec leur statut de configuration. */
    _renderConfigPanel(items) {
        const list = document.getElementById('cp-list');
        list.innerHTML = items.map(({ widget: w, status }) => {
            const statusHtml = status === 'ok'
                ? '<span class="cp-status cp-status-ok">✓ OK</span>'
                : status === 'warn'
                    ? '<span class="cp-status cp-status-warn">⚠ Config</span>'
                    : '';
            return `
                <div class="cp-item">
                    <span class="cp-item-icon">${this._renderIcon(w.icon)}</span>
                    <div class="cp-item-body">
                        <div class="cp-item-name">${this._escHtml(w.name)}</div>
                        ${statusHtml}
                    </div>
                    <button class="cp-btn" data-cp-id="${this._escHtml(w.id)}">Configurer</button>
                </div>`;
        }).join('');

        list.querySelectorAll('[data-cp-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                this._openSettings(btn.dataset.cpId);
            });
        });
    },
});
