/* ============================================================
 *  Module : Auto-Refresh — Rafraîchissement automatique
 *  dashboard/assets/js/modules/autorefresh.js
 *
 *  Utilise IntersectionObserver pour suivre la visibilité des
 *  widgets et déclencher le refresh selon refresh_interval.
 * ============================================================ */

Object.assign(Dashboard, {

    _autoRefreshTimers:    {},
    _autoRefreshLastTs:    {},
    _autoRefreshObserver:  null,
    _autoRefreshIntervals: {},

    /** Initialise le système d'auto-refresh. */
    _initAutoRefresh() {
        for (const w of this._widgetList) {
            if (w.refresh_interval) {
                this._autoRefreshIntervals[w.id] = w.refresh_interval;
            }
        }

        const now = Date.now();
        for (const w of this._widgetList.filter(w => w.enabled)) {
            this._autoRefreshLastTs[w.id] = now;
        }

        this._autoRefreshObserver = new IntersectionObserver(
            (entries) => this._onVisibilityChange(entries),
            { threshold: 0.1 }
        );

        document.querySelectorAll('.widget-card').forEach(card => {
            this._autoRefreshObserver.observe(card);
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this._pauseAllAutoRefresh();
            } else {
                this._resumeVisibleAutoRefresh();
            }
        });
    },

    /** Réagit aux changements de visibilité d'un widget. */
    _onVisibilityChange(entries) {
        for (const entry of entries) {
            const widgetId = entry.target.id.replace('widget-card-', '');
            const interval = this._autoRefreshIntervals[widgetId];
            if (!interval) continue;

            if (entry.isIntersecting) {
                const lastTs    = this._autoRefreshLastTs[widgetId] || 0;
                const elapsed   = Date.now() - lastTs;
                const intervalMs = interval * 1000;

                if (elapsed >= intervalMs) {
                    this._doAutoRefresh(widgetId);
                } else {
                    this._scheduleAutoRefresh(widgetId, intervalMs - elapsed);
                }
            } else {
                this._clearAutoRefreshTimer(widgetId);
            }
        }
    },

    /** Programme un refresh unique après delayMs. */
    _scheduleAutoRefresh(widgetId, delayMs) {
        this._clearAutoRefreshTimer(widgetId);
        this._autoRefreshTimers[widgetId] = setTimeout(() => {
            this._doAutoRefresh(widgetId);
        }, delayMs);
    },

    /** Exécute le refresh d'un widget et reprogramme. */
    async _doAutoRefresh(widgetId) {
        const card = document.getElementById(`widget-card-${widgetId}`);
        if (!card) return;

        const contentEl = card.querySelector('.widget-content');
        if (!contentEl) return;

        await this._renderWidgetContent(widgetId, contentEl, false, true);
        this._autoRefreshLastTs[widgetId] = Date.now();

        const interval = this._autoRefreshIntervals[widgetId];
        if (interval) {
            this._scheduleAutoRefresh(widgetId, interval * 1000);
        }
    },

    _clearAutoRefreshTimer(widgetId) {
        if (this._autoRefreshTimers[widgetId]) {
            clearTimeout(this._autoRefreshTimers[widgetId]);
            delete this._autoRefreshTimers[widgetId];
        }
    },

    _pauseAllAutoRefresh() {
        for (const widgetId of Object.keys(this._autoRefreshTimers)) {
            this._clearAutoRefreshTimer(widgetId);
        }
    },

    _resumeVisibleAutoRefresh() {
        document.querySelectorAll('.widget-card').forEach(card => {
            const widgetId  = card.id.replace('widget-card-', '');
            const interval  = this._autoRefreshIntervals[widgetId];
            if (!interval) return;

            const rect = card.getBoundingClientRect();
            const inViewport = rect.top < window.innerHeight && rect.bottom > 0;

            if (inViewport) {
                const lastTs     = this._autoRefreshLastTs[widgetId] || 0;
                const elapsed    = Date.now() - lastTs;
                const intervalMs = interval * 1000;

                if (elapsed >= intervalMs) {
                    this._doAutoRefresh(widgetId);
                } else {
                    this._scheduleAutoRefresh(widgetId, intervalMs - elapsed);
                }
            }
        });
    },

    /** Observe une carte nouvellement montée. */
    _observeWidget(cardEl) {
        if (this._autoRefreshObserver) {
            this._autoRefreshObserver.observe(cardEl);
        }
        const widgetId = cardEl.id.replace('widget-card-', '');
        this._autoRefreshLastTs[widgetId] = Date.now();
    },

    /** Arrête l'observation et le timer d'un widget retiré. */
    _unobserveWidget(widgetId) {
        const card = document.getElementById(`widget-card-${widgetId}`);
        if (card && this._autoRefreshObserver) {
            this._autoRefreshObserver.unobserve(card);
        }
        this._clearAutoRefreshTimer(widgetId);
        delete this._autoRefreshLastTs[widgetId];
    },

    /** Stoppe tout l'auto-refresh (avant changement d'onglet). */
    _stopAllAutoRefresh() {
        this._pauseAllAutoRefresh();
        if (this._autoRefreshObserver) {
            this._autoRefreshObserver.disconnect();
        }
    },

    /** Redémarre l'auto-refresh après changement d'onglet. */
    _restartAutoRefresh() {
        this._autoRefreshTimers = {};
        this._autoRefreshLastTs = {};
        this._autoRefreshIntervals = {};

        for (const w of this._widgetList) {
            if (w.refresh_interval) {
                this._autoRefreshIntervals[w.id] = w.refresh_interval;
            }
        }

        const now = Date.now();
        for (const w of this._widgetList.filter(w => w.enabled)) {
            this._autoRefreshLastTs[w.id] = now;
        }

        if (!this._autoRefreshObserver) {
            this._autoRefreshObserver = new IntersectionObserver(
                (entries) => this._onVisibilityChange(entries),
                { threshold: 0.1 }
            );
        }

        document.querySelectorAll('.widget-card').forEach(card => {
            this._autoRefreshObserver.observe(card);
        });
    },
});
