window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.s17 = {

    render(data, container) {
        this._injectStyles();

        const { campaign_name, campaign_url, current_ep, ep_total, behind, in_progress, next_release_ts } = data;
        const nextEp = current_ep + 1;
        const progress = ep_total > 0 ? Math.round((current_ep / ep_total) * 100) : null;

        // Badge statut
        let statusHtml = '';
        if (in_progress) {
            statusHtml = `<div class="s17-in-progress">▶ En cours : Épisode ${nextEp}</div>`;
        } else if (behind > 0) {
            statusHtml = `<div class="s17-alert">${behind} épisode${behind > 1 ? 's' : ''} de retard !</div>`;
        } else if (current_ep > 0 && ep_total > 0) {
            statusHtml = `<div class="s17-up2date">✓ À jour</div>`;
        }

        // Barre de progression globale
        const progressHtml = progress !== null ? `
            <div class="s17-progress-wrap">
                <div class="s17-progress-bar">
                    <div class="s17-progress-fill" style="width:${progress}%"></div>
                </div>
                <span class="s17-progress-label">${current_ep} / ${ep_total} épisodes</span>
            </div>` : '';

        // Prochain épisode
        const nextHtml = next_release_ts ? this._nextReleaseHtml(next_release_ts) : '';

        // Boutons d'actions
        let actionsHtml = '';
        if (in_progress) {
            // En train de regarder → bouton "Terminé" + "Annuler"
            actionsHtml = `
                <button class="s17-btn s17-btn-cancel" data-action="cancel">← Annuler</button>
                <button class="s17-btn s17-btn-watch" data-action="watch">Ep. ${nextEp} vu ✓</button>`;
        } else {
            // Pas en cours → bouton "Commencer" + "Retirer dernier"
            actionsHtml = `
                <button class="s17-btn s17-btn-unwatch" data-action="unwatch">← Ep. ${current_ep}</button>
                <button class="s17-btn s17-btn-start" data-action="start">▶ Ep. ${nextEp}</button>
                <button class="s17-btn s17-btn-watch" data-action="watch">Ep. ${nextEp} vu ✓</button>`;
        }

        container.innerHTML = `
            <div class="s17-wrap">
                <a class="s17-title" href="${this._esc(campaign_url)}" target="_blank" rel="noopener">
                    ${this._esc(campaign_name)}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
                ${statusHtml}
                ${progressHtml}
                ${nextHtml}
                <div class="s17-actions">${actionsHtml}</div>
            </div>`;

        // Bind tous les boutons d'action
        container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => this._mutate(container, btn.dataset.action, data));
        });
    },

    _nextReleaseHtml(ts) {
        const now  = Date.now();
        const diff = ts * 1000 - now;
        if (diff <= 0) return '';

        const days  = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        let label;
        if (days >= 2)       label = `dans ${days} jours`;
        else if (days === 1) label = `demain`;
        else                 label = `dans ${hours}h`;

        return `<div class="s17-next">Prochain épisode ${label}</div>`;
    },

    async _mutate(container, action, data) {
        const res = await fetch(`api/widgets.php?action=mutate&widget=s17`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ action }),
        });
        const json = await res.json();
        if (!json.success) return;

        // Re-render avec les données mises à jour
        const updated = {
            ...data,
            current_ep:  json.data.current_ep,
            in_progress: json.data.in_progress,
            behind:      Math.max(0, data.ep_total - json.data.current_ep),
        };
        this.render(updated, container);
    },

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _injectStyles() {
        if (document.getElementById('s17-styles')) return;
        const s = document.createElement('style');
        s.id = 's17-styles';
        s.textContent = `
            .s17-wrap { display: flex; flex-direction: column; gap: 12px; }
            .s17-title {
                font-size: 15px; font-weight: 700; color: #e2e2e8;
                text-decoration: none; display: flex; align-items: center; gap: 6px;
            }
            .s17-title:hover { color: #7c6af7; }
            .s17-title svg { flex-shrink: 0; opacity: 0.5; }
            .s17-alert {
                font-size: 12px; font-weight: 600; color: #f6ad55;
                background: rgba(246,173,85,0.12); border-radius: 6px;
                padding: 6px 10px;
            }
            .s17-up2date {
                font-size: 12px; font-weight: 600; color: #68d391;
                background: rgba(104,211,145,0.12); border-radius: 6px;
                padding: 6px 10px;
            }
            .s17-in-progress {
                font-size: 12px; font-weight: 600; color: #63b3ed;
                background: rgba(99,179,237,0.12); border-radius: 6px;
                padding: 6px 10px;
            }
            .s17-next { font-size: 11px; color: #9898a6; }
            .s17-progress-wrap { display: flex; flex-direction: column; gap: 5px; }
            .s17-progress-bar {
                height: 5px; background: rgba(255,255,255,0.08);
                border-radius: 3px; overflow: hidden;
            }
            .s17-progress-fill {
                height: 100%; background: #7c6af7;
                border-radius: 3px; transition: width 400ms ease;
            }
            .s17-progress-label { font-size: 11px; color: #9898a6; }
            .s17-actions { display: flex; gap: 8px; }
            .s17-btn {
                border: none; border-radius: 7px; font-size: 12px; font-family: inherit;
                font-weight: 600; cursor: pointer; padding: 7px 14px;
                transition: all 140ms ease; flex: 1;
            }
            .s17-btn-watch {
                background: rgba(124,106,247,0.20); color: #a89ef8;
                border: 1px solid rgba(124,106,247,0.30);
            }
            .s17-btn-watch:hover { background: rgba(124,106,247,0.35); color: #c8beff; }
            .s17-btn-start {
                background: rgba(99,179,237,0.15); color: #63b3ed;
                border: 1px solid rgba(99,179,237,0.25);
            }
            .s17-btn-start:hover { background: rgba(99,179,237,0.30); color: #90cdf4; }
            .s17-btn-unwatch, .s17-btn-cancel {
                background: rgba(255,255,255,0.04); color: #9898a6;
                border: 1px solid rgba(255,255,255,0.08);
            }
            .s17-btn-unwatch:hover, .s17-btn-cancel:hover { background: rgba(255,255,255,0.08); color: #c8c8d0; }
        `;
        document.head.appendChild(s);
    },
};
