window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.gcal = {

    render(data, container) {
        this._injectStyles();
        container.style.overflowY = 'auto';

        if (data.needs_auth) {
            this._renderAuth(container, data.auth_error);
            return;
        }

        this._renderEvents(container, data.events, data.days_ahead);
    },

    // ----------------------------------------------------------------
    // Vue "authentification requise"
    // ----------------------------------------------------------------

    _renderAuth(container, error) {
        container.innerHTML = `
            <div class="gcal-auth">
                <div class="gcal-auth-icon">📅</div>
                <div class="gcal-auth-msg">Connectez votre Google Calendar</div>
                ${error ? `<div class="gcal-auth-error">${this._esc(error)}</div>` : ''}
                <a class="gcal-auth-btn" href="widgets/gcal/auth.php" target="_blank">
                    Connecter Google Calendar
                </a>
                <div class="gcal-auth-hint">Une fois connecté, rafraîchissez le widget.</div>
            </div>`;
    },

    // ----------------------------------------------------------------
    // Vue principale — liste des événements
    // ----------------------------------------------------------------

    _renderEvents(container, events, daysAhead) {
        if (!events?.length) {
            container.innerHTML = `
                <div class="gcal-header">Prochains ${daysAhead} jours</div>
                <div class="gcal-empty">Aucun événement à venir</div>`;
            return;
        }

        container.innerHTML = `
            <div class="gcal-header">Prochains ${daysAhead} jours</div>
            <div class="gcal-list">
                ${events.map(e => this._renderEvent(e)).join('')}
            </div>`;
    },

    _renderEvent(e) {
        const date     = this._formatDate(e);
        const time     = e.all_day ? 'Toute la journée' : this._formatTime(e.start);
        const location = e.location ? `<span class="gcal-location">📍 ${this._esc(e.location)}</span>` : '';
        const dot      = `<span class="gcal-dot" style="background:${this._eventColor(e.color)}"></span>`;

        return `
            <a class="gcal-event" href="${this._esc(e.url)}" target="_blank" rel="noopener">
                <div class="gcal-event-left">
                    ${dot}
                    <div class="gcal-event-body">
                        <span class="gcal-event-title">${this._esc(e.title)}</span>
                        <span class="gcal-event-time">${time}${location ? ' · ' : ''}${location}</span>
                    </div>
                </div>
                <span class="gcal-countdown ${e.days === 0 ? 'gcal-today' : ''}">${date}</span>
            </a>`;
    },

    _formatDate(e) {
        if (e.days === 0) return "Aujourd'hui";
        if (e.days === 1) return 'Demain';
        try {
            // Pour les événements tout-jour, éviter le décalage UTC
            const d = e.all_day
                ? new Date(e.start.replace(/-/g, '/'))
                : new Date(e.start);
            return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        } catch {
            return '';
        }
    },

    _formatTime(dateStr) {
        try {
            return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    },

    _eventColor(colorId) {
        // Google Calendar color IDs → hex
        const colors = {
            '1':  '#7986cb', '2':  '#33b679', '3':  '#8e24aa',
            '4':  '#e67c73', '5':  '#f6bf26', '6':  '#f4511e',
            '7':  '#039be5', '8':  '#616161', '9':  '#3f51b5',
            '10': '#0b8043', '11': '#d50000',
        };
        return colors[colorId] ?? '#4285F4';
    },

    // ----------------------------------------------------------------
    // Utilitaires
    // ----------------------------------------------------------------

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _injectStyles() {
        if (document.getElementById('gcal-styles')) return;
        const s = document.createElement('style');
        s.id = 'gcal-styles';
        s.textContent = `
            .gcal-header {
                font-size: 11px;
                color: #555560;
                text-transform: uppercase;
                letter-spacing: .4px;
                margin-bottom: 10px;
            }
            .gcal-empty {
                font-size: 13px;
                color: #555560;
                text-align: center;
                padding: 20px 0;
            }
            /* Auth */
            .gcal-auth {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                padding: 20px 0;
                text-align: center;
            }
            .gcal-auth-icon { font-size: 32px; }
            .gcal-auth-msg  { font-size: 13px; color: #c8c8d0; }
            .gcal-auth-error { font-size: 11px; color: #f56565; }
            .gcal-auth-btn {
                display: inline-block;
                background: #4285F4;
                color: #fff;
                border-radius: 6px;
                padding: 8px 16px;
                font-size: 13px;
                text-decoration: none;
                transition: background 120ms ease;
            }
            .gcal-auth-btn:hover { background: #3367d6; }
            .gcal-auth-hint { font-size: 11px; color: #444450; }
            /* Événements */
            .gcal-list { display: flex; flex-direction: column; gap: 2px; }
            .gcal-event {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                padding: 8px 6px;
                border-radius: 6px;
                text-decoration: none;
                transition: background 120ms ease;
            }
            .gcal-event:hover { background: rgba(255,255,255,0.04); }
            .gcal-event-left {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 0;
                flex: 1;
            }
            .gcal-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            .gcal-event-body { min-width: 0; }
            .gcal-event-title {
                display: block;
                font-size: 13px;
                color: #c8c8d0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                transition: color 120ms ease;
            }
            .gcal-event:hover .gcal-event-title { color: #4285F4; }
            .gcal-event-time {
                display: block;
                font-size: 11px;
                color: #555560;
                margin-top: 2px;
            }
            .gcal-location { color: #444450; }
            .gcal-countdown {
                font-size: 12px;
                color: #555560;
                flex-shrink: 0;
                min-width: 70px;
                text-align: right;
            }
            .gcal-today {
                color: #4285F4;
                font-weight: 600;
            }
        `;
        document.head.appendChild(s);
    },
};
