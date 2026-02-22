/* ============================================================
 *  Module : Widgets — Montage et rendu des widgets
 *  dashboard/assets/js/modules/widgets.js
 *
 *  Création des cartes, chargement des scripts widget.js,
 *  rendu du contenu (données, erreurs, setup),
 *  skeleton loader, badges de notification.
 * ============================================================ */

Object.assign(Dashboard, {

    /** Monte un widget : crée la carte, charge le script, rend le contenu. */
    async _mountWidget(widget) {
        const grid = document.getElementById('widgets-grid');
        const card = this._createCard(widget);

        // Appliquer la taille sauvegardée
        if (widget.size && widget.size !== 'normal') {
            card.classList.add(`widget-card--${widget.size}`);
        }

        // Animation d'entrée avec stagger
        const existingCards = grid.querySelectorAll('.widget-card').length;
        card.style.animationDelay = `${existingCards * 60}ms`;
        card.classList.add('widget-card--entering');

        grid.appendChild(card);

        card.addEventListener('animationend', () => {
            card.classList.remove('widget-card--entering');
            card.style.animationDelay = '';
        }, { once: true });

        const content = card.querySelector('.widget-content');

        // Charger le widget.js du widget (peut ne pas exister)
        try {
            await this._loadScript(`widgets/${widget.id}/widget.js`);
        } catch (_) {
            // Pas de widget.js : on utilisera le renderer par défaut
        }

        await this._renderWidgetContent(widget.id, content);

        // Enregistrer pour l'auto-refresh
        this._observeWidget(card);
    },

    /** Charge les données et rend le contenu d'un widget. */
    async _renderWidgetContent(widgetId, contentEl, force = false) {
        this._showSkeleton(contentEl);

        try {
            const { data, cache_ts } = await this._fetchWidgetData(widgetId, force);
            const renderer = window.DashboardWidgets?.[widgetId];

            if (renderer && typeof renderer.render === 'function') {
                renderer.render(data, contentEl);
            } else {
                // Renderer par défaut : JSON brut
                contentEl.innerHTML = `<pre style="font-size:11px;color:var(--text-dim);overflow:auto;">${JSON.stringify(data, null, 2)}</pre>`;
            }

            this._updateBadge(widgetId, cache_ts);
            this._clearError(widgetId);
            this._processWidgetNotifications(widgetId, data);
        } catch (err) {
            const msg    = err.message ?? '';
            const msgLow = msg.toLowerCase();

            // isSetup : clé API / client_id manquant(s)
            const isSetup = msgLow.includes('non configuré')
                         || msgLow.includes('api key')
                         || /\bmanquants?\b/.test(msgLow);

            // isOAuth : app configurée mais token/session absent
            const isOAuth = !isSetup
                         && (msgLow.includes('autorisation') || msgLow.includes('manquante') || msgLow.includes('session'));

            if (isOAuth) {
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
                this._trackError(widgetId, msg);
            }
        }
    },

    /** Construit la carte HTML d'un widget avec ses boutons d'action. */
    _createCard(widget) {
        const card = document.createElement('div');
        card.className = 'widget-card';
        card.id = `widget-card-${widget.id}`;
        card.draggable = this._editMode;

        // Couleur accent brand par widget (glow hover + fond header)
        const _widgetAccents = {
            'meteo':      ['rgba(91,  180, 245, 0.30)', 'rgba(91,  180, 245, 0.06)'],
            'gcal':       ['rgba(66,  133, 244, 0.30)', 'rgba(66,  133, 244, 0.06)'],
            'github':     ['rgba(200, 200, 208, 0.22)', 'rgba(200, 200, 208, 0.04)'],
            'spotify':    ['rgba(29,  185, 84,  0.30)', 'rgba(29,  185, 84,  0.06)'],
            'twitch':     ['rgba(145, 71,  255, 0.30)', 'rgba(145, 71,  255, 0.06)'],
            'steam':      ['rgba(198, 212, 223, 0.22)', 'rgba(198, 212, 223, 0.04)'],
            'rss':        ['rgba(242, 101, 34,  0.30)', 'rgba(242, 101, 34,  0.06)'],
            'tmdb':       ['rgba(1,   180, 228, 0.30)', 'rgba(1,   180, 228, 0.06)'],
            'countdown':  ['rgba(124, 106, 247, 0.30)', 'rgba(124, 106, 247, 0.06)'],
            'tablatures': ['rgba(232, 176, 75,  0.30)', 'rgba(232, 176, 75,  0.06)'],
            'youtube':    ['rgba(255, 0,   0,   0.30)', 'rgba(255, 0,   0,   0.06)'],
            'parcels':    ['rgba(34,  197, 94,  0.30)', 'rgba(34,  197, 94,  0.06)'],
            'phone':      ['rgba(59,  130, 246, 0.30)', 'rgba(59,  130, 246, 0.06)'],
            'gmail':      ['rgba(234, 67,  53,  0.30)', 'rgba(234, 67,  53,  0.06)'],
        };
        const [accent, accentBg] = _widgetAccents[widget.id] ?? ['rgba(124, 106, 247, 0.25)', 'rgba(124, 106, 247, 0.05)'];
        card.style.setProperty('--widget-accent',    accent);
        card.style.setProperty('--widget-accent-bg', accentBg);

        const sizeLabel = { normal: 'N', lg: 'L', xl: 'XL' };
        const currentSize = widget.size ?? 'normal';

        card.innerHTML = `
            <div class="widget-header">
                <span class="widget-drag-handle" title="Déplacer">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <circle cx="3" cy="2" r="1.2"/><circle cx="9" cy="2" r="1.2"/>
                        <circle cx="3" cy="6" r="1.2"/><circle cx="9" cy="6" r="1.2"/>
                        <circle cx="3" cy="10" r="1.2"/><circle cx="9" cy="10" r="1.2"/>
                    </svg>
                </span>
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

        // Refresh
        card.querySelector('[data-refresh]').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            btn.classList.add('spinning');
            const contentEl = card.querySelector('.widget-content');
            await this._renderWidgetContent(widget.id, contentEl, true);
            btn.classList.remove('spinning');
            // Reset auto-refresh timer après refresh manuel
            this._autoRefreshLastTs[widget.id] = Date.now();
            const interval = this._autoRefreshIntervals?.[widget.id];
            if (interval) this._scheduleAutoRefresh(widget.id, interval * 1000);
        });

        // Settings
        card.querySelector('[data-settings]').addEventListener('click', () => {
            this._openSettings(widget.id);
        });

        // Size — cycle N → L → XL → N
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

    /** Charge dynamiquement un script widget.js (cache-busting par session). */
    _loadScript(src) {
        const versioned = `${src}?v=${this._pageVersion}`;
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[data-src="${src}"]`)) {
                resolve();
                return;
            }
            const s = document.createElement('script');
            s.src = versioned;
            s.dataset.src = src;
            s.onload  = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    },

    /** Affiche le badge « nouveau » si les données sont plus récentes que la dernière visite. */
    _updateBadge(widgetId, cacheTs) {
        const badge = document.getElementById(`badge-${widgetId}`);
        if (!badge) return;

        if (cacheTs > this._lastVisit) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    },

    /** Affiche un skeleton loader dans la zone de contenu. */
    _showSkeleton(contentEl) {
        contentEl.innerHTML = `
            <div class="skeleton skeleton-line" style="width:80%"></div>
            <div class="skeleton skeleton-line" style="width:60%"></div>
            <div class="skeleton skeleton-line" style="width:70%"></div>`;
    },
});
