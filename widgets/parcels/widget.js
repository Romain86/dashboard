window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.parcels = {

    render(data, container) {
        this._injectStyles();

        const parcels  = data.parcels ?? [];
        const carriers = data.carriers ?? {};

        container.innerHTML = `
            <div class="pc-header">
                <span class="pc-count">${parcels.length} colis</span>
                <button class="pc-add-btn" title="Ajouter un colis">+</button>
            </div>
            <div class="pc-form hidden" id="pc-form">
                <input class="pc-input" id="pc-input-number" type="text" placeholder="Numéro de suivi">
                <input class="pc-input" id="pc-input-label" type="text" placeholder="Description (optionnel)">
                <select class="pc-input pc-select" id="pc-input-carrier">
                    <option value="">Transporteur (auto-détection)</option>
                    ${Object.entries(carriers).map(([id, name]) =>
                        `<option value="${this._esc(id)}">${this._esc(name)}</option>`
                    ).join('')}
                </select>
                <div class="pc-form-actions">
                    <button class="pc-btn pc-btn-cancel" id="pc-cancel">Annuler</button>
                    <button class="pc-btn pc-btn-confirm" id="pc-confirm">Ajouter</button>
                </div>
            </div>
            ${parcels.length === 0
                ? '<div class="pc-empty">Aucun colis suivi</div>'
                : `<div class="pc-list">${parcels.map(p => this._renderParcel(p)).join('')}</div>`
            }`;

        this._bindEvents(container, data);
    },

    _renderParcel(p) {
        const icon = this._statusIcon(p.status);
        const cls  = p.delivered ? 'pc-parcel pc-delivered' : 'pc-parcel';

        return `
            <div class="${cls}" data-number="${this._esc(p.number)}">
                <div class="pc-parcel-icon">${icon}</div>
                <div class="pc-parcel-body">
                    <div class="pc-parcel-top">
                        <span class="pc-parcel-label">${this._esc(p.label)}</span>
                        <span class="pc-parcel-status pc-st-${this._esc(p.status)}">${this._esc(p.status_label)}</span>
                    </div>
                    <div class="pc-parcel-meta">
                        ${p.carrier ? `<span class="pc-parcel-carrier">${this._esc(p.carrier)}</span>` : ''}
                        ${p.added_at ? `<span class="pc-parcel-date">ajouté ${this._fmtDate(p.added_at)}</span>` : ''}
                        <span class="pc-parcel-num">${this._esc(p.number)}</span>
                    </div>
                    <div class="pc-parcel-actions">
                        ${p.tracking_url ? `<a href="${this._esc(p.tracking_url)}" target="_blank" rel="noopener" class="pc-track-link" title="Suivre sur ${this._esc(p.carrier)}">🔗 Suivre</a>` : ''}
                        <button class="pc-status-btn" title="Changer le statut">⟳</button>
                    </div>
                </div>
                <button class="pc-remove-btn" title="Supprimer">&times;</button>
            </div>`;
    },

    _statusIcon(status) {
        const icons = {
            'pending':      '⏳',
            'shipped':      '📦',
            'in_transit':   '🚚',
            'out_delivery': '🏃',
            'delivered':    '✅',
            'issue':        '⚠️',
        };
        return icons[status] || '📦';
    },

    _statusOptions() {
        return [
            { value: 'pending',      label: 'En attente' },
            { value: 'shipped',      label: 'Expédié' },
            { value: 'in_transit',   label: 'En transit' },
            { value: 'out_delivery', label: 'En livraison' },
            { value: 'delivered',    label: 'Livré' },
            { value: 'issue',        label: 'Problème' },
        ];
    },

    _bindEvents(container, data) {
        const form       = container.querySelector('#pc-form');
        const addBtn     = container.querySelector('.pc-add-btn');
        const cancelBtn  = container.querySelector('#pc-cancel');
        const confirmBtn = container.querySelector('#pc-confirm');
        const numInput   = container.querySelector('#pc-input-number');
        const lblInput   = container.querySelector('#pc-input-label');
        const carrierSel = container.querySelector('#pc-input-carrier');

        addBtn.addEventListener('click', () => {
            form.classList.toggle('hidden');
            if (!form.classList.contains('hidden')) numInput.focus();
        });

        cancelBtn.addEventListener('click', () => {
            form.classList.add('hidden');
            numInput.value = '';
            lblInput.value = '';
            carrierSel.value = '';
        });

        confirmBtn.addEventListener('click', () => this._addParcel(numInput, lblInput, carrierSel, container, data));

        numInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') this._addParcel(numInput, lblInput, carrierSel, container, data);
        });

        // Boutons supprimer
        container.querySelectorAll('.pc-remove-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const parcel = btn.closest('.pc-parcel');
                const number = parcel.dataset.number;
                parcel.style.opacity = '0.4';

                const res = await fetch('api/widgets.php?action=mutate&widget=parcels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'remove', number }),
                });
                const json = await res.json();
                if (json.success) {
                    data.parcels = data.parcels.filter(p => p.number !== number);
                    data.count = data.parcels.length;
                    this.render(data, container);
                }
            });
        });

        // Boutons changer statut
        container.querySelectorAll('.pc-status-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const parcel = btn.closest('.pc-parcel');
                const number = parcel.dataset.number;
                this._showStatusMenu(btn, number, container, data);
            });
        });
    },

    _showStatusMenu(anchor, number, container, data) {
        // Fermer tout menu existant
        document.querySelectorAll('.pc-status-menu').forEach(m => m.remove());

        const current = data.parcels.find(p => p.number === number)?.status;
        const menu = document.createElement('div');
        menu.className = 'pc-status-menu';
        menu.innerHTML = this._statusOptions().map(opt =>
            `<button class="pc-status-option ${opt.value === current ? 'pc-active' : ''}" data-status="${opt.value}">${opt.label}</button>`
        ).join('');

        anchor.parentElement.appendChild(menu);

        menu.querySelectorAll('.pc-status-option').forEach(optBtn => {
            optBtn.addEventListener('click', async () => {
                const newStatus = optBtn.dataset.status;
                menu.remove();

                const res = await fetch('api/widgets.php?action=mutate&widget=parcels', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'status', number, status: newStatus }),
                });
                const json = await res.json();
                if (json.success) {
                    const p = data.parcels.find(p => p.number === number);
                    if (p) {
                        p.status = newStatus;
                        p.delivered = newStatus === 'delivered';
                        const labels = { pending: 'En attente', shipped: 'Expédié', in_transit: 'En transit', out_delivery: 'En livraison', delivered: 'Livré', issue: 'Problème' };
                        p.status_label = labels[newStatus] || newStatus;
                    }
                    this.render(data, container);
                }
            });
        });

        // Fermer en cliquant ailleurs
        const close = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', close);
            }
        };
        setTimeout(() => document.addEventListener('click', close), 0);
    },

    async _addParcel(numInput, lblInput, carrierSel, container, data) {
        const number  = numInput.value.trim();
        const label   = lblInput.value.trim();
        const carrier = carrierSel.value;

        if (!number) return;

        const confirmBtn = container.querySelector('#pc-confirm');
        confirmBtn.disabled = true;
        confirmBtn.textContent = '…';

        try {
            const res = await fetch('api/widgets.php?action=mutate&widget=parcels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add', number, label, carrier }),
            });
            const json = await res.json();
            if (json.success) {
                // Re-fetch les données complètes (avec tracking_url)
                const refresh = await fetch('api/widgets.php?action=data&widget=parcels');
                const freshData = await refresh.json();
                Object.assign(data, freshData.data);
                this.render(data, container);
            } else {
                alert(json.error || 'Erreur');
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Ajouter';
            }
        } catch (e) {
            alert('Erreur réseau');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Ajouter';
        }
    },

    _fmtDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            const now = new Date();
            const diff = Math.floor((now - d) / 1000);
            if (diff < 3600)  return 'il y a ' + Math.floor(diff / 60) + ' min';
            if (diff < 86400) return 'il y a ' + Math.floor(diff / 3600) + ' h';
            const days = Math.floor(diff / 86400);
            if (days === 1) return 'hier';
            if (days < 7)   return 'il y a ' + days + ' j';
            return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        } catch (_) {
            return dateStr;
        }
    },

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _injectStyles() {
        if (document.getElementById('pc-styles')) return;
        const s = document.createElement('style');
        s.id = 'pc-styles';
        s.textContent = `
            .pc-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .pc-count {
                font-size: 12px;
                color: var(--text-dim);
            }
            .pc-add-btn {
                width: 26px;
                height: 26px;
                border-radius: 50%;
                border: 1px solid var(--border);
                background: var(--bg-card);
                color: var(--text);
                font-size: 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background var(--transition);
            }
            .pc-add-btn:hover { background: var(--bg-hover); }

            .pc-form {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 12px;
                padding: 10px;
                background: var(--bg-card);
                border-radius: var(--radius-sm);
                border: 1px solid var(--border);
            }
            .pc-form.hidden { display: none; }

            .pc-input, .pc-select {
                background: var(--bg-base);
                border: 1px solid var(--border);
                border-radius: 6px;
                padding: 7px 10px;
                color: var(--text);
                font-size: 12px;
                outline: none;
            }
            .pc-input:focus, .pc-select:focus { border-color: var(--accent); }
            .pc-select option { background: var(--bg-base); color: var(--text); }

            .pc-form-actions {
                display: flex;
                gap: 6px;
                justify-content: flex-end;
            }
            .pc-btn {
                padding: 5px 12px;
                border-radius: 6px;
                border: none;
                font-size: 12px;
                cursor: pointer;
                transition: opacity var(--transition);
            }
            .pc-btn:hover { opacity: 0.85; }
            .pc-btn-cancel {
                background: var(--bg-hover);
                color: var(--text-dim);
            }
            .pc-btn-confirm {
                background: #22c55e;
                color: #fff;
                font-weight: 600;
            }

            .pc-empty {
                text-align: center;
                padding: 24px 0;
                color: var(--muted);
                font-size: 13px;
            }

            .pc-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .pc-parcel {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 10px;
                background: var(--bg-card);
                border-radius: var(--radius-sm);
                border: 1px solid var(--border);
                transition: background var(--transition);
            }
            .pc-parcel:hover { background: var(--bg-hover); }
            .pc-delivered { opacity: 0.6; }

            .pc-parcel-icon {
                font-size: 18px;
                flex-shrink: 0;
                width: 26px;
                text-align: center;
                padding-top: 1px;
            }

            .pc-parcel-body {
                flex: 1;
                min-width: 0;
            }
            .pc-parcel-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 8px;
            }
            .pc-parcel-label {
                font-size: 13px;
                font-weight: 600;
                color: var(--text);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .pc-parcel-status {
                font-size: 10px;
                font-weight: 600;
                padding: 2px 6px;
                border-radius: 4px;
                white-space: nowrap;
                flex-shrink: 0;
            }
            .pc-st-in_transit,
            .pc-st-out_delivery {
                background: rgba(59, 130, 246, 0.15);
                color: #60a5fa;
            }
            .pc-st-delivered {
                background: rgba(34, 197, 94, 0.15);
                color: #4ade80;
            }
            .pc-st-shipped {
                background: rgba(124, 106, 247, 0.15);
                color: #a78bfa;
            }
            .pc-st-pending {
                background: rgba(148, 163, 184, 0.12);
                color: var(--muted);
            }
            .pc-st-issue {
                background: rgba(239, 68, 68, 0.15);
                color: #f87171;
            }

            .pc-parcel-meta {
                display: flex;
                gap: 8px;
                margin-top: 3px;
                font-size: 10px;
                color: var(--muted);
            }
            .pc-parcel-num {
                font-family: monospace;
                letter-spacing: -0.3px;
            }

            .pc-parcel-actions {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 5px;
            }
            .pc-track-link {
                font-size: 11px;
                color: var(--accent);
                text-decoration: none;
                opacity: 0.8;
                transition: opacity var(--transition);
            }
            .pc-track-link:hover { opacity: 1; }

            .pc-status-btn {
                border: none;
                background: transparent;
                color: var(--muted);
                font-size: 13px;
                cursor: pointer;
                padding: 1px 4px;
                border-radius: 4px;
                transition: color var(--transition), background var(--transition);
                opacity: 0;
            }
            .pc-parcel:hover .pc-status-btn { opacity: 1; }
            .pc-status-btn:hover {
                color: var(--text);
                background: var(--bg-hover);
            }

            .pc-status-menu {
                position: absolute;
                right: 0;
                top: 100%;
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 100;
                display: flex;
                flex-direction: column;
                min-width: 130px;
                overflow: hidden;
            }
            .pc-status-option {
                border: none;
                background: transparent;
                color: var(--text);
                font-size: 12px;
                padding: 7px 12px;
                text-align: left;
                cursor: pointer;
                transition: background var(--transition);
            }
            .pc-status-option:hover { background: var(--bg-hover); }
            .pc-status-option.pc-active {
                color: var(--accent);
                font-weight: 600;
            }

            .pc-parcel-actions {
                position: relative;
            }

            .pc-remove-btn {
                flex-shrink: 0;
                width: 22px;
                height: 22px;
                border: none;
                background: transparent;
                color: var(--muted);
                font-size: 16px;
                cursor: pointer;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: color var(--transition), background var(--transition);
                opacity: 0;
            }
            .pc-parcel:hover .pc-remove-btn { opacity: 1; }
            .pc-remove-btn:hover {
                color: var(--danger);
                background: rgba(245, 101, 101, 0.1);
            }
        `;
        document.head.appendChild(s);
    },
};
