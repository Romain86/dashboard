window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.rss = {

    render(data, container) {
        this._injectStyles();

        const items   = data.items   ?? [];
        const sources = data.sources ?? [];
        const max     = data.max     ?? 10;
        const errors  = data.errors  ?? [];

        container.style.display       = 'flex';
        container.style.flexDirection = 'column';

        const errHtml = errors.length
            ? `<div class="rss-errors">⚠ ${errors.length} flux inaccessible(s)</div>`
            : '';

        // Barre de filtres (Tous + un bouton par source)
        const filterHtml = sources.length > 1
            ? `<div class="rss-filters">
                <button class="rss-filter rss-filter-active" data-source="">Tous</button>
                ${sources.map(s => `<button class="rss-filter" data-source="${this._esc(s)}">${this._esc(s)}</button>`).join('')}
               </div>`
            : '';

        container.innerHTML = `
            ${errHtml}
            ${filterHtml}
            <div class="rss-panels">
                <div class="rss-list" id="rss-list-content"></div>
            </div>`;

        // Afficher les articles avec le filtre actif
        const listEl = container.querySelector('#rss-list-content');
        let activeSource = '';

        const showItems = () => {
            const filtered = activeSource
                ? items.filter(i => i.source === activeSource)
                : items;
            listEl.innerHTML = filtered.slice(0, max).map(i => this._renderItem(i)).join('');
        };

        showItems();

        // Gestion des clics de filtre
        const filtersEl = container.querySelector('.rss-filters');
        if (filtersEl) {
            filtersEl.addEventListener('click', e => {
                const btn = e.target.closest('.rss-filter');
                if (!btn) return;
                activeSource = btn.dataset.source;
                filtersEl.querySelectorAll('.rss-filter').forEach(b =>
                    b.classList.toggle('rss-filter-active', b.dataset.source === activeSource)
                );
                showItems();
            });
        }
    },

    _renderItem(item) {
        const age = this._relTime(item.date);
        const src = item.source ? `<span class="rss-source">${this._esc(item.source)}</span>` : '';
        const sep = item.source && age ? ' · ' : '';

        return `
            <a class="rss-item" href="${this._esc(item.link)}" target="_blank" rel="noopener"
               title="${this._esc(item.desc)}">
                <span class="rss-title">${this._esc(item.title)}</span>
                <span class="rss-meta">${src}${sep}${age}</span>
            </a>`;
    },

    _relTime(ts) {
        if (!ts) return '';
        const diff = Math.floor(Date.now() / 1000) - ts;
        if (diff <    60) return "à l'instant";
        if (diff <  3600) return `${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
        return `${Math.floor(diff / 86400)} j`;
    },

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _injectStyles() {
        if (document.getElementById('rss-styles')) return;
        const s = document.createElement('style');
        s.id = 'rss-styles';
        s.textContent = `
            /* Filtres par source */
            .rss-filters {
                display: flex;
                gap: 4px;
                margin-bottom: 10px;
                border-bottom: 1px solid rgba(255,255,255,0.08);
                padding-bottom: 8px;
                flex-shrink: 0;
                flex-wrap: wrap;
            }
            .rss-filter {
                background: none;
                border: none;
                color: #555560;
                font-size: 12px;
                cursor: pointer;
                padding: 4px 10px;
                border-radius: 4px;
                transition: color 120ms, background 120ms;
                font-family: inherit;
                white-space: nowrap;
            }
            .rss-filter:hover { color: #c8c8d0; background: rgba(255,255,255,0.04); }
            .rss-filter-active { color: #7c6af7 !important; background: rgba(124,106,247,0.12) !important; }
            /* Panneau scrollable */
            .rss-panels {
                overflow-y: auto;
                flex: 1;
            }
            /* Liste */
            .rss-list {
                display: flex;
                flex-direction: column;
            }
            .rss-item {
                display: flex;
                flex-direction: column;
                gap: 2px;
                padding: 9px 4px;
                border-bottom: 1px solid rgba(255,255,255,0.06);
                text-decoration: none;
                transition: background 120ms ease;
                border-radius: 4px;
            }
            .rss-item:last-child { border-bottom: none; }
            .rss-item:hover { background: rgba(255,255,255,0.04); }
            .rss-title {
                font-size: 13px;
                color: #c8c8d0;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .rss-item:hover .rss-title { color: #7c6af7; }
            .rss-meta {
                font-size: 11px;
                color: #555560;
            }
            .rss-source { color: #6b6b7a; }
            .rss-errors {
                font-size: 11px;
                color: #f56565;
                margin-bottom: 8px;
                flex-shrink: 0;
            }
        `;
        document.head.appendChild(s);
    },
};
