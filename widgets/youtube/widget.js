window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.youtube = {

    render(data, container) {
        this._injectStyles();

        if (data.needs_auth) {
            container.innerHTML = `
                <div class="yt-auth">
                    <p>Connectez votre compte YouTube pour voir vos abonnements.</p>
                    <a class="yt-auth-btn" href="widgets/youtube/auth.php">Connecter mon compte</a>
                </div>`;
            return;
        }

        const videos = data.videos ?? [];

        if (!videos.length) {
            container.innerHTML = '<div class="yt-empty">Aucune vidéo récente</div>';
            return;
        }

        const lastVisit = parseInt(localStorage.getItem('dashboard_last_visit') || '0');

        container.innerHTML = `
            <div class="yt-grid">
                ${videos.map(v => {
                    const isNew = this._tsFromIso(v.published) > lastVisit;
                    return `
                    <a class="yt-card" href="${this._esc(v.url)}" target="_blank" title="${this._esc(v.title)}">
                        <div class="yt-thumb-wrap">
                            <img class="yt-thumb" src="${this._esc(v.thumbnail)}" alt="" loading="lazy">
                            ${isNew ? '<span class="yt-badge-new">NEW</span>' : ''}
                        </div>
                        <div class="yt-info">
                            <div class="yt-title">${this._esc(v.title)}</div>
                            <div class="yt-meta">
                                <span class="yt-channel">${this._esc(v.channel)}</span>
                                <span class="yt-date">${this._relTime(v.published)}</span>
                            </div>
                        </div>
                    </a>`;
                }).join('')}
            </div>`;
    },

    _tsFromIso(iso) {
        if (!iso) return 0;
        return Math.floor(new Date(iso).getTime() / 1000);
    },

    _relTime(iso) {
        if (!iso) return '';
        const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
        if (diff < 60)    return 'à l\'instant';
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
        if (document.getElementById('yt-styles')) return;
        const s = document.createElement('style');
        s.id = 'yt-styles';
        s.textContent = `
            .yt-auth {
                text-align: center;
                padding: 20px 0;
                color: var(--text-dim);
                font-size: 13px;
            }
            .yt-auth-btn {
                display: inline-block;
                margin-top: 10px;
                padding: 8px 18px;
                background: #FF0000;
                color: #fff;
                border-radius: var(--radius-sm);
                text-decoration: none;
                font-size: 13px;
                font-weight: 600;
                transition: opacity var(--transition);
            }
            .yt-auth-btn:hover { opacity: 0.85; }

            .yt-empty {
                text-align: center;
                padding: 24px 0;
                color: var(--muted);
                font-size: 13px;
            }

            .yt-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                gap: 12px;
                max-height: 480px;
                overflow-y: auto;
                scrollbar-width: thin;
                scrollbar-color: var(--border) transparent;
            }

            .yt-card {
                display: block;
                text-decoration: none;
                border-radius: var(--radius-sm);
                overflow: hidden;
                background: var(--bg-card);
                transition: background var(--transition), transform 150ms ease;
            }
            .yt-card:hover {
                background: var(--bg-hover);
                transform: translateY(-2px);
            }

            .yt-thumb-wrap {
                position: relative;
                aspect-ratio: 16 / 9;
                overflow: hidden;
                background: #000;
            }
            .yt-thumb {
                width: 100%;
                height: 100%;
                object-fit: cover;
                display: block;
            }

            .yt-badge-new {
                position: absolute;
                top: 6px;
                right: 6px;
                background: #FF0000;
                color: #fff;
                font-size: 9px;
                font-weight: 700;
                padding: 2px 5px;
                border-radius: 3px;
                letter-spacing: 0.5px;
            }

            .yt-info {
                padding: 8px 10px 10px;
            }
            .yt-title {
                font-size: 12px;
                font-weight: 600;
                color: var(--text);
                line-height: 1.3;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .yt-meta {
                display: flex;
                justify-content: space-between;
                margin-top: 4px;
                font-size: 11px;
                color: var(--text-dim);
            }
            .yt-channel {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 60%;
            }
            .yt-date {
                white-space: nowrap;
                color: var(--muted);
            }
        `;
        document.head.appendChild(s);
    },
};
