window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.gmail = {

    _APPS: {
        outlook:     { label: 'Outlook',      url: 'ms-outlook://emails/' },
        outlook_web: { label: 'Outlook Web',  url: 'https://outlook.live.com/mail/' },
        gmail:       { label: 'Gmail',        url: 'https://mail.google.com' },
    },

    _getApp() {
        return localStorage.getItem('gmail-widget-app') || 'outlook';
    },

    _setApp(key) {
        localStorage.setItem('gmail-widget-app', key);
    },

    render(data, container) {
        this._injectStyles();

        if (data.needs_auth) {
            container.innerHTML = `
                <div class="gm-auth">
                    <p>Connectez votre compte Gmail pour voir vos emails.</p>
                    <a class="gm-auth-btn" href="widgets/gmail/auth.php">Connecter mon compte</a>
                </div>`;
            return;
        }

        const emails = data.emails ?? [];
        const unread = data.unread_count ?? 0;

        if (!emails.length) {
            container.innerHTML = '<div class="gm-empty">Aucun email récent</div>';
            return;
        }

        const currentApp = this._getApp();
        const app = this._APPS[currentApp] || this._APPS.outlook;

        container.innerHTML = `
            <div class="gm-header-bar">
                ${unread > 0 ? `<span class="gm-unread-badge">${unread} non lu${unread > 1 ? 's' : ''}</span>` : '<span class="gm-all-read">Tout lu</span>'}
                <div class="gm-actions">
                    <a class="gm-open-link" href="${app.url}" target="_blank">Ouvrir ${app.label}</a>
                    <div class="gm-app-picker">
                        <button class="gm-app-btn" title="Changer d'application mail">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        <div class="gm-app-menu hidden">
                            ${Object.entries(this._APPS).map(([key, a]) => `
                                <button class="gm-app-option${key === currentApp ? ' gm-app-active' : ''}" data-app="${key}">${a.label}</button>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
            <div class="gm-list">
                ${emails.map(e => `
                    <div class="gm-email${e.unread ? ' gm-email--unread' : ''}"
                         title="${this._esc(e.subject)}">
                        <div class="gm-email-dot">${e.unread ? '<span class="gm-dot"></span>' : ''}</div>
                        <div class="gm-email-body">
                            <div class="gm-email-top">
                                <span class="gm-sender">${this._esc(e.from)}</span>
                                <span class="gm-date">${this._relTime(e.date)}</span>
                            </div>
                            <div class="gm-subject">${this._esc(e.subject)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>`;

        // Toggle du menu
        const btn = container.querySelector('.gm-app-btn');
        const menu = container.querySelector('.gm-app-menu');
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            menu.classList.toggle('hidden');
        });

        // Choix d'une app
        menu.querySelectorAll('.gm-app-option').forEach(opt => {
            opt.addEventListener('click', (ev) => {
                ev.stopPropagation();
                this._setApp(opt.dataset.app);
                this.render(data, container);
            });
        });

        // Fermer le menu au clic extérieur
        document.addEventListener('click', () => menu.classList.add('hidden'), { once: true });
    },

    _relTime(ts) {
        if (!ts) return '';
        const diff = Math.floor(Date.now() / 1000) - ts;
        if (diff < 60)    return 'maintenant';
        if (diff < 3600)  return Math.floor(diff / 60) + ' min';
        if (diff < 86400) return Math.floor(diff / 3600) + ' h';
        const days = Math.floor(diff / 86400);
        if (days === 1) return 'hier';
        if (days < 7)   return days + ' j';
        if (days < 30)  return Math.floor(days / 7) + ' sem';
        return Math.floor(days / 30) + ' mois';
    },

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _injectStyles() {
        if (document.getElementById('gm-styles')) return;
        const s = document.createElement('style');
        s.id = 'gm-styles';
        s.textContent = `
            .gm-auth {
                text-align: center;
                padding: 20px 0;
                color: var(--text-dim);
                font-size: 13px;
            }
            .gm-auth-btn {
                display: inline-block;
                margin-top: 10px;
                padding: 8px 18px;
                background: #EA4335;
                color: #fff;
                border-radius: var(--radius-sm);
                text-decoration: none;
                font-size: 13px;
                font-weight: 600;
                transition: opacity var(--transition);
            }
            .gm-auth-btn:hover { opacity: 0.85; }

            .gm-empty {
                text-align: center;
                padding: 24px 0;
                color: var(--muted);
                font-size: 13px;
            }

            .gm-header-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 10px;
                border-bottom: 1px solid var(--border);
            }

            .gm-actions {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .gm-open-link {
                color: var(--text-dim);
                font-size: 11px;
                text-decoration: none;
                transition: color var(--transition);
            }
            .gm-open-link:hover { color: var(--text); }

            .gm-app-picker { position: relative; }

            .gm-app-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                border: none;
                background: transparent;
                color: var(--muted);
                border-radius: 4px;
                cursor: pointer;
                transition: background var(--transition), color var(--transition);
            }
            .gm-app-btn:hover {
                background: var(--bg-hover);
                color: var(--text);
            }

            .gm-app-menu {
                position: absolute;
                top: calc(100% + 4px);
                right: 0;
                background: var(--bg-surface);
                border: 1px solid var(--border);
                border-radius: 6px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.4);
                z-index: 50;
                overflow: hidden;
                min-width: 120px;
            }

            .gm-app-option {
                display: block;
                width: 100%;
                padding: 7px 12px;
                border: none;
                background: none;
                color: var(--text-dim);
                font-size: 12px;
                font-family: inherit;
                text-align: left;
                cursor: pointer;
                transition: background var(--transition), color var(--transition);
            }
            .gm-app-option:hover {
                background: var(--bg-hover);
                color: var(--text);
            }
            .gm-app-option.gm-app-active {
                color: var(--accent);
                font-weight: 600;
            }

            .gm-list {
                max-height: 340px;
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color: var(--border) transparent;
            }

            .gm-email {
                display: flex;
                align-items: flex-start;
                gap: 8px;
                padding: 9px 8px;
                border-radius: var(--radius-sm);
                text-decoration: none;
                transition: background var(--transition);
                border-bottom: 1px solid rgba(255,255,255,0.03);
            }
            .gm-email:last-child { border-bottom: none; }
            .gm-email:hover { background: var(--bg-hover); }

            .gm-email--unread { background: rgba(234, 67, 53, 0.05); }
            .gm-email--unread:hover { background: rgba(234, 67, 53, 0.10); }

            .gm-email-dot {
                width: 8px;
                flex-shrink: 0;
                padding-top: 6px;
            }

            .gm-dot {
                display: block;
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #EA4335;
            }

            .gm-email-body {
                flex: 1;
                min-width: 0;
                overflow: hidden;
            }

            .gm-email-top {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                gap: 8px;
            }

            .gm-sender {
                font-size: 12px;
                font-weight: 600;
                color: var(--text);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .gm-email--unread .gm-sender { font-weight: 700; }

            .gm-date {
                font-size: 11px;
                color: var(--muted);
                white-space: nowrap;
                flex-shrink: 0;
            }

            .gm-subject {
                font-size: 12px;
                color: var(--text-dim);
                margin-top: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .gm-email--unread .gm-subject {
                color: var(--text);
                font-weight: 500;
            }
        `;
        document.head.appendChild(s);
    },
};
