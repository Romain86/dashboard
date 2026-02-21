window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.github = {

    _view: 'repos', // 'activity' | 'repos'

    render(data, container) {
        this._injectStyles();
        container.style.overflowY = 'auto';

        const { events, repos, username, calendar } = data;
        const calTab = calendar
            ? `<button class="gh-tab ${this._view === 'calendar' ? 'gh-tab--active' : ''}" data-view="calendar">Calendrier</button>`
            : '';

        container.innerHTML = `
            <div class="gh-tabs">
                <button class="gh-tab ${this._view === 'repos'    ? 'gh-tab--active' : ''}" data-view="repos">Dépôts</button>
                <button class="gh-tab ${this._view === 'activity' ? 'gh-tab--active' : ''}" data-view="activity">Activité</button>
                ${calTab}
                <a class="gh-profile" href="https://github.com/${this._esc(username)}" target="_blank" rel="noopener">@${this._esc(username)}</a>
            </div>
            <div class="gh-content"></div>`;

        container.querySelectorAll('.gh-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this._view = btn.dataset.view;
                container.querySelectorAll('.gh-tab').forEach(b => b.classList.toggle('gh-tab--active', b === btn));
                this._renderContent(container.querySelector('.gh-content'), data);
            });
        });

        this._renderContent(container.querySelector('.gh-content'), data);
    },

    _renderContent(el, data) {
        if (this._view === 'repos')    { el.innerHTML = this._buildRepos(data.repos);         return; }
        if (this._view === 'calendar') { el.innerHTML = this._buildCalendar(data.calendar);   return; }
        el.innerHTML = this._buildActivity(data.events);
    },

    // ----------------------------------------------------------------
    // Activité
    // ----------------------------------------------------------------

    _buildActivity(events) {
        if (!events?.length) return '<div class="gh-empty">Aucune activité publique récente</div>';

        return `<div class="gh-list">
            ${events.map(e => `
                <a class="gh-event" href="${this._esc(e.url)}" target="_blank" rel="noopener">
                    <span class="gh-event-icon">${this._eventIcon(e.type)}</span>
                    <div class="gh-event-body">
                        <span class="gh-event-desc">${this._esc(e.desc)}</span>
                        <span class="gh-event-repo">${this._esc(e.repo)}</span>
                    </div>
                    <span class="gh-event-age">${this._relTime(e.date)}</span>
                </a>`).join('')}
        </div>`;
    },

    _eventIcon(type) {
        const icons = {
            PushEvent:          '⬆',
            PullRequestEvent:   '↪',
            IssuesEvent:        '◎',
            CreateEvent:        '✦',
            WatchEvent:         '★',
            ForkEvent:          '⑂',
            IssueCommentEvent:  '💬',
            DeleteEvent:        '✕',
            ReleaseEvent:       '🏷',
        };
        return icons[type] ?? '·';
    },

    // ----------------------------------------------------------------
    // Dépôts
    // ----------------------------------------------------------------

    _buildRepos(repos) {
        if (!repos?.length) return '<div class="gh-empty">Aucun dépôt trouvé</div>';

        return `<div class="gh-repos">
            ${repos.map(r => `
                <a class="gh-repo" href="${this._esc(r.url)}" target="_blank" rel="noopener">
                    <div class="gh-repo-name">
                        ${r.private ? '<span class="gh-badge">privé</span>' : ''}
                        ${r.fork    ? '<span class="gh-badge">fork</span>'  : ''}
                        ${this._esc(r.name)}
                    </div>
                    ${r.description ? `<div class="gh-repo-desc">${this._esc(r.description)}</div>` : ''}
                    <div class="gh-repo-meta">
                        ${r.language ? `<span class="gh-lang"><span class="gh-lang-dot" style="background:${this._langColor(r.language)}"></span>${this._esc(r.language)}</span>` : ''}
                        ${r.stars ? `<span class="gh-stars">★ ${r.stars}</span>` : ''}
                        <span class="gh-updated">${this._relTime(r.updated_at)}</span>
                    </div>
                </a>`).join('')}
        </div>`;
    },

    _langColor(lang) {
        const colors = {
            JavaScript: '#f1e05a', TypeScript: '#3178c6', PHP:    '#4F5D95',
            Python:     '#3572A5', Ruby:       '#701516', HTML:   '#e34c26',
            CSS:        '#563d7c', Java:        '#b07219', Go:     '#00ADD8',
            Rust:       '#dea584', Vue:         '#41b883', Shell:  '#89e051',
            'C++':      '#f34b7d', 'C#':        '#178600', C:      '#555555',
        };
        return colors[lang] ?? '#888';
    },

    // ----------------------------------------------------------------
    // Calendrier de contributions
    // ----------------------------------------------------------------

    _buildCalendar(calendar) {
        if (!calendar) return '<div class="gh-empty">Token requis pour afficher le calendrier</div>';

        const { total, weeks } = calendar;

        const level = count => count === 0 ? 0 : count <= 3 ? 1 : count <= 9 ? 2 : count <= 19 ? 3 : 4;

        // Étiquettes de mois (une par changement de mois)
        let lastMonth = -1;
        const monthLabels = [];
        weeks.forEach((week, wi) => {
            const d = week.contributionDays[0]?.date;
            if (d) {
                const m = new Date(d).getMonth();
                if (m !== lastMonth) {
                    monthLabels.push({ col: wi + 1, name: new Date(d).toLocaleDateString('fr-FR', { month: 'short' }) });
                    lastMonth = m;
                }
            }
        });

        const weeksHtml = weeks.map(week => `
            <div class="gh-cal-week">
                ${week.contributionDays.map(day => `
                    <div class="gh-cal-day gh-cal-l${level(day.contributionCount)}"
                         title="${day.date} — ${day.contributionCount} contribution${day.contributionCount !== 1 ? 's' : ''}"></div>
                `).join('')}
            </div>`).join('');

        const monthsHtml = monthLabels.map(m =>
            `<span class="gh-cal-month" style="grid-column:${m.col}">${m.name}</span>`
        ).join('');

        return `
            <div class="gh-cal-header">
                <span class="gh-cal-total">${total} contributions cette année</span>
            </div>
            <div class="gh-cal-wrap">
                <div class="gh-cal-months">${monthsHtml}</div>
                <div class="gh-cal">${weeksHtml}</div>
            </div>`;
    },

    // ----------------------------------------------------------------
    // Utilitaires
    // ----------------------------------------------------------------

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
        if (document.getElementById('gh-styles')) return;
        const s = document.createElement('style');
        s.id = 'gh-styles';
        s.textContent = `
            .gh-tabs {
                display: flex;
                align-items: center;
                gap: 4px;
                margin-bottom: 12px;
                border-bottom: 1px solid rgba(255,255,255,0.07);
                padding-bottom: 10px;
            }
            .gh-tab {
                background: none;
                border: none;
                color: #555560;
                font-size: 12px;
                padding: 4px 10px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 120ms ease;
            }
            .gh-tab:hover { color: #c8c8d0; background: rgba(255,255,255,0.05); }
            .gh-tab--active { color: #c8c8d0; background: rgba(255,255,255,0.08); }
            .gh-profile {
                margin-left: auto;
                font-size: 11px;
                color: #555560;
                text-decoration: none;
                transition: color 120ms ease;
            }
            .gh-profile:hover { color: #7c6af7; }
            .gh-empty {
                font-size: 13px;
                color: #555560;
                text-align: center;
                padding: 20px 0;
            }
            /* Activité */
            .gh-list { display: flex; flex-direction: column; gap: 2px; }
            .gh-event {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 7px 6px;
                border-radius: 6px;
                text-decoration: none;
                transition: background 120ms ease;
            }
            .gh-event:hover { background: rgba(255,255,255,0.04); }
            .gh-event-icon {
                font-size: 13px;
                width: 20px;
                text-align: center;
                flex-shrink: 0;
                color: #555560;
                padding-top: 1px;
            }
            .gh-event-body { flex: 1; min-width: 0; }
            .gh-event-desc {
                display: block;
                font-size: 12px;
                color: #c8c8d0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .gh-event:hover .gh-event-desc { color: #7c6af7; }
            .gh-event-repo {
                display: block;
                font-size: 11px;
                color: #444450;
                margin-top: 1px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .gh-event-age {
                font-size: 10px;
                color: #444450;
                flex-shrink: 0;
                padding-top: 2px;
            }
            /* Dépôts */
            .gh-repos { display: flex; flex-direction: column; gap: 6px; }
            .gh-repo {
                display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 10px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.07);
                text-decoration: none;
                transition: border-color 120ms ease, background 120ms ease;
            }
            .gh-repo:hover { border-color: rgba(124,106,247,0.4); background: rgba(124,106,247,0.05); }
            .gh-repo-name {
                font-size: 13px;
                color: #c8c8d0;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            .gh-repo:hover .gh-repo-name { color: #7c6af7; }
            .gh-badge {
                font-size: 9px;
                padding: 1px 5px;
                border-radius: 3px;
                background: rgba(255,255,255,0.08);
                color: #666;
                font-weight: 400;
            }
            .gh-repo-desc {
                font-size: 11px;
                color: #555560;
                line-height: 1.4;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            .gh-repo-meta {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-top: 2px;
            }
            .gh-lang {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 11px;
                color: #555560;
            }
            .gh-lang-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                flex-shrink: 0;
            }
            .gh-stars { font-size: 11px; color: #555560; }
            .gh-updated { font-size: 11px; color: #444450; margin-left: auto; }
            /* Calendrier */
            .gh-cal-header {
                margin-bottom: 10px;
            }
            .gh-cal-total {
                font-size: 12px;
                color: #9898a6;
                font-weight: 500;
            }
            .gh-cal-wrap {
                overflow-x: auto;
                padding-bottom: 2px;
            }
            .gh-cal-months {
                display: grid;
                grid-template-columns: repeat(53, 11px);
                gap: 2px;
                margin-bottom: 3px;
            }
            .gh-cal-month {
                font-size: 9px;
                color: #444450;
                white-space: nowrap;
                grid-row: 1;
            }
            .gh-cal {
                display: flex;
                gap: 2px;
            }
            .gh-cal-week {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .gh-cal-day {
                width: 10px;
                height: 10px;
                border-radius: 2px;
                flex-shrink: 0;
            }
            .gh-cal-l0 { background: rgba(255,255,255,0.07); }
            .gh-cal-l1 { background: rgba(124,106,247,0.28); }
            .gh-cal-l2 { background: rgba(124,106,247,0.52); }
            .gh-cal-l3 { background: rgba(124,106,247,0.76); }
            .gh-cal-l4 { background: rgba(124,106,247,1.00); }
            .gh-cal-day:hover { opacity: 0.75; cursor: default; }
        `;
        document.head.appendChild(s);
    },
};
