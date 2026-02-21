/* ============================================================
 *  Module : Header — Boutons du header
 *  dashboard/assets/js/modules/header.js
 *
 *  Gestion des événements pour tous les boutons du header :
 *  refresh all, mode édition, widget manager, alertes,
 *  géolocalisation, configuration, plein écran.
 * ============================================================ */

Object.assign(Dashboard, {

    _initHeaderButtons() {

        /* ---- Rafraîchir tous les widgets ---- */
        document.getElementById('btn-refresh-all')?.addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn.classList.add('spinning');
            document.querySelectorAll('[data-refresh]').forEach(b => b.click());
            setTimeout(() => btn.classList.remove('spinning'), 800);
        });

        /* ---- Mode édition (drag + resize) ---- */
        document.getElementById('btn-edit')?.addEventListener('click', () => {
            this._editMode = !this._editMode;
            document.body.classList.toggle('edit-mode', this._editMode);
            localStorage.setItem('db_edit_mode', this._editMode ? '1' : '0');
            document.getElementById('btn-edit').classList.toggle('active', this._editMode);
            document.querySelectorAll('.widget-card').forEach(c => {
                c.draggable = this._editMode;
            });
        });

        /* ---- Widget Manager ---- */
        document.getElementById('btn-manage')?.addEventListener('click', () => this._openWidgetManager());
        document.getElementById('wm-close')?.addEventListener('click',   () => this._closeWidgetManager());
        document.getElementById('wm-overlay')?.addEventListener('click', () => this._closeWidgetManager());

        /* ---- Alertes ---- */
        document.getElementById('btn-alerts')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const dd = document.getElementById('alert-dropdown');
            const wasHidden = dd.classList.contains('hidden');
            dd.classList.toggle('hidden');
            if (wasHidden) this._renderAlertDropdown();
        });
        document.addEventListener('click', () => {
            document.getElementById('alert-dropdown')?.classList.add('hidden');
        });

        /* ---- Géolocalisation (toggle) ---- */
        document.getElementById('btn-geo')?.addEventListener('click', async () => {
            if (this._location) {
                this._location = null;
                this._updateGeoBtn(false);
            } else {
                await this._getLocation();
            }
            document.querySelectorAll('[data-refresh]').forEach(b => b.click());
        });

        /* ---- Configuration ---- */
        document.getElementById('btn-config')?.addEventListener('click', () => this._openConfigPanel());
        document.getElementById('cp-close')?.addEventListener('click',   () => this._closeConfigPanel());
        document.getElementById('cp-overlay')?.addEventListener('click', () => this._closeConfigPanel());

        /* ---- Plein écran ---- */
        const btnFs = document.getElementById('btn-fullscreen');
        if (btnFs) {
            btnFs.addEventListener('click', () => {
                if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
                else document.exitFullscreen();
            });

            document.addEventListener('fullscreenchange', () => {
                const fs = !!document.fullscreenElement;
                document.body.classList.toggle('is-fullscreen', fs);
                btnFs.querySelector('.icon-expand')?.classList.toggle('hidden', fs);
                btnFs.querySelector('.icon-compress')?.classList.toggle('hidden', !fs);
                if (!fs) {
                    clearTimeout(this._fsHideTimer);
                    document.querySelector('.dashboard-header')?.classList.remove('fs-hidden');
                }
            });

            // Auto-hide du header après 2 secondes d'inactivité en mode plein écran
            document.addEventListener('mousemove', e => {
                if (!document.fullscreenElement) return;
                const hdr = document.querySelector('.dashboard-header');
                if (!hdr) return;
                hdr.classList.remove('fs-hidden');
                clearTimeout(this._fsHideTimer);
                if (e.clientY > 64) {
                    this._fsHideTimer = setTimeout(() => hdr.classList.add('fs-hidden'), 2000);
                }
            });
        }
    },
});
