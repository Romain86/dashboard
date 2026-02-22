window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.phone = {

    render(data, container) {
        this._injectStyles();

        const notifs = data.notifications ?? [];
        const device = data.device ?? {};
        const error  = data.error;

        if (error && notifs.length === 0) {
            container.innerHTML = `<div class="ph-error">${this._esc(error)}</div>`;
            return;
        }

        // Grouper par app
        const grouped = this._groupByApp(notifs);

        container.innerHTML = `
            <div class="ph-device">
                <span class="ph-device-name">${this._esc(device.name || 'Téléphone')}</span>
                <span class="ph-device-count">${notifs.length} notif${notifs.length > 1 ? 's' : ''}</span>
            </div>
            ${notifs.length === 0
                ? '<div class="ph-empty">Aucune notification</div>'
                : `<div class="ph-list">${grouped.map(g => this._renderGroup(g)).join('')}</div>`
            }`;
    },

    _groupByApp(notifs) {
        const map = new Map();
        for (const n of notifs) {
            const key = n.app || n.package;
            if (!map.has(key)) map.set(key, { app: key, package: n.package, items: [] });
            map.get(key).items.push(n);
        }
        return Array.from(map.values());
    },

    _renderGroup(group) {
        const icon = this._appIcon(group.package);
        const collapsed = group.items.length > 3;
        const visible = collapsed ? group.items.slice(0, 3) : group.items;
        const hidden  = collapsed ? group.items.length - 3 : 0;

        return `
            <div class="ph-group">
                <div class="ph-group-header">
                    <span class="ph-app-icon">${icon}</span>
                    <span class="ph-app-name">${this._esc(group.app)}</span>
                    <span class="ph-app-count">${group.items.length}</span>
                </div>
                <div class="ph-group-items">
                    ${visible.map(n => this._renderNotif(n)).join('')}
                    ${hidden > 0 ? `<div class="ph-more" data-app="${this._esc(group.app)}">+ ${hidden} autre${hidden > 1 ? 's' : ''}</div>` : ''}
                </div>
            </div>`;
    },

    _renderNotif(n) {
        const timeStr = this._relativeTime(n.time);
        const title = n.title || '';
        const text  = n.text || '';

        return `
            <div class="ph-notif">
                <div class="ph-notif-content">
                    ${title ? `<span class="ph-notif-title">${this._esc(title)}</span>` : ''}
                    ${text && text !== title ? `<span class="ph-notif-text">${this._esc(text)}</span>` : ''}
                </div>
                <span class="ph-notif-time">${timeStr}</span>
            </div>`;
    },

    _appIcon(packageName) {
        const icons = {
            'com.whatsapp': '💬',
            'com.google.android.youtube': '▶️',
            'tv.twitch.android.app': '🟣',
            'com.google.android.apps.photos': '🖼️',
            'com.google.android.gm': '✉️',
            'com.instagram.android': '📷',
            'com.twitter.android': '🐦',
            'com.discord': '🎮',
            'com.spotify.music': '🎵',
            'com.google.android.apps.messaging': '💬',
            'com.snapchat.android': '👻',
            'org.telegram.messenger': '✈️',
            'com.facebook.orca': '💬',
            'com.facebook.katana': '👤',
        };
        return icons[packageName] || '🔔';
    },

    _relativeTime(tsMs) {
        if (!tsMs) return '';
        const now  = Date.now();
        const diff = Math.floor((now - tsMs) / 1000);

        if (diff < 0)     return 'maintenant';
        if (diff < 60)    return 'maintenant';
        if (diff < 3600)  return Math.floor(diff / 60) + ' min';
        if (diff < 86400) return Math.floor(diff / 3600) + ' h';
        const days = Math.floor(diff / 86400);
        if (days === 1) return 'hier';
        if (days < 7)   return days + ' j';
        return new Date(tsMs).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    },

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _injectStyles() {
        if (document.getElementById('ph-styles')) return;
        const s = document.createElement('style');
        s.id = 'ph-styles';
        s.textContent = `
            .ph-device {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .ph-device-name {
                font-size: 12px;
                font-weight: 600;
                color: var(--text);
            }
            .ph-device-count {
                font-size: 11px;
                color: var(--muted);
            }

            .ph-error {
                text-align: center;
                padding: 20px 0;
                color: var(--danger, #f87171);
                font-size: 12px;
            }
            .ph-empty {
                text-align: center;
                padding: 24px 0;
                color: var(--muted);
                font-size: 13px;
            }

            .ph-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 340px;
                overflow-y: auto;
            }
            .ph-list::-webkit-scrollbar { width: 4px; }
            .ph-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

            .ph-group {
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                overflow: hidden;
            }
            .ph-group-header {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 10px;
                background: rgba(255, 255, 255, 0.03);
            }
            .ph-app-icon {
                font-size: 14px;
                flex-shrink: 0;
            }
            .ph-app-name {
                font-size: 11px;
                font-weight: 600;
                color: var(--text);
                flex: 1;
            }
            .ph-app-count {
                font-size: 10px;
                color: var(--muted);
                background: var(--bg-hover);
                padding: 1px 6px;
                border-radius: 8px;
            }

            .ph-group-items {
                display: flex;
                flex-direction: column;
            }

            .ph-notif {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 8px;
                padding: 6px 10px;
                border-top: 1px solid var(--border);
                transition: background var(--transition);
            }
            .ph-notif:hover {
                background: var(--bg-hover);
            }

            .ph-notif-content {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 1px;
            }
            .ph-notif-title {
                font-size: 12px;
                font-weight: 600;
                color: var(--text);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .ph-notif-text {
                font-size: 11px;
                color: var(--text-dim);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .ph-notif-time {
                font-size: 10px;
                color: var(--muted);
                white-space: nowrap;
                flex-shrink: 0;
                padding-top: 2px;
            }

            .ph-more {
                padding: 4px 10px;
                border-top: 1px solid var(--border);
                font-size: 10px;
                color: var(--accent);
                cursor: pointer;
                text-align: center;
                transition: background var(--transition);
            }
            .ph-more:hover {
                background: var(--bg-hover);
            }
        `;
        document.head.appendChild(s);
    },
};
