window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.gmail = {

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

        container.innerHTML = `
            <div class="gm-header-bar">
                ${unread > 0 ? `<span class="gm-unread-badge">${unread} non lu${unread > 1 ? 's' : ''}</span>` : '<span class="gm-all-read">Tout lu</span>'}
                <a class="gm-open-link" href="https://mail.google.com" target="_blank">Ouvrir Gmail</a>
            </div>
            <div class="gm-list">
                ${emails.map(e => `
                    <a class="gm-email${e.unread ? ' gm-email--unread' : ''}"
                       href="mailto:${this._esc(e.from_email || '')}"
                       title="${this._esc(e.subject)}">
                        <div class="gm-email-dot">${e.unread ? '<span class="gm-dot"></span>' : ''}</div>
                        <div class="gm-email-body">
                            <div class="gm-email-top">
                                <span class="gm-sender">${this._esc(e.from)}</span>
                                <span class="gm-date">${this._relTime(e.date)}</span>
                            </div>
                            <div class="gm-subject">${this._esc(e.subject)}</div>
                        </div>
                    </a>
                `).join('')}
            </div>`;
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

            .gm-unread-badge {
                background: #EA4335;
                color: #fff;
                font-size: 11px;
                font-weight: 700;
                padding: 3px 8px;
                border-radius: 10px;
            }

            .gm-all-read {
                color: var(--success);
                font-size: 12px;
                font-weight: 500;
            }

            .gm-open-link {
                color: var(--text-dim);
                font-size: 11px;
                text-decoration: none;
                transition: color var(--transition);
            }
            .gm-open-link:hover { color: var(--text); }

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
