window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.spotify = {

    _progressInterval: null,
    _lastData: null,

    render(data, container) {
        this._injectStyles();
        clearInterval(this._progressInterval);
        this._lastData = data;

        if (data.is_playing && data.now_playing) {
            this._renderNowPlaying(data, container);
        } else {
            this._renderIdle(data, container);
        }
    },

    _renderNowPlaying(data, container) {
        const track = data.now_playing;
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
            ${this._renderControls(data)}
            ${data.recent?.length ? `<div class="sp-scroll">${this._renderRecentList(data.recent)}</div>` : ''}`;

        this._bindSpotifyLinks(container);
        this._bindControls(container, data);

        this._progressInterval = setInterval(() => {
            progress = Math.min(progress + 1000, track.duration_ms);
            const fill    = document.getElementById('sp-fill');
            const elapsedEl = document.getElementById('sp-elapsed');
            if (fill)      fill.style.width    = this._pct(progress, track.duration_ms) + '%';
            if (elapsedEl) elapsedEl.textContent = this._fmt(progress);

            // Morceau terminé → rafraîchir pour passer au suivant
            if (progress >= track.duration_ms) {
                clearInterval(this._progressInterval);
                setTimeout(() => this._triggerRefresh(), 2000);
            }
        }, 1000);

    },

    _renderIdle(data, container) {
        const recent = data.recent ?? [];
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
            ${this._renderControls(data)}
            <div class="sp-scroll">${this._renderRecentList(recent)}</div>`;
        this._bindSpotifyLinks(container);
        this._bindControls(container, data);
    },

    // ---- Contrôles de lecture ----

    _renderControls(data) {
        const disabled = !data.has_device ? ' sp-ctrl-disabled' : '';
        const shuffleActive = data.shuffle_state ? ' sp-ctrl-active' : '';
        const playIcon = data.is_playing ? this._icons.pause : this._icons.play;
        const playAction = data.is_playing ? 'pause' : 'play';
        const prevDisabled = data.can_skip_prev === false ? ' sp-ctrl-off' : '';
        const nextDisabled = data.can_skip_next === false ? ' sp-ctrl-off' : '';
        const device = data.device ? `<span class="sp-device">${this._esc(data.device)}</span>` : '';

        return `
            <div class="sp-controls${disabled}">
                <div class="sp-ctrl-row">
                    <button class="sp-ctrl-btn" data-action="restart" title="Revenir au début">
                        ${this._icons.restart}
                    </button>
                    <button class="sp-ctrl-btn${prevDisabled}" data-action="previous" title="Précédent"${prevDisabled ? ' disabled' : ''}>
                        ${this._icons.previous}
                    </button>
                    <button class="sp-ctrl-btn sp-ctrl-play" data-action="${playAction}" title="${data.is_playing ? 'Pause' : 'Lecture'}">
                        ${playIcon}
                    </button>
                    <button class="sp-ctrl-btn${nextDisabled}" data-action="next" title="Suivant"${nextDisabled ? ' disabled' : ''}>
                        ${this._icons.next}
                    </button>
                    <button class="sp-ctrl-btn${shuffleActive}" data-action="shuffle" title="Lecture aléatoire">
                        ${this._icons.shuffle}
                    </button>
                </div>
                ${device}
            </div>`;
    },

    _icons: {
        previous: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',
        play:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
        pause:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>',
        next:     '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6z"/></svg>',
        shuffle:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
        restart:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    },

    _bindControls(container, data) {
        container.querySelectorAll('.sp-ctrl-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (container.querySelector('.sp-controls.sp-ctrl-disabled')) return;

                const action = btn.dataset.action;
                btn.classList.add('sp-ctrl-loading');

                try {
                    const body = { action };
                    // Pour shuffle, toggle l'état actuel
                    if (action === 'shuffle') {
                        body.state = !data.shuffle_state;
                    }

                    const res = await fetch('api/widgets.php?action=mutate&widget=spotify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    });
                    const json = await res.json();

                    if (json.success) {
                        setTimeout(() => this._triggerRefresh(), 300);
                    }
                } catch (err) {
                    console.error('Spotify control error:', err);
                } finally {
                    btn.classList.remove('sp-ctrl-loading');
                }
            });
        });
    },

    // ---- Helpers existants ----

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
            const cancel = () => { clearTimeout(t); window.removeEventListener('blur', cancel); };
            window.addEventListener('blur', cancel);
        });
    },

    _triggerRefresh() {
        const card = document.getElementById('widget-card-spotify');
        if (!card) return;
        const contentEl = card.querySelector('.widget-content');
        if (contentEl && window.Dashboard?._renderWidgetContent) {
            window.Dashboard._renderWidgetContent('spotify', contentEl, true, true);
        }
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
                margin-bottom: 10px;
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

            /* ---- Controls ---- */
            .sp-controls {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                padding: 8px 0;
                margin-bottom: 10px;
                border-top: 1px solid rgba(255,255,255,0.05);
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .sp-ctrl-row {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .sp-ctrl-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border: none;
                background: transparent;
                color: var(--text-dim, #9898a6);
                border-radius: 50%;
                cursor: pointer;
                transition: background 150ms ease, color 150ms ease, transform 100ms ease;
            }
            .sp-ctrl-btn:hover {
                background: rgba(255,255,255,0.08);
                color: var(--text, #e2e2e8);
            }
            .sp-ctrl-btn:active { transform: scale(0.9); }
            .sp-ctrl-play {
                width: 38px;
                height: 38px;
                background: #1DB954;
                color: #000;
            }
            .sp-ctrl-play:hover {
                background: #1ed760;
                color: #000;
            }
            .sp-ctrl-active {
                color: #1DB954;
            }
            .sp-ctrl-active:hover { color: #1ed760; }
            .sp-ctrl-off {
                opacity: 0.25;
                pointer-events: none;
            }
            .sp-ctrl-loading {
                opacity: 0.5;
                pointer-events: none;
            }
            .sp-ctrl-disabled {
                opacity: 0.3;
                pointer-events: none;
            }
            .sp-device {
                font-size: 10px;
                color: var(--muted, #555560);
                text-align: center;
            }

            /* ---- Scroll zone ---- */
            .sp-scroll {
                max-height: 220px;
                overflow-y: auto;
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
