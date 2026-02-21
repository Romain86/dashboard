window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.meteo = {

    render(data, container) {
        this._injectStyles();

        const slides = [{ label: 'Maintenant', d: data }];
        if (data.middle)   slides.push({ label: data.middle.label,   d: data.middle });
        if (data.tomorrow) slides.push({ label: 'Demain',            d: data.tomorrow });
        if (data.forecast?.length) {
            for (const day of data.forecast) slides.push({ label: day.label, d: day });
        }

        const n   = slides.length;
        const pct = 100 / n;

        container.innerHTML = `
            <div class="meteo-carousel">
                <div class="meteo-slides" style="width:${n * 100}%">
                    ${slides.map(s => `
                        <div class="meteo-slide" style="width:${pct}%">
                            ${this._renderSlide(s.d, s.label)}
                        </div>`).join('')}
                </div>
                ${n > 1 ? `
                <div class="meteo-nav">
                    <button class="meteo-nav-btn meteo-prev">&#8249;</button>
                    <div class="meteo-dots">
                        ${slides.map((_, i) => `<span class="meteo-dot${i === 0 ? ' active' : ''}" data-idx="${i}"></span>`).join('')}
                    </div>
                    <button class="meteo-nav-btn meteo-next">&#8250;</button>
                </div>` : ''}
            </div>`;

        if (n <= 1) return;

        let current = 0;
        const slidesEl = container.querySelector('.meteo-slides');
        const dots     = container.querySelectorAll('.meteo-dot');

        const goTo = (idx) => {
            current = (idx + n) % n;
            slidesEl.style.transform = `translateX(-${current * pct}%)`;
            dots.forEach((d, i) => d.classList.toggle('active', i === current));
        };

        dots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.idx)));
        container.querySelector('.meteo-prev').addEventListener('click', () => goTo(current - 1));
        container.querySelector('.meteo-next').addEventListener('click', () => goTo(current + 1));
    },

    _renderSlide(d, label) {
        const iconUrl  = `https://openweathermap.org/img/wn/${d.icon}@2x.png`;
        const location = d.city
            ? `<div class="meteo-location">📍 ${this._esc(d.city)}, ${this._esc(d.country)}</div>`
            : '';

        let gridCells = `
            <div class="meteo-cell">
                <span class="meteo-cell-label">Humidité</span>
                <span class="meteo-cell-value">${d.humidity}%</span>
            </div>
            <div class="meteo-cell">
                <span class="meteo-cell-label">Vent</span>
                <span class="meteo-cell-value">${d.wind_speed} km/h</span>
            </div>`;

        if (d.temp_min !== undefined) {
            gridCells += `
            <div class="meteo-cell">
                <span class="meteo-cell-label">Min / Max</span>
                <span class="meteo-cell-value">${d.temp_min}° / ${d.temp_max}°</span>
            </div>`;
        }
        if (d.sunrise) {
            gridCells += `
            <div class="meteo-cell">
                <span class="meteo-cell-label">Lever / Coucher</span>
                <span class="meteo-cell-value">${this._esc(d.sunrise)} — ${this._esc(d.sunset)}</span>
            </div>`;
        }

        return `
            <div class="meteo">
                <div class="meteo-slide-label">${this._esc(label)}</div>
                <div class="meteo-hero">
                    <img class="meteo-icon" src="${iconUrl}" alt="${this._esc(d.description)}" width="64" height="64">
                    <div class="meteo-temp-block">
                        <span class="meteo-temp">${d.temp}°</span>
                        <span class="meteo-feels">ressenti ${d.feels_like}°</span>
                    </div>
                </div>
                <div class="meteo-desc">${this._esc(d.description)}</div>
                ${location}
                <div class="meteo-grid">${gridCells}</div>
            </div>`;
    },

    _esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    _injectStyles() {
        if (document.getElementById('meteo-styles')) return;
        const style = document.createElement('style');
        style.id = 'meteo-styles';
        style.textContent = `
            .meteo-carousel {
                display: flex;
                flex-direction: column;
                gap: 12px;
                overflow: hidden;
            }

            .meteo-slides {
                display: flex;
                transition: transform 320ms cubic-bezier(.4,0,.2,1);
            }

            .meteo-slide { flex-shrink: 0; }

            .meteo { display: flex; flex-direction: column; gap: 10px; }

            .meteo-slide-label {
                font-size: 11px;
                color: #7c6af7;
                text-transform: uppercase;
                letter-spacing: .5px;
                font-weight: 600;
            }

            .meteo-hero {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .meteo-icon {
                width: 64px;
                height: 64px;
                filter: drop-shadow(0 0 8px rgba(124, 106, 247, 0.4));
            }

            .meteo-temp-block { display: flex; flex-direction: column; }

            .meteo-temp {
                font-size: 42px;
                font-weight: 700;
                line-height: 1;
                letter-spacing: -2px;
                color: #e2e2e8;
            }

            .meteo-feels {
                font-size: 12px;
                color: #9898a6;
                margin-top: 2px;
            }

            .meteo-desc {
                font-size: 14px;
                color: #c4c4ce;
                font-weight: 500;
            }

            .meteo-location {
                font-size: 12px;
                color: #9898a6;
            }

            .meteo-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-top: 4px;
            }

            .meteo-cell {
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.07);
                border-radius: 8px;
                padding: 8px 10px;
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .meteo-cell-label {
                font-size: 11px;
                color: #666672;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            .meteo-cell-value {
                font-size: 13px;
                font-weight: 600;
                color: #e2e2e8;
            }

            .meteo-nav {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }

            .meteo-nav-btn {
                background: none;
                border: none;
                color: #555560;
                font-size: 22px;
                cursor: pointer;
                line-height: 1;
                padding: 0 4px;
                transition: color 120ms ease;
            }
            .meteo-nav-btn:hover { color: #c4c4ce; }

            .meteo-dots {
                display: flex;
                gap: 6px;
                align-items: center;
            }

            .meteo-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #333340;
                cursor: pointer;
                transition: background 200ms ease, transform 200ms ease;
            }
            .meteo-dot.active {
                background: #7c6af7;
                transform: scale(1.3);
            }
        `;
        document.head.appendChild(style);
    },
};
