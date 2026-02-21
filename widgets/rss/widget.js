window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.rss = {

    render(data, container) {
        this._injectStyles();

        const { items, errors } = data;

        let html = '';

        if (errors?.length) {
            html += `<div class="rss-errors">⚠ ${errors.length} flux inaccessible(s)</div>`;
        }

        html += items.map(item => this._renderItem(item)).join('');

        container.innerHTML = `<div class="rss-list">${html}</div>`;
    },

    _renderItem(item) {
        const age  = this._relTime(item.date);
        const src  = item.source ? `<span class="rss-source">${this._esc(item.source)}</span>` : '';
        const sep  = item.source && age ? ' · ' : '';

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
        if (diff <    60) return 'à l\'instant';
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
            .rss-list {
                display: flex;
                flex-direction: column;
            }
            .rss-item {
                display: flex;
                flex-direction: column;
                gap: 2px;
                padding: 9px 0;
                border-bottom: 1px solid rgba(255,255,255,0.06);
                text-decoration: none;
                transition: background 120ms ease;
                border-radius: 4px;
                padding-left: 4px;
                padding-right: 4px;
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
            .rss-source {
                color: #6b6b7a;
            }
            .rss-errors {
                font-size: 11px;
                color: #f56565;
                margin-bottom: 8px;
            }
        `;
        document.head.appendChild(s);
    },
};
