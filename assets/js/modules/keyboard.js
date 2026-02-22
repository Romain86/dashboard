/* ============================================================
 *  Module : Raccourcis clavier
 *  dashboard/assets/js/modules/keyboard.js
 *
 *  Ajoute des raccourcis clavier globaux au dashboard.
 *  Charge après alerts.js, avant panels.js.
 * ============================================================ */

Object.assign(Dashboard, {

    _kbHelpVisible: false,

    _initKeyboard() {
        document.addEventListener('keydown', (e) => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;

            switch (e.key) {
                case 'e':
                    e.preventDefault();
                    document.getElementById('btn-edit')?.click();
                    break;
                case 'f':
                    e.preventDefault();
                    document.getElementById('btn-fullscreen')?.click();
                    break;
                case 'r':
                    e.preventDefault();
                    document.getElementById('btn-refresh-all')?.click();
                    break;
                case '?':
                    e.preventDefault();
                    this._kbToggleHelp();
                    break;
                case 'Escape':
                    this._kbCloseAll();
                    break;
            }
        });
    },

    _kbToggleHelp() {
        let overlay = document.getElementById('kb-help-overlay');

        if (!overlay) {
            this._kbInjectStyles();
            overlay = document.createElement('div');
            overlay.id = 'kb-help-overlay';
            overlay.className = 'kb-overlay hidden';
            overlay.innerHTML = `
                <div class="kb-backdrop"></div>
                <div class="kb-dialog">
                    <div class="kb-header">
                        <h2 class="kb-title">Raccourcis clavier</h2>
                        <button class="kb-close" aria-label="Fermer">&times;</button>
                    </div>
                    <div class="kb-list">
                        <div class="kb-row"><kbd>E</kbd><span>Mode édition</span></div>
                        <div class="kb-row"><kbd>F</kbd><span>Plein écran</span></div>
                        <div class="kb-row"><kbd>R</kbd><span>Rafraîchir tout</span></div>
                        <div class="kb-row"><kbd>?</kbd><span>Aide raccourcis</span></div>
                        <div class="kb-row"><kbd>Esc</kbd><span>Fermer</span></div>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            overlay.querySelector('.kb-backdrop').addEventListener('click', () => this._kbToggleHelp());
            overlay.querySelector('.kb-close').addEventListener('click', () => this._kbToggleHelp());
        }

        this._kbHelpVisible = !this._kbHelpVisible;
        overlay.classList.toggle('hidden', !this._kbHelpVisible);
    },

    _kbCloseAll() {
        // Fermer l'aide raccourcis
        if (this._kbHelpVisible) { this._kbToggleHelp(); return; }

        // Fermer la modale settings
        const modal = document.getElementById('settings-modal');
        if (modal && !modal.classList.contains('hidden')) {
            document.getElementById('modal-close')?.click();
            return;
        }

        // Fermer les drawers
        const wm = document.getElementById('widget-manager');
        if (wm && !wm.classList.contains('hidden')) {
            document.getElementById('wm-close')?.click();
            return;
        }
        const cp = document.getElementById('config-panel');
        if (cp && !cp.classList.contains('hidden')) {
            document.getElementById('cp-close')?.click();
            return;
        }

        // Fermer les dropdowns
        document.getElementById('alert-dropdown')?.classList.add('hidden');
        document.getElementById('notif-dropdown')?.classList.add('hidden');
    },

    _kbInjectStyles() {
        if (document.getElementById('kb-styles')) return;
        const s = document.createElement('style');
        s.id = 'kb-styles';
        s.textContent = `
            .kb-overlay {
                position: fixed; inset: 0; z-index: 600;
                display: flex; align-items: center; justify-content: center;
            }
            .kb-overlay.hidden { display: none; }
            .kb-backdrop {
                position: absolute; inset: 0;
                background: rgba(0,0,0,0.5);
            }
            .kb-dialog {
                position: relative;
                background: var(--bg-surface, #16161d);
                border: 1px solid var(--border, rgba(255,255,255,0.08));
                border-radius: var(--radius, 12px);
                padding: 24px;
                min-width: 300px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            }
            .kb-header {
                display: flex; align-items: center; justify-content: space-between;
                margin-bottom: 16px;
            }
            .kb-title {
                font-size: 16px; font-weight: 600;
                color: var(--text, #e2e2e8);
                margin: 0;
            }
            .kb-close {
                background: none; border: none; color: var(--text-dim, #9898a6);
                font-size: 22px; cursor: pointer; padding: 0 4px;
                line-height: 1;
            }
            .kb-close:hover { color: var(--text, #e2e2e8); }
            .kb-list { display: flex; flex-direction: column; gap: 10px; }
            .kb-row {
                display: flex; align-items: center; gap: 14px;
                font-size: 13px; color: var(--text-dim, #9898a6);
            }
            .kb-row kbd {
                display: inline-flex; align-items: center; justify-content: center;
                min-width: 36px; height: 28px; padding: 0 8px;
                background: var(--bg-hover, rgba(255,255,255,0.07));
                border: 1px solid var(--border, rgba(255,255,255,0.08));
                border-radius: 6px;
                font-family: 'Inter', monospace; font-size: 12px; font-weight: 600;
                color: var(--text, #e2e2e8);
            }
        `;
        document.head.appendChild(s);
    },
});
