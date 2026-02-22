/* ============================================================
 *  Module : Notifications
 *  dashboard/assets/js/modules/notifications.js
 *
 *  Système de notifications in-app + desktop.
 *  Les widgets peuvent émettre des notifications via la clé
 *  _notifications dans leurs données API.
 * ============================================================ */

Object.assign(Dashboard, {

    _notifications: [],

    _initNotifications() {
        // Injecter les styles immédiatement (sinon le dropdown n'a pas de CSS)
        this._notifInjectStyles();

        // Charger l'historique depuis localStorage
        try {
            this._notifications = JSON.parse(localStorage.getItem('db_notifications') || '[]');
        } catch (_) {
            this._notifications = [];
        }

        // Bouton notification
        const btn = document.getElementById('btn-notif');
        if (!btn) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Demander la permission desktop au premier clic
            this._requestNotifPermission();
            const dd = document.getElementById('notif-dropdown');
            // Fermer les autres dropdowns
            document.getElementById('alert-dropdown')?.classList.add('hidden');
            dd.classList.toggle('hidden');
            if (!dd.classList.contains('hidden')) {
                this._renderNotifDropdown();
            }
        });

        document.addEventListener('click', () => {
            document.getElementById('notif-dropdown')?.classList.add('hidden');
        });

        this._updateNotifBadge();
    },

    /**
     * Traite les notifications émises par un widget.
     * Appelé par _renderWidgetContent après un render réussi.
     */
    _processWidgetNotifications(widgetId, data) {
        if (!data._notifications || !Array.isArray(data._notifications) || !data._notifications.length) return;

        const widget  = this._widgetList.find(w => w.id === widgetId);
        const existing = new Set(this._notifications.map(n => n.id));
        let hasNew = false;

        for (const notif of data._notifications) {
            const notifId = `${widgetId}_${notif.id || notif.title}`;
            if (existing.has(notifId)) continue;

            const entry = {
                id:         notifId,
                widgetId,
                widgetName: widget?.name ?? widgetId,
                widgetIcon: widget?.icon ?? '',
                title:      notif.title,
                message:    notif.message || '',
                timestamp:  Math.floor(Date.now() / 1000),
                read:       false,
            };

            this._notifications.unshift(entry);
            hasNew = true;

            // Desktop notification
            this._sendDesktopNotif(entry);

            // Toast
            this._showToast(entry);
        }

        if (hasNew) {
            // Limiter à 50
            this._notifications = this._notifications.slice(0, 50);
            localStorage.setItem('db_notifications', JSON.stringify(this._notifications));
            this._updateNotifBadge();
        }
    },

    _sendDesktopNotif(entry) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`${entry.widgetName} — ${entry.title}`, {
                body: entry.message,
            });
        }
    },

    _showToast(entry) {
        this._notifInjectStyles();
        let container = document.getElementById('notif-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notif-toast-container';
            container.className = 'notif-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'notif-toast';
        toast.innerHTML = `
            <span class="notif-toast-icon">${this._renderIcon(entry.widgetIcon)}</span>
            <div class="notif-toast-body">
                <div class="notif-toast-title">${this._escHtml(entry.title)}</div>
                <div class="notif-toast-msg">${this._escHtml(entry.message)}</div>
            </div>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('notif-toast-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, 5000);
    },

    _updateNotifBadge() {
        const badge = document.getElementById('notif-badge');
        if (!badge) return;
        const unread = this._notifications.filter(n => !n.read).length;
        badge.textContent = unread;
        badge.classList.toggle('hidden', unread === 0);
    },

    _renderNotifDropdown() {
        const dd = document.getElementById('notif-dropdown');
        if (!dd) return;

        if (this._notifications.length === 0) {
            dd.innerHTML = '<div class="notif-empty">Aucune notification</div>';
            return;
        }

        const unread = this._notifications.filter(n => !n.read).length;
        const headerHtml = unread > 0
            ? `<div class="notif-dd-header"><button class="notif-mark-read" id="notif-mark-read">Tout marquer comme lu</button></div>`
            : '';

        dd.innerHTML = headerHtml + this._notifications.slice(0, 20).map(n => `
            <div class="notif-dd-item${n.read ? '' : ' unread'}">
                <span class="notif-dd-icon">${this._renderIcon(n.widgetIcon)}</span>
                <div class="notif-dd-body">
                    <div class="notif-dd-title">${this._escHtml(n.title)}</div>
                    <div class="notif-dd-msg">${this._escHtml(n.message)}</div>
                    <div class="notif-dd-time">${this._relativeTime(n.timestamp)}</div>
                </div>
            </div>`).join('');

        dd.querySelector('#notif-mark-read')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this._notifications.forEach(n => n.read = true);
            localStorage.setItem('db_notifications', JSON.stringify(this._notifications));
            this._updateNotifBadge();
            this._renderNotifDropdown();
        });
    },

    _relativeTime(ts) {
        const diff = Math.floor(Date.now() / 1000) - ts;
        if (diff < 60)   return 'à l\'instant';
        if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
        return `il y a ${Math.floor(diff / 86400)}j`;
    },

    _requestNotifPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    },

    _notifInjectStyles() {
        if (document.getElementById('notif-styles')) return;
        const s = document.createElement('style');
        s.id = 'notif-styles';
        s.textContent = `
            /* Toast container */
            .notif-toast-container {
                position: fixed; bottom: 20px; right: 20px;
                z-index: 500; display: flex; flex-direction: column;
                gap: 8px; pointer-events: none;
            }
            .notif-toast {
                display: flex; align-items: flex-start; gap: 10px;
                background: var(--bg-surface, #16161d);
                border: 1px solid var(--border, rgba(255,255,255,0.08));
                border-radius: var(--radius-sm, 8px);
                padding: 12px 16px; min-width: 280px; max-width: 360px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.4);
                pointer-events: auto;
                animation: notif-slide-in 300ms ease;
            }
            .notif-toast-out { animation: notif-slide-out 300ms ease forwards; }
            @keyframes notif-slide-in { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
            @keyframes notif-slide-out { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(40px); } }
            .notif-toast-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
            .notif-toast-title { font-size: 13px; font-weight: 600; color: var(--text, #e2e2e8); }
            .notif-toast-msg { font-size: 12px; color: var(--text-dim, #9898a6); margin-top: 2px; }

            /* Dropdown */
            .notif-dropdown {
                position: absolute; top: 100%; right: 0; margin-top: 8px;
                width: 320px; max-height: 400px; overflow-y: auto;
                background: var(--bg-surface, #16161d);
                border: 1px solid var(--border, rgba(255,255,255,0.08));
                border-radius: var(--radius-sm, 8px);
                box-shadow: 0 12px 40px rgba(0,0,0,0.5);
                z-index: 300;
            }
            .notif-dropdown.hidden { display: none; }
            .notif-empty {
                padding: 16px; text-align: center;
                font-size: 13px; color: var(--text-dim, #9898a6);
            }
            .notif-dd-header {
                padding: 8px 12px; border-bottom: 1px solid var(--border);
                display: flex; justify-content: flex-end;
            }
            .notif-mark-read {
                background: none; border: none; color: var(--accent, #7c6af7);
                font-size: 12px; cursor: pointer; font-family: inherit;
            }
            .notif-mark-read:hover { text-decoration: underline; }
            .notif-dd-item {
                display: flex; gap: 10px; padding: 10px 12px;
                border-bottom: 1px solid rgba(255,255,255,0.04);
                transition: background var(--transition, 180ms ease);
            }
            .notif-dd-item:hover { background: var(--bg-hover, rgba(255,255,255,0.07)); }
            .notif-dd-item.unread { background: rgba(124, 106, 247, 0.06); }
            .notif-dd-icon { font-size: 16px; flex-shrink: 0; margin-top: 2px; }
            .notif-dd-title { font-size: 13px; font-weight: 600; color: var(--text, #e2e2e8); }
            .notif-dd-msg { font-size: 12px; color: var(--text-dim, #9898a6); margin-top: 1px; }
            .notif-dd-time { font-size: 11px; color: var(--muted, #555560); margin-top: 3px; }

            /* Badge */
            .notif-badge {
                position: absolute; top: -4px; right: -4px;
                background: var(--accent, #7c6af7);
                color: #fff; font-size: 10px; font-weight: 700;
                min-width: 16px; height: 16px; padding: 0 4px;
                border-radius: 8px;
                display: flex; align-items: center; justify-content: center;
                line-height: 1;
            }
            .notif-badge.hidden { display: none; }
        `;
        document.head.appendChild(s);
    },
});
