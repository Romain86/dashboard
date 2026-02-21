'use strict';

/* =====================================================
   Dashboard — Main JS
   ===================================================== */

const Dashboard = {

    /** Liste des widgets chargés (config depuis l'API) */
    _widgetList: [],

    /** Config active pour le modal settings */
    _settingsWidget: null,

    /** Géolocalisation du navigateur {lat, lon} ou null */
    _location: null,

    /* --------------------------------------------------
       Init
    -------------------------------------------------- */
    async init() {
        this._startClock();

        // Horodatage de la visite précédente (pour les badges)
        this._lastVisit = parseInt(localStorage.getItem('dashboard_last_visit') || '0');
        localStorage.setItem('dashboard_last_visit', Math.floor(Date.now() / 1000));

        // Géolocalisation en parallèle du chargement de la liste
        const [widgetList] = await Promise.all([
            this._fetchWidgetList().catch(e => { console.error('Liste widgets :', e); return null; }),
            this._getLocation(),
        ]);

        if (!widgetList) return;
        this._widgetList = widgetList;

        const enabled = this._widgetList.filter(w => w.enabled);

        if (enabled.length === 0) {
            document.getElementById('widgets-empty').classList.remove('hidden');
            return;
        }

        // Monter tous les widgets en parallèle
        await Promise.all(enabled.map(w => this._mountWidget(w)));

        this._bindModal();

        // Fermer les dropdowns custom au clic en dehors
        document.addEventListener('click', () => {
            document.querySelectorAll('.field-custom-select.open')
                    .forEach(s => s.classList.remove('open'));
        });
    },

    /* --------------------------------------------------
       Géolocalisation
    -------------------------------------------------- */
    _getLocation() {
        return new Promise(resolve => {
            if (!navigator.geolocation) return resolve();
            navigator.geolocation.getCurrentPosition(
                pos => {
                    this._location = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                    resolve();
                },
                () => resolve(), // refus ou erreur : on continue sans coords
                { timeout: 5000, maximumAge: 300000 }
            );
        });
    },

    /* --------------------------------------------------
       Horloge
    -------------------------------------------------- */
    _startClock() {
        const el = document.getElementById('clock');
        const update = () => {
            const now = new Date();
            el.textContent = now.toLocaleString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
        };
        update();
        setInterval(update, 1000);
    },

    /* --------------------------------------------------
       API helpers
    -------------------------------------------------- */
    async _fetchWidgetList() {
        const res  = await fetch('api/widgets.php?action=list');
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        return data.widgets;
    },

    async _fetchWidgetData(widgetId) {
        let url = `api/widgets.php?action=data&widget=${encodeURIComponent(widgetId)}`;
        if (this._location) {
            url += `&lat=${this._location.lat}&lon=${this._location.lon}`;
        }
        const res  = await fetch(url);
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        return { data: json.data, cache_ts: json.cache_ts ?? 0 };
    },

    async _saveSettings(widgetId, values) {
        const res = await fetch(`api/widgets.php?action=settings&widget=${encodeURIComponent(widgetId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
    },

    /* --------------------------------------------------
       Widget mounting
    -------------------------------------------------- */
    async _mountWidget(widget) {
        const grid = document.getElementById('widgets-grid');
        const card = this._createCard(widget);

        // Appliquer la taille sauvegardée
        if (widget.size && widget.size !== 'normal') {
            card.classList.add(`widget-card--${widget.size}`);
        }

        grid.appendChild(card);

        const content = card.querySelector('.widget-content');

        // Charger le widget.js du widget (peut ne pas exister)
        try {
            await this._loadScript(`widgets/${widget.id}/widget.js`);
        } catch (_) {
            // Pas de widget.js : on utilisera le renderer par défaut
        }

        await this._renderWidgetContent(widget.id, content);
    },

    async _renderWidgetContent(widgetId, contentEl) {
        this._showSkeleton(contentEl);

        try {
            const { data, cache_ts } = await this._fetchWidgetData(widgetId);
            const renderer = window.DashboardWidgets?.[widgetId];

            if (renderer && typeof renderer.render === 'function') {
                renderer.render(data, contentEl);
            } else {
                // Renderer par défaut : JSON brut
                contentEl.innerHTML = `<pre style="font-size:11px;color:var(--text-dim);overflow:auto;">${JSON.stringify(data, null, 2)}</pre>`;
            }

            // Badge de notification : nouvelle donnée depuis la dernière visite ?
            this._updateBadge(widgetId, cache_ts);
        } catch (err) {
            const msg    = err.message ?? '';
            const msgLow = msg.toLowerCase();
            // isSetup : clé API / client_id manquant(s) — \b évite de matcher "manquante"
            const isSetup = msgLow.includes('non configuré')
                         || msgLow.includes('api key')
                         || /\bmanquants?\b/.test(msgLow);
            // isOAuth : app configurée mais token/session absent — priorité à isSetup
            const isOAuth = !isSetup
                         && (msgLow.includes('autorisation') || msgLow.includes('manquante') || msgLow.includes('session'));

            if (isOAuth) {
                // OAuth requis : bouton vers la page d'autorisation du widget
                contentEl.innerHTML = `
                    <div class="widget-setup">
                        <div class="setup-icon">🔐</div>
                        <div class="setup-msg">Connexion requise pour ce widget.</div>
                        <a class="btn btn-sm btn-primary" href="widgets/${widgetId}/oauth.php">
                            Connecter mon compte
                        </a>
                    </div>`;
            } else if (isSetup) {
                contentEl.innerHTML = `
                    <div class="widget-setup">
                        <div class="setup-icon">⚙️</div>
                        <div class="setup-msg">Ce widget n'est pas encore configuré.</div>
                        <button class="btn btn-sm btn-primary" data-open-settings="${widgetId}">
                            Configurer
                        </button>
                    </div>`;
                contentEl.querySelector('[data-open-settings]')
                    ?.addEventListener('click', () => this._openSettings(widgetId));
            } else {
                contentEl.innerHTML = `
                    <div class="widget-error">
                        <div class="error-icon">⚠️</div>
                        <div class="error-msg">${this._escHtml(msg)}</div>
                    </div>`;
            }
        }
    },

    _createCard(widget) {
        const card = document.createElement('div');
        card.className = 'widget-card';
        card.id = `widget-card-${widget.id}`;

        const sizeLabel = { normal: 'N', lg: 'L', xl: 'XL' };
        const currentSize = widget.size ?? 'normal';

        card.innerHTML = `
            <div class="widget-header">
                <div class="widget-icon-wrap">
                    <span class="widget-icon">${this._renderIcon(widget.icon)}</span>
                    <span class="widget-badge hidden" id="badge-${widget.id}"></span>
                </div>
                <span class="widget-name">${this._escHtml(widget.name)}</span>
                <div class="widget-actions">
                    <button class="widget-btn widget-btn-size" title="Taille" data-size="${widget.id}" aria-label="Taille">
                        ${sizeLabel[currentSize] ?? 'N'}
                    </button>
                    <button class="widget-btn" title="Rafraîchir" data-refresh="${widget.id}" aria-label="Rafraîchir">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>
                        </svg>
                    </button>
                    <button class="widget-btn" title="Paramètres" data-settings="${widget.id}" aria-label="Paramètres">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="widget-content"></div>`;

        // Refresh button
        card.querySelector('[data-refresh]').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn.classList.add('spinning');
            const contentEl = card.querySelector('.widget-content');
            await this._renderWidgetContent(widget.id, contentEl);
            btn.classList.remove('spinning');
        });

        // Settings button
        card.querySelector('[data-settings]').addEventListener('click', () => {
            this._openSettings(widget.id);
        });

        // Size button — cycle N → L → XL → N
        card.querySelector('[data-size]').addEventListener('click', async (e) => {
            const btn    = e.currentTarget;
            const sizes  = ['normal', 'lg', 'xl'];
            const labels = { normal: 'N', lg: 'L', xl: 'XL' };
            const cur    = card.dataset.size || 'normal';
            const next   = sizes[(sizes.indexOf(cur) + 1) % sizes.length];

            card.dataset.size = next;
            card.classList.remove('widget-card--lg', 'widget-card--xl');
            if (next !== 'normal') card.classList.add(`widget-card--${next}`);
            btn.textContent = labels[next];

            await fetch(`api/widgets.php?action=size&widget=${encodeURIComponent(widget.id)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ size: next }),
            });
        });

        card.dataset.size = currentSize;

        return card;
    },

    /* --------------------------------------------------
       Badge de notification
    -------------------------------------------------- */
    _updateBadge(widgetId, cacheTs) {
        const badge = document.getElementById(`badge-${widgetId}`);
        if (!badge) return;

        if (cacheTs > this._lastVisit) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    },

    _showSkeleton(contentEl) {
        contentEl.innerHTML = `
            <div class="skeleton skeleton-line" style="width:80%"></div>
            <div class="skeleton skeleton-line" style="width:60%"></div>
            <div class="skeleton skeleton-line" style="width:70%"></div>`;
    },

    _loadScript(src) {
        return new Promise((resolve, reject) => {
            // Éviter de charger deux fois le même script
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const s = document.createElement('script');
            s.src = src;
            s.onload  = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    },

    /* --------------------------------------------------
       Settings modal
    -------------------------------------------------- */
    _openSettings(widgetId) {
        const widget = this._widgetList.find(w => w.id === widgetId);
        if (!widget) return;

        this._settingsWidget = widget;

        document.getElementById('modal-icon').innerHTML = this._renderIcon(widget.icon);
        document.getElementById('modal-title').textContent = `Paramètres — ${widget.name}`;

        // Récupérer les params depuis la config du widget via l'API
        fetch(`widgets/${widgetId}/config.json`)
            .then(r => r.json())
            .then(config => this._buildSettingsForm(widgetId, config.params ?? []))
            .catch(() => this._buildSettingsForm(widgetId, []));

        document.getElementById('settings-modal').classList.remove('hidden');
    },

    _buildSettingsForm(widgetId, params) {
        const container = document.getElementById('settings-fields');
        container.innerHTML = '';

        if (params.length === 0) {
            container.innerHTML = '<p style="color:var(--text-dim);font-size:13px;">Aucun paramètre pour ce widget.</p>';
            return;
        }

        params.forEach(param => {
            const group = document.createElement('div');
            group.className = 'field-group';

            const label = document.createElement('label');
            label.className = 'field-label' + (param.required ? ' field-required' : '');
            label.setAttribute('for', `field-${param.key}`);
            label.textContent = param.label;
            group.appendChild(label);

            if (param.type === 'select') {
                const wrapper = document.createElement('div');
                wrapper.className    = 'field-custom-select';
                wrapper.dataset.name = param.key;

                const current = document.createElement('div');
                current.className = 'field-cs-current';
                current.setAttribute('tabindex', '0');

                const dropdown = document.createElement('div');
                dropdown.className = 'field-cs-dropdown';

                const hidden = document.createElement('input');
                hidden.type  = 'hidden';
                hidden.name  = param.key;
                hidden.value = param.default ?? (param.options?.[0]?.value ?? '');

                const updateCurrent = (val) => {
                    const opt = (param.options ?? []).find(o => o.value === val);
                    current.textContent = opt?.label ?? val;
                    hidden.value = val;
                    dropdown.querySelectorAll('.field-cs-option').forEach(el => {
                        el.classList.toggle('is-selected', el.dataset.value === val);
                    });
                };

                (param.options ?? []).forEach(opt => {
                    const item = document.createElement('div');
                    item.className    = 'field-cs-option';
                    item.dataset.value = opt.value;
                    item.textContent  = opt.label;
                    item.addEventListener('mousedown', (e) => {
                        e.preventDefault(); // éviter la perte de focus
                        updateCurrent(opt.value);
                        wrapper.classList.remove('open');
                    });
                    dropdown.appendChild(item);
                });

                updateCurrent(hidden.value);

                current.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = wrapper.classList.contains('open');
                    document.querySelectorAll('.field-custom-select.open')
                            .forEach(s => s.classList.remove('open'));
                    if (!isOpen) wrapper.classList.add('open');
                });

                current.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        wrapper.classList.toggle('open');
                    } else if (e.key === 'Escape') {
                        wrapper.classList.remove('open');
                    }
                });

                wrapper.appendChild(current);
                wrapper.appendChild(dropdown);
                wrapper.appendChild(hidden);
                group.appendChild(wrapper);

            } else if (param.type === 'multiselect') {
                const wrap = document.createElement('div');
                wrap.className       = 'field-checkboxes';
                wrap.id              = `field-${param.key}`;
                wrap.dataset.name    = param.key;
                (param.options ?? []).forEach(opt => {
                    const lbl = document.createElement('label');
                    lbl.className = 'field-checkbox-item';
                    const cb = document.createElement('input');
                    cb.type         = 'checkbox';
                    cb.value        = opt.value;
                    cb.dataset.group = param.key;
                    lbl.appendChild(cb);
                    lbl.appendChild(document.createTextNode(' ' + opt.label));
                    wrap.appendChild(lbl);
                });
                group.appendChild(wrap);

            } else if (param.type === 'textarea') {
                const ta = document.createElement('textarea');
                ta.className   = 'field-input field-textarea';
                ta.id          = `field-${param.key}`;
                ta.name        = param.key;
                ta.placeholder = param.placeholder ?? '';
                ta.rows        = 4;
                if (param.required) ta.required = true;
                group.appendChild(ta);

            } else {
                const input = document.createElement('input');
                input.className   = 'field-input';
                input.id          = `field-${param.key}`;
                input.name        = param.key;
                input.type        = param.type === 'password' ? 'password' : 'text';
                input.placeholder = param.placeholder ?? '';
                if (param.required) input.required = true;
                group.appendChild(input);
            }

            container.appendChild(group);
        });

        // Charger les valeurs existantes
        fetch(`api/widgets.php?action=settings-get&widget=${encodeURIComponent(widgetId)}`)
            .then(r => r.json())
            .then(data => {
                if (!data.success || !data.settings) return;
                Object.entries(data.settings).forEach(([key, val]) => {
                    // text / password
                    const input = container.querySelector(`.field-input[name="${key}"]`);
                    if (input) { input.value = val; return; }
                    // custom select
                    const customSel = container.querySelector(`.field-custom-select[data-name="${key}"]`);
                    if (customSel && val) {
                        const hid = customSel.querySelector('input[type="hidden"]');
                        const cur = customSel.querySelector('.field-cs-current');
                        if (hid) hid.value = val;
                        const optEl = customSel.querySelector(`.field-cs-option[data-value="${CSS.escape(val)}"]`);
                        if (cur && optEl) {
                            cur.textContent = optEl.textContent;
                            customSel.querySelectorAll('.field-cs-option').forEach(el => {
                                el.classList.toggle('is-selected', el.dataset.value === val);
                            });
                        }
                        return;
                    }
                    // multiselect : cocher les cases correspondantes
                    const wrap = container.querySelector(`.field-checkboxes[data-name="${key}"]`);
                    if (wrap && val) {
                        val.split(',').forEach(v => {
                            const cb = wrap.querySelector(`input[value="${v.trim()}"]`);
                            if (cb) cb.checked = true;
                        });
                    }
                });
            })
            .catch(() => {});
    },

    async _submitSettings(e) {
        e.preventDefault();
        if (!this._settingsWidget) return;

        const widgetId = this._settingsWidget.id; // capturer avant que _closeModal() ne nullifie

        const form   = document.getElementById('settings-form');
        const inputs = form.querySelectorAll('.field-input[name]');
        const values = {};
        inputs.forEach(input => { values[input.name] = input.value; });

        // Collecter les valeurs des dropdowns custom
        form.querySelectorAll('.field-custom-select[data-name]').forEach(wrap => {
            const hid = wrap.querySelector('input[type="hidden"]');
            if (hid) values[hid.name] = hid.value;
        });

        // Collecter les valeurs multiselect (checkboxes) → chaîne séparée par virgules
        form.querySelectorAll('.field-checkboxes[data-name]').forEach(wrap => {
            const key     = wrap.dataset.name;
            const checked = [...wrap.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.value);
            values[key]   = checked.join(',');
        });

        const btn = document.getElementById('save-settings');
        btn.disabled    = true;
        btn.textContent = 'Sauvegarde…';

        try {
            await this._saveSettings(widgetId, values);
            this._closeModal();
            // Recharger le widget
            const card      = document.getElementById(`widget-card-${widgetId}`);
            const contentEl = card?.querySelector('.widget-content');
            if (contentEl) await this._renderWidgetContent(widgetId, contentEl);
        } catch (err) {
            alert('Erreur : ' + err.message);
        } finally {
            btn.disabled    = false;
            btn.textContent = 'Sauvegarder';
        }
    },

    _closeModal() {
        document.getElementById('settings-modal').classList.add('hidden');
        this._settingsWidget = null;
    },

    _bindModal() {
        document.getElementById('settings-form').addEventListener('submit', e => this._submitSettings(e));
        document.getElementById('cancel-settings').addEventListener('click', () => this._closeModal());
        document.getElementById('modal-close').addEventListener('click',    () => this._closeModal());
        document.getElementById('modal-overlay').addEventListener('click',  () => this._closeModal());
    },

    /* --------------------------------------------------
       Utils
    -------------------------------------------------- */
    _renderIcon(icon) {
        const i = icon ?? '🔧';
        return i.trimStart().startsWith('<svg') ? i : this._escHtml(i);
    },

    _escHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());
