window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.spotify = {

    _progressInterval: null,

    render(data, container) {
        this._injectStyles();
        clearInterval(this._progressInterval);

        if (data.is_playing && data.now_playing) {
            this._renderNowPlaying(data.now_playing, data.recent, container);
        } else {
            this._renderRecent(data.recent, container);
        }
    },

    _renderNowPlaying(track, recent, container) {
        const elapsed = Date.now() / 1000 - (track.fetched_at ?? 0);
        let progress  = Math.min(track.progress_ms + elapsed * 1000, track.duration_ms);

        container.innerHTML = `
            <div class="sp-now">
                <a class="sp-cover-link" href="${this._esc(track.url)}" data-sp-url="${this._esc(track.url)}">
                    ${track.image
                        ? `<img class="sp-cover" src="${this._esc(track.image)}" alt="" width="64" height="64">`
                        : `<div class="sp-cover sp-cover-placeholder">🎵</div>`}
                    <span class="sp-playing-badge">▶</span>
                </a>
                <div class="sp-track-info">
                    <a class="sp-track-name" href="${this._esc(track.url)}" data-sp-url="${this._esc(track.url)}">${this._esc(track.name)}</a>
                    <div class="sp-track-artist">${this._esc(track.artist)}</div>
                    <div class="sp-track-album">${this._esc(track.album)}</div>
                    <div class="sp-progress-wrap">
                        <div class="sp-progress-bar">
                            <div class="sp-progress-fill" id="sp-fill" style="width:${this._pct(progress, track.duration_ms)}%"></div>
                        </div>
                        <div class="sp-progress-times">
                            <span id="sp-elapsed">${this._fmt(progress)}</span>
                            <span>${this._fmt(track.duration_ms)}</span>
                        </div>
                    </div>
                </div>
            </div>
            ${recent.length ? this._renderRecentList(recent) : ''}`;

        this._bindSpotifyLinks(container);

        // Avancer la barre de progression en temps réel
        this._progressInterval = setInterval(() => {
            progress = Math.min(progress + 1000, track.duration_ms);
            const fill    = document.getElementById('sp-fill');
            const elapsed = document.getElementById('sp-elapsed');
            if (fill)    fill.style.width    = this._pct(progress, track.duration_ms) + '%';
            if (elapsed) elapsed.textContent = this._fmt(progress);
        }, 1000);
    },

    _renderRecent(recent, container) {
        if (!recent.length) {
            container.innerHTML = `
                <div class="sp-empty">
                    <span class="sp-empty-icon">🎵</span>
                    <span class="sp-empty-msg">Aucune écoute récente</span>
                </div>`;
            return;
        }
        container.innerHTML = `
            <div class="sp-recent-label">Dernière écoute</div>
            ${this._renderRecentList(recent)}`;
        this._bindSpotifyLinks(container);
    },

    _renderRecentList(tracks) {
        return `<div class="sp-recent">${tracks.map((t, i) => `
            <a class="sp-recent-item ${i === 0 ? 'sp-recent-first' : ''}"
               href="${this._esc(t.url)}" data-sp-url="${this._esc(t.url)}">
                ${t.image
                    ? `<img class="sp-recent-img" src="${this._esc(t.image)}" alt="" width="36" height="36">`
                    : `<div class="sp-recent-img sp-cover-placeholder">🎵</div>`}
                <div class="sp-recent-info">
                    <div class="sp-recent-name">${this._esc(t.name)}</div>
                    <div class="sp-recent-artist">${this._esc(t.artist)}</div>
                </div>
            </a>`).join('')}</div>`;
    },

    _spUri(webUrl) {
        const m = (webUrl ?? '').match(/open\.spotify\.com\/([a-z]+)\/([A-Za-z0-9]+)/);
        return m ? `spotify:${m[1]}:${m[2]}` : webUrl;
    },

    _bindSpotifyLinks(container) {
        container.addEventListener('click', e => {
            const link = e.target.closest('[data-sp-url]');
            if (!link) return;
            e.preventDefault();
            const webUrl = link.dataset.spUrl;
            window.location.href = this._spUri(webUrl);
            const t = setTimeout(() => window.open(webUrl, '_blank'), 1500);
            // Si l'app s'ouvre, la fenêtre perd le focus → on annule le fallback web
            const cancel = () => { clearTimeout(t); window.removeEventListener('blur', cancel); };
            window.addEventListener('blur', cancel);
        });
    },

    _pct(ms, total) {
        if (!total) return 0;
        return Math.min(100, (ms / total) * 100).toFixed(1);
    },

    _fmt(ms) {
        const s = Math.floor(ms / 1000);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    },

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _injectStyles() {
        if (document.getElementById('spotify-styles')) return;
        const s = document.createElement('style');
        s.id = 'spotify-styles';
        s.textContent = `
            /* ---- Now playing ---- */
            .sp-now {
                display: flex;
                gap: 12px;
                align-items: flex-start;
                margin-bottom: 14px;
            }
            .sp-cover-link { position: relative; flex-shrink: 0; display: block; }
            .sp-cover {
                width: 64px; height: 64px;
                border-radius: 6px;
                object-fit: cover;
                display: block;
                background: #1a1a22;
            }
            .sp-cover-placeholder {
                display: flex; align-items: center; justify-content: center;
                font-size: 24px; background: #1a1a22; border-radius: 6px;
            }
            .sp-playing-badge {
                position: absolute; bottom: 4px; right: 4px;
                background: #1DB954; color: #000;
                font-size: 8px; font-weight: 700;
                padding: 2px 4px; border-radius: 3px;
                line-height: 1;
            }
            .sp-track-info { flex: 1; min-width: 0; }
            .sp-track-name {
                display: block;
                font-size: 13px; font-weight: 600; color: #e2e2e8;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                text-decoration: none;
            }
            .sp-track-name:hover { color: #1DB954; }
            .sp-track-artist { font-size: 12px; color: #9898a6; margin-top: 2px;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .sp-track-album  { font-size: 11px; color: #555560; margin-top: 1px;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            /* ---- Progress ---- */
            .sp-progress-wrap { margin-top: 8px; }
            .sp-progress-bar {
                height: 3px; background: rgba(255,255,255,0.1);
                border-radius: 2px; overflow: hidden;
            }
            .sp-progress-fill {
                height: 100%; background: #1DB954;
                border-radius: 2px;
                transition: width 1s linear;
            }
            .sp-progress-times {
                display: flex; justify-content: space-between;
                font-size: 10px; color: #555560; margin-top: 3px;
                font-variant-numeric: tabular-nums;
            }

            /* ---- Recent ---- */
            .sp-recent-label {
                font-size: 11px; color: #555560;
                text-transform: uppercase; letter-spacing: .4px;
                margin-bottom: 6px;
            }
            .sp-recent { display: flex; flex-direction: column; gap: 6px; }
            .sp-recent-item {
                display: flex; gap: 8px; align-items: center;
                text-decoration: none;
                padding: 6px 8px; border-radius: 6px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.05);
                transition: background 150ms ease;
            }
            .sp-recent-item:hover { background: rgba(29,185,84,0.08); border-color: rgba(29,185,84,0.2); }
            .sp-recent-first { opacity: 1; }
            .sp-recent-img {
                width: 36px; height: 36px; border-radius: 4px;
                object-fit: cover; flex-shrink: 0; background: #1a1a22;
            }
            .sp-recent-info { min-width: 0; }
            .sp-recent-name {
                font-size: 12px; font-weight: 500; color: #e2e2e8;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            .sp-recent-artist { font-size: 11px; color: #9898a6;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

            /* ---- Empty ---- */
            .sp-empty {
                display: flex; flex-direction: column; align-items: center;
                gap: 8px; padding: 16px 0; color: #9898a6;
            }
            .sp-empty-icon { font-size: 28px; }
            .sp-empty-msg  { font-size: 13px; }
        `;
        document.head.appendChild(s);
    },
};
