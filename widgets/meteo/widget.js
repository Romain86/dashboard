window.DashboardWidgets = window.DashboardWidgets || {};

window.DashboardWidgets.meteo = {

    render(data, container) {
        this._injectStyles();

        const iconUrl = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;

        container.innerHTML = `
            <div class="meteo">
                <div class="meteo-hero">
                    <img class="meteo-icon" src="${iconUrl}" alt="${this._esc(data.description)}" width="64" height="64">
                    <div class="meteo-temp-block">
                        <span class="meteo-temp">${data.temp}°</span>
                        <span class="meteo-feels">ressenti ${data.feels_like}°</span>
                    </div>
                </div>

                <div class="meteo-desc">${this._esc(data.description)}</div>
                <div class="meteo-location">📍 ${this._esc(data.city)}, ${this._esc(data.country)}</div>

                <div class="meteo-grid">
                    <div class="meteo-cell">
                        <span class="meteo-cell-label">Humidité</span>
                        <span class="meteo-cell-value">${data.humidity}%</span>
                    </div>
                    <div class="meteo-cell">
                        <span class="meteo-cell-label">Vent</span>
                        <span class="meteo-cell-value">${data.wind_speed} km/h</span>
                    </div>
                    <div class="meteo-cell">
                        <span class="meteo-cell-label">Min / Max</span>
                        <span class="meteo-cell-value">${data.temp_min}° / ${data.temp_max}°</span>
                    </div>
                    <div class="meteo-cell">
                        <span class="meteo-cell-label">Lever / Coucher</span>
                        <span class="meteo-cell-value">${this._esc(data.sunrise)} — ${this._esc(data.sunset)}</span>
                    </div>
                </div>
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
            .meteo { display: flex; flex-direction: column; gap: 10px; }

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

            .meteo-temp-block {
                display: flex;
                flex-direction: column;
            }

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
        `;
        document.head.appendChild(style);
    },
};
