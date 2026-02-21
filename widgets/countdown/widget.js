window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.countdown = {

    render(data, container) {
        this._injectStyles();

        // Nettoyer l'intervalle précédent
        if (container._cdInterval) {
            clearInterval(container._cdInterval);
            container._cdInterval = null;
        }

        if (data.needs_auth) {
            container.innerHTML = `
                <div class="cd-msg">
                    ⚠ Configurez d'abord le widget Google Calendar<br>
                    <small>Les credentials seront réutilisés automatiquement</small>
                </div>`;
            return;
        }

        const events = data.events ?? [];

        if (!events.length) {
            container.innerHTML = `<div class="cd-msg">Aucun événement configuré</div>`;
            return;
        }

        container.style.maxHeight = '400px';
        container.style.overflowY = 'auto';

        container.innerHTML = `<div class="cd-list">${events.map((e, i) => this._renderCard(e, i)).join('')}</div>`;

        // Un seul intervalle pour tous les événements
        const tick = () => {
            events.forEach((e, i) => {
                if (e.not_found || !e.timestamp) return;
                const diff     = Math.max(0, e.timestamp * 1000 - Date.now());
                const totalSec = Math.floor(diff / 1000);
                const days     = Math.floor(totalSec / 86400);

                const dEl = container.querySelector(`#cd-d-${i}`);
                if (dEl) dEl.textContent = days;

                if (!e.all_day) {
                    const h = Math.floor((totalSec % 86400) / 3600);
                    const m = Math.floor((totalSec % 3600)  / 60);
                    const s = totalSec % 60;
                    const hEl = container.querySelector(`#cd-h-${i}`);
                    const mEl = container.querySelector(`#cd-m-${i}`);
                    const sEl = container.querySelector(`#cd-s-${i}`);
                    if (hEl) hEl.textContent = String(h).padStart(2, '0');
                    if (mEl) mEl.textContent = String(m).padStart(2, '0');
                    if (sEl) sEl.textContent = String(s).padStart(2, '0');
                }
            });
        };

        tick();
        container._cdInterval = setInterval(tick, 1000);
    },

    _renderCard(e, i) {
        if (e.not_found) {
            return `
                <div class="cd-card cd-card-missing">
                    <div class="cd-card-title">${this._esc(e.title)}</div>
                    <div class="cd-card-date">Événement non trouvé</div>
                </div>`;
        }

        const dateLabel = new Date(
            e.all_day ? e.start.replace(/-/g, '/') : e.start
        ).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

        const timeUnits = e.all_day ? '' : `
            <span class="cd-card-sep">:</span>
            <span class="cd-card-unit"><span class="cd-card-val" id="cd-h-${i}">--</span><span class="cd-card-lbl">h</span></span>
            <span class="cd-card-sep">:</span>
            <span class="cd-card-unit"><span class="cd-card-val" id="cd-m-${i}">--</span><span class="cd-card-lbl">m</span></span>
            <span class="cd-card-sep">:</span>
            <span class="cd-card-unit"><span class="cd-card-val" id="cd-s-${i}">--</span><span class="cd-card-lbl">s</span></span>`;

        const tag = e.url ? 'a' : 'div';
        const href = e.url ? `href="${this._esc(e.url)}" target="_blank" rel="noopener"` : '';

        return `
            <${tag} class="cd-card" ${href}>
                <div class="cd-card-left">
                    <div class="cd-card-title">${this._esc(e.title)}</div>
                    <div class="cd-card-date">${dateLabel}</div>
                </div>
                <div class="cd-card-right">
                    <div class="cd-card-counter">
                        <span class="cd-card-unit">
                            <span class="cd-card-val cd-card-days" id="cd-d-${i}">--</span>
                            <span class="cd-card-lbl">j</span>
                        </span>
                        ${timeUnits}
                    </div>
                </div>
            </${tag}>`;
    },

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _injectStyles() {
        if (document.getElementById('cd-styles')) return;
        const s = document.createElement('style');
        s.id = 'cd-styles';
        s.textContent = `
            .cd-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .cd-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 12px 10px;
                background: rgba(124,106,247,0.06);
                border: 1px solid rgba(124,106,247,0.12);
                border-radius: 10px;
                text-decoration: none;
                transition: background 120ms ease, border-color 120ms ease;
            }
            a.cd-card:hover {
                background: rgba(124,106,247,0.12);
                border-color: rgba(124,106,247,0.25);
            }
            .cd-card-missing {
                opacity: .4;
                background: rgba(255,255,255,0.03);
                border-color: rgba(255,255,255,0.06);
            }
            .cd-card-left {
                display: flex;
                flex-direction: column;
                gap: 3px;
                min-width: 0;
                flex: 1;
            }
            .cd-card-title {
                font-size: 13px;
                font-weight: 600;
                color: #c8c8d0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            a.cd-card:hover .cd-card-title { color: #7c6af7; }
            .cd-card-date {
                font-size: 11px;
                color: #555560;
                text-transform: capitalize;
            }
            .cd-card-right {
                flex-shrink: 0;
            }
            .cd-card-counter {
                display: flex;
                align-items: center;
                gap: 2px;
            }
            .cd-card-unit {
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 30px;
            }
            .cd-card-val {
                font-size: 22px;
                font-weight: 700;
                color: #7c6af7;
                font-variant-numeric: tabular-nums;
                line-height: 1;
            }
            .cd-card-days { font-size: 28px; min-width: 42px; text-align: center; }
            .cd-card-lbl {
                font-size: 9px;
                color: #555560;
                text-transform: uppercase;
                letter-spacing: .4px;
            }
            .cd-card-sep {
                font-size: 18px;
                color: #333340;
                margin-bottom: 10px;
                padding: 0 1px;
            }
            .cd-msg {
                font-size: 13px;
                color: #555560;
                text-align: center;
                padding: 24px;
                line-height: 1.6;
            }
            .cd-msg small { font-size: 11px; color: #444450; }
        `;
        document.head.appendChild(s);
    },
};
