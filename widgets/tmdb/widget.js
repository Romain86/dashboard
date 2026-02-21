window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.tmdb = {

    render(data, container) {
        this._injectStyles();
        container.closest('.widget-card')?.classList.add('widget-card--wide');
        container.style.maxHeight  = '400px';
        container.style.overflowY  = 'auto';

        const { items, filter, content_types } = data;
        const hasBoth = content_types?.length > 1;

        const filterLabels = {
            trending:    'Tendances du jour',
            now_playing: hasBoth ? 'En salle & À l\'antenne' : (content_types?.[0] === 'movie' ? 'En salle' : 'À l\'antenne'),
            popular:     'Populaires',
            top_rated:   'Mieux notés',
        };

        container.innerHTML = `
            <div class="tmdb-label">${filterLabels[filter] ?? filter}</div>
            <div class="tmdb-grid">
                ${items.map(item => this._renderItem(item)).join('')}
            </div>`;
    },

    _renderItem(item) {
        const poster = item.poster
            ? `<img class="tmdb-poster" src="${this._esc(item.poster)}" alt="" loading="lazy" width="80" height="120">`
            : `<div class="tmdb-poster tmdb-poster-placeholder">🎬</div>`;

        const rating = item.rating
            ? `<span class="tmdb-rating">★ ${item.rating}</span>`
            : '';

        const year = item.year ? `<span class="tmdb-year">${item.year}</span>` : '';

        return `
            <a class="tmdb-item" href="${this._esc(item.url)}" target="_blank" rel="noopener"
               title="${this._esc(item.overview)}">
                <div class="tmdb-poster-wrap">
                    ${poster}
                    ${rating}
                </div>
                <div class="tmdb-info">
                    <div class="tmdb-title">${this._esc(item.title)}</div>
                    ${year}
                </div>
            </a>`;
    },

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _injectStyles() {
        if (document.getElementById('tmdb-styles')) return;
        const s = document.createElement('style');
        s.id = 'tmdb-styles';
        s.textContent = `
            .tmdb-label {
                font-size: 11px;
                color: #555560;
                text-transform: uppercase;
                letter-spacing: .4px;
                margin-bottom: 10px;
            }
            .tmdb-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                gap: 10px;
            }
            .tmdb-item {
                text-decoration: none;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .tmdb-poster-wrap {
                position: relative;
                flex-shrink: 0;
            }
            .tmdb-poster {
                width: 100%;
                aspect-ratio: 2/3;
                object-fit: cover;
                border-radius: 6px;
                display: block;
                background: #1a1a22;
                transition: opacity 150ms ease;
            }
            .tmdb-item:hover .tmdb-poster { opacity: 0.8; }
            .tmdb-poster-placeholder {
                width: 100%;
                aspect-ratio: 2/3;
                background: #1a1a22;
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                color: #555560;
            }
            .tmdb-rating {
                position: absolute;
                bottom: 4px;
                right: 4px;
                background: rgba(0,0,0,0.75);
                color: #f6c90e;
                font-size: 9px;
                font-weight: 700;
                padding: 2px 4px;
                border-radius: 4px;
                line-height: 1;
                backdrop-filter: blur(4px);
            }
            .tmdb-info { padding: 0 1px; }
            .tmdb-title {
                font-size: 11px;
                color: #c8c8d0;
                line-height: 1.3;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .tmdb-item:hover .tmdb-title { color: #01b4e4; }
            .tmdb-year {
                font-size: 10px;
                color: #555560;
                display: block;
                margin-top: 2px;
            }
        `;
        document.head.appendChild(s);
    },
};
