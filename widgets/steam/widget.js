window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.steam = {

    render(data, container) {
        this._injectStyles();

        const statusColor = data.in_game ? '#57cbde'
            : data.status === 'En ligne' ? '#57cbde'
            : '#6b6b6b';

        container.innerHTML = `
            <div class="st-profile">
                <a href="${this._esc(data.profile_url)}" target="_blank" rel="noopener" class="st-avatar-link">
                    <img class="st-avatar" src="${this._esc(data.avatar)}" alt="" width="48" height="48">
                    <span class="st-status-dot" style="background:${statusColor}" title="${this._esc(data.status)}"></span>
                </a>
                <div class="st-profile-info">
                    <a class="st-name" href="${this._esc(data.profile_url)}" target="_blank" rel="noopener">
                        ${this._esc(data.name)}
                    </a>
                    <div class="st-status" style="color:${statusColor}">${this._esc(data.status)}</div>
                </div>
            </div>

            ${data.in_game && data.game ? `
            <a class="st-ingame" href="${this._esc(data.game.url)}" target="_blank" rel="noopener">
                <img class="st-ingame-img" src="${this._esc(data.game.image)}" alt=""
                     onerror="this.style.display='none'" loading="lazy">
                <div class="st-ingame-info">
                    <div class="st-ingame-label">En train de jouer</div>
                    <div class="st-ingame-name">${this._esc(data.game.name)}</div>
                </div>
            </a>` : ''}

            ${data.recent_games.length ? `
            <div class="st-recent-label">Joués récemment</div>
            <div class="st-games">
                ${data.recent_games.map(g => `
                <a class="st-game" href="${this._esc(g.url)}" target="_blank" rel="noopener">
                    <img class="st-game-img" src="${this._esc(g.image)}" alt="${this._esc(g.name)}"
                         onerror="this.style.display='none'" loading="lazy">
                    <div class="st-game-info">
                        <div class="st-game-name">${this._esc(g.name)}</div>
                        <div class="st-game-time">
                            ${this._fmtHours(g.playtime_2weeks)} cette semaine
                            · ${this._fmtHours(g.playtime_forever)} au total
                        </div>
                    </div>
                </a>`).join('')}
            </div>` : `<div class="st-no-recent">Aucun jeu récent</div>`}`;
    },

    _fmtHours(minutes) {
        if (!minutes) return '0h';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return h > 0 ? `${h}h${m > 0 ? m : ''}` : `${m}min`;
    },

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _injectStyles() {
        if (document.getElementById('steam-styles')) return;
        const s = document.createElement('style');
        s.id = 'steam-styles';
        s.textContent = `
            /* ---- Profil ---- */
            .st-profile {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
            }
            .st-avatar-link { position: relative; flex-shrink: 0; display: block; }
            .st-avatar {
                width: 48px; height: 48px;
                border-radius: 6px;
                display: block;
                background: #1a1a22;
            }
            .st-status-dot {
                position: absolute;
                bottom: -2px; right: -2px;
                width: 10px; height: 10px;
                border-radius: 50%;
                border: 2px solid var(--bg-base, #0f0f13);
            }
            .st-profile-info { min-width: 0; }
            .st-name {
                display: block;
                font-size: 14px; font-weight: 600; color: #c6d4df;
                text-decoration: none;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .st-name:hover { color: #fff; }
            .st-status { font-size: 12px; margin-top: 2px; }

            /* ---- En jeu ---- */
            .st-ingame {
                display: flex;
                gap: 10px;
                align-items: center;
                background: rgba(87, 203, 222, 0.07);
                border: 1px solid rgba(87, 203, 222, 0.2);
                border-radius: 8px;
                overflow: hidden;
                margin-bottom: 12px;
                text-decoration: none;
                transition: background 150ms ease;
            }
            .st-ingame:hover { background: rgba(87, 203, 222, 0.13); }
            .st-ingame-img {
                width: 96px; height: 45px;
                object-fit: cover; flex-shrink: 0;
                background: #1a1a22;
            }
            .st-ingame-info { padding: 4px 0; min-width: 0; }
            .st-ingame-label { font-size: 10px; color: #57cbde; text-transform: uppercase; letter-spacing: .4px; }
            .st-ingame-name  { font-size: 13px; font-weight: 600; color: #e2e2e8;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            /* ---- Jeux récents ---- */
            .st-recent-label {
                font-size: 11px; color: #555560;
                text-transform: uppercase; letter-spacing: .4px;
                margin-bottom: 6px;
            }
            .st-games { display: flex; flex-direction: column; gap: 6px; }
            .st-game {
                display: flex; gap: 8px; align-items: center;
                text-decoration: none;
                padding: 6px 8px; border-radius: 6px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.05);
                transition: background 150ms ease;
            }
            .st-game:hover { background: rgba(102,192,244,0.08); border-color: rgba(102,192,244,0.2); }
            .st-game-img {
                width: 64px; height: 30px;
                object-fit: cover; border-radius: 4px;
                flex-shrink: 0; background: #1a1a22;
            }
            .st-game-info { min-width: 0; }
            .st-game-name { font-size: 12px; font-weight: 500; color: #c6d4df;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .st-game-time { font-size: 11px; color: #555560; margin-top: 1px; }

            .st-no-recent { font-size: 12px; color: #555560; padding: 8px 0; }
        `;
        document.head.appendChild(s);
    },
};
