/* ============================================================
 *  Module : Alerts — Suivi des erreurs widgets
 *  dashboard/assets/js/modules/alerts.js
 *
 *  Gestion du badge d'alertes dans le header et du
 *  dropdown listant les erreurs actives.
 * ============================================================ */

Object.assign(Dashboard, {

    /** Enregistre une erreur pour un widget. */
    _trackError(widgetId, msg) {
        const widget = this._widgetList.find(w => w.id === widgetId);
        this._widgetErrors[widgetId] = { name: widget?.name ?? widgetId, icon: widget?.icon ?? '🔧', msg };
        this._updateAlertBadge();
    },

    /** Supprime l'erreur d'un widget (après un chargement réussi). */
    _clearError(widgetId) {
        if (!this._widgetErrors[widgetId]) return;
        delete this._widgetErrors[widgetId];
        this._updateAlertBadge();
    },

    /** Met à jour le compteur du badge d'alertes. */
    _updateAlertBadge() {
        const errors = Object.values(this._widgetErrors);
        const badge  = document.getElementById('alert-badge');
        const btn    = document.getElementById('btn-alerts');
        if (badge) {
            badge.textContent = errors.length;
            badge.classList.toggle('hidden', errors.length === 0);
        }
        if (btn) btn.classList.toggle('active', errors.length > 0);

        // Mettre à jour le contenu du dropdown si ouvert
        const dd = document.getElementById('alert-dropdown');
        if (dd && !dd.classList.contains('hidden')) this._renderAlertDropdown();
    },

    /** Rend le contenu du dropdown d'alertes. */
    _renderAlertDropdown() {
        const dd     = document.getElementById('alert-dropdown');
        const errors = Object.values(this._widgetErrors);
        if (errors.length === 0) {
            dd.innerHTML = `<div class="alert-ok">✅ Tout fonctionne</div>`;
        } else {
            dd.innerHTML = errors.map(e => `
                <div class="alert-item">
                    <span class="alert-item-icon">${this._renderIcon(e.icon)}</span>
                    <div>
                        <div class="alert-item-name">${this._escHtml(e.name)}</div>
                        <div class="alert-item-msg">${this._escHtml(e.msg)}</div>
                    </div>
                </div>`).join('');
        }
    },
});
