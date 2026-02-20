window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.twitch = {

    render(data, container) {
        this._injectStyles();

        if (!data.streams || data.streams.length === 0) {
            container.innerHTML = `
                <div class="twitch-empty">
                    <span class="twitch-empty-icon">😴</span>
                    <span class="twitch-empty-msg">Aucun suivi en direct</span>
                </div>`;
            return;
        }

        const items = data.streams.map(s => `
            <a class="twitch-stream" href="${this._esc(s.url)}" target="_blank" rel="noopener">
                <div class="twitch-thumb-wrap">
                    <img class="twitch-thumb" src="${this._esc(s.thumbnail)}" alt="" loading="lazy" width="80" height="45">
                    <span class="twitch-live-dot"></span>
                </div>
                <div class="twitch-info">
                    <div class="twitch-name">${this._esc(s.user_name)}</div>
                    <div class="twitch-game">${this._esc(s.game_name)}</div>
                    <div class="twitch-title">${this._esc(s.title)}</div>
                    <div class="twitch-viewers">${this._formatViewers(s.viewer_count)}</div>
                </div>
            </a>`).join('');

        container.innerHTML = `
            <div class="twitch-header-count">
                <span class="twitch-badge">${data.count}</span> en live
            </div>
            <div class="twitch-list">${items}</div>`;
    },

    _formatViewers(n) {
        if (n >= 1000) return (n / 1000).toFixed(1).replace('.', ',') + 'k spectateurs';
        return n + ' spectateurs';
    },

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    _injectStyles() {
        if (document.getElementById('twitch-styles')) return;
        const style = document.createElement('style');
        style.id = 'twitch-styles';
        style.textContent = `
            .twitch-header-count {
                font-size: 12px;
                color: #9898a6;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .twitch-badge {
                background: #9147ff;
                color: #fff;
                font-size: 11px;
                font-weight: 700;
                padding: 1px 7px;
                border-radius: 20px;
            }

            .twitch-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .twitch-stream {
                display: flex;
                gap: 10px;
                align-items: flex-start;
                text-decoration: none;
                padding: 8px;
                border-radius: 8px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                transition: background 150ms ease, border-color 150ms ease;
            }

            .twitch-stream:hover {
                background: rgba(145, 71, 255, 0.1);
                border-color: rgba(145, 71, 255, 0.3);
            }

            .twitch-thumb-wrap {
                position: relative;
                flex-shrink: 0;
            }

            .twitch-thumb {
                display: block;
                width: 80px;
                height: 45px;
                object-fit: cover;
                border-radius: 4px;
                background: #1a1a22;
            }

            .twitch-live-dot {
                position: absolute;
                top: 4px;
                left: 4px;
                width: 7px;
                height: 7px;
                background: #f56565;
                border-radius: 50%;
                box-shadow: 0 0 6px #f56565;
                animation: pulse-live 2s ease-in-out infinite;
            }

            @keyframes pulse-live {
                0%, 100% { opacity: 1; transform: scale(1); }
                50%       { opacity: 0.6; transform: scale(1.3); }
            }

            .twitch-info {
                flex: 1;
                min-width: 0;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .twitch-name {
                font-size: 13px;
                font-weight: 600;
                color: #e2e2e8;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .twitch-game {
                font-size: 11px;
                color: #9147ff;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .twitch-title {
                font-size: 11px;
                color: #9898a6;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .twitch-viewers {
                font-size: 11px;
                color: #555560;
                margin-top: 2px;
            }

            .twitch-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 16px 0;
                color: #9898a6;
            }

            .twitch-empty-icon { font-size: 28px; }
            .twitch-empty-msg  { font-size: 13px; }
        `;
        document.head.appendChild(style);
    },
};
