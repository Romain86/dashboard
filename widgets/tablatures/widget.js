window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.tablatures = {

    _container: null,
    _tabs: [],

    render(data, container) {
        this._injectStyles();
        this._container = container;
        this._tabs = data.tabs ?? [];
        container.style.maxHeight = '400px';
        container.style.overflowY = 'auto';
        this._showList();
    },

    // ----------------------------------------------------------------
    // Vues
    // ----------------------------------------------------------------

    _showList() {
        const c    = this._container;
        const tabs = this._tabs;

        const items = tabs.length
            ? tabs.map(t => `
                <div class="tab-item">
                    <a class="tab-link" href="${this._esc(t.source_url || '#')}" target="_blank" rel="noopener">
                        <span class="tab-title">${this._esc(t.title)}</span>
                        <span class="tab-meta">${this._esc(t.artist)}</span>
                    </a>
                    <button class="tab-btn tab-del-btn" data-id="${t.id}" title="Supprimer">×</button>
                </div>`).join('')
            : '<div class="tab-empty">Aucune tablature — ajoutez-en une !</div>';

        c.innerHTML = `
            <div class="tab-toolbar">
                <span class="tab-count">${tabs.length} tablature${tabs.length !== 1 ? 's' : ''}</span>
                <button class="tab-add-btn">+ Ajouter</button>
            </div>
            <div class="tab-list">${items}</div>`;

        c.querySelector('.tab-add-btn').addEventListener('click', () => this._showAdd());
        c.querySelectorAll('.tab-del-btn').forEach(btn => {
            btn.addEventListener('click', () => this._delete(parseInt(btn.dataset.id)));
        });
    },

    _showAdd() {
        const c = this._container;

        c.innerHTML = `
            <div class="tab-nav">
                <button class="tab-back-btn">← Annuler</button>
                <span style="font-size:13px;color:#c8c8d0">Nouvelle tablature</span>
            </div>
            <form class="tab-form">
                <input  class="tab-input" name="title"      placeholder="Titre *" required>
                <input  class="tab-input" name="artist"     placeholder="Artiste">
                <input  class="tab-input" name="tags"       placeholder="Tags (séparés par virgule)">
                <input  class="tab-input" name="source_url" placeholder="URL Ultimate Guitar *" required>
                <button type="submit" class="tab-save-btn">Enregistrer</button>
            </form>`;

        c.querySelector('.tab-back-btn').addEventListener('click', () => this._showList());

        c.querySelector('.tab-form').addEventListener('submit', async e => {
            e.preventDefault();
            const f = e.target;
            const payload = {
                sub:        'add',
                title:  f.title.value.trim(),
                artist: f.artist.value.trim(),
                tags:   f.tags.value.trim(),
                source_url: f.source_url.value.trim(),
            };
            if (!payload.title || !payload.source_url) return;
            const btn = f.querySelector('[type=submit]');
            btn.disabled = true;
            btn.textContent = 'Enregistrement…';
            await this._mutate(payload);
            this._showList();
        });
    },

    // ----------------------------------------------------------------
    // Actions
    // ----------------------------------------------------------------

    async _delete(id) {
        if (!confirm('Supprimer cette tablature ?')) return;
        await this._mutate({ sub: 'delete', id });
        this._showList();
    },

    async _mutate(payload) {
        try {
            const resp = await fetch('api/widgets.php?action=mutate&widget=tablatures', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });
            const json = await resp.json();
            if (json.success && json.data?.tabs !== undefined) {
                this._tabs = json.data.tabs;
            }
        } catch (err) {
            console.error('[tablatures] mutate error', err);
        }
    },

    // ----------------------------------------------------------------
    // Utilitaires
    // ----------------------------------------------------------------

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _injectStyles() {
        if (document.getElementById('tab-styles')) return;
        const s = document.createElement('style');
        s.id = 'tab-styles';
        s.textContent = `
            .tab-toolbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .tab-count {
                font-size: 11px;
                color: #555560;
                text-transform: uppercase;
                letter-spacing: .4px;
            }
            .tab-add-btn, .tab-save-btn {
                background: #7c6af7;
                color: #fff;
                border: none;
                border-radius: 6px;
                padding: 5px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: background 120ms ease;
            }
            .tab-add-btn:hover, .tab-save-btn:hover { background: #6a58e0; }
            .tab-save-btn:disabled { opacity: .6; cursor: default; }
            .tab-list { display: flex; flex-direction: column; gap: 2px; }
            .tab-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 4px 4px 0;
                border-radius: 6px;
            }
            .tab-link {
                flex: 1;
                min-width: 0;
                text-decoration: none;
                padding: 6px 8px;
                border-radius: 6px;
                transition: background 120ms ease;
            }
            .tab-link:hover { background: rgba(255,255,255,0.04); }
            .tab-title {
                display: block;
                font-size: 13px;
                color: #c8c8d0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                transition: color 120ms ease;
            }
            .tab-link:hover .tab-title { color: #7c6af7; }
            .tab-meta {
                display: block;
                font-size: 11px;
                color: #555560;
                margin-top: 2px;
            }
            .tab-btn {
                background: none;
                border: 1px solid rgba(255,255,255,0.1);
                color: #666;
                border-radius: 4px;
                width: 24px;
                height: 24px;
                cursor: pointer;
                font-size: 14px;
                transition: all 120ms ease;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                flex-shrink: 0;
            }
            .tab-del-btn:hover { border-color: #f56565; color: #f56565; }
            .tab-empty {
                font-size: 13px;
                color: #555560;
                text-align: center;
                padding: 24px 0;
            }
            .tab-nav {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
            }
            .tab-back-btn {
                background: none;
                border: 1px solid rgba(255,255,255,0.15);
                color: #888;
                border-radius: 6px;
                padding: 4px 10px;
                font-size: 12px;
                cursor: pointer;
                flex-shrink: 0;
                transition: all 120ms ease;
            }
            .tab-back-btn:hover { border-color: #7c6af7; color: #7c6af7; }
            .tab-form { display: flex; flex-direction: column; gap: 8px; }
            .tab-input {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 6px;
                color: #e2e2e2;
                padding: 8px 10px;
                font-size: 13px;
                outline: none;
                width: 100%;
                box-sizing: border-box;
                font-family: inherit;
                transition: border-color 120ms ease;
            }
            .tab-input:focus { border-color: #7c6af7; }
            .tab-input option { background: #1a1a22; }
        `;
        document.head.appendChild(s);
    },
};
