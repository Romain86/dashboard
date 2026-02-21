/* ============================================================
 *  Module : Settings — Modale de paramètres
 *  dashboard/assets/js/modules/settings.js
 *
 *  Ouverture, construction du formulaire (texte, password,
 *  textarea, dropdown custom, multiselect), soumission,
 *  chargement des valeurs existantes.
 * ============================================================ */

Object.assign(Dashboard, {

    /** Ouvre la modale de paramètres pour un widget. */
    _openSettings(widgetId) {
        const widget = this._widgetList.find(w => w.id === widgetId);
        if (!widget) return;

        this._settingsWidget = widget;

        document.getElementById('modal-icon').innerHTML = this._renderIcon(widget.icon);
        document.getElementById('modal-title').textContent = `Paramètres — ${widget.name}`;

        // Récupérer les params depuis la config du widget
        fetch(`widgets/${widgetId}/config.json`)
            .then(r => r.json())
            .then(config => this._buildSettingsForm(widgetId, config.params ?? []))
            .catch(() => this._buildSettingsForm(widgetId, []));

        document.getElementById('settings-modal').classList.remove('hidden');
    },

    /**
     * Construit dynamiquement le formulaire de paramètres.
     * Types supportés : text, password, textarea, select, multiselect.
     */
    _buildSettingsForm(widgetId, params) {
        const container = document.getElementById('settings-fields');
        container.innerHTML = '';

        if (params.length === 0) {
            container.innerHTML = '<p style="color:var(--text-dim);font-size:13px;">Aucun paramètre pour ce widget.</p>';
            return;
        }

        params.forEach(param => {
            const group = document.createElement('div');
            group.className = 'field-group';

            // Label
            const label = document.createElement('label');
            label.className = 'field-label' + (param.required ? ' field-required' : '');
            label.setAttribute('for', `field-${param.key}`);
            label.textContent = param.label;
            group.appendChild(label);

            if (param.type === 'select') {
                // ---- Dropdown custom ----
                const wrapper = document.createElement('div');
                wrapper.className    = 'field-custom-select';
                wrapper.dataset.name = param.key;

                const current = document.createElement('div');
                current.className = 'field-cs-current';
                current.setAttribute('tabindex', '0');

                const dropdown = document.createElement('div');
                dropdown.className = 'field-cs-dropdown';

                const hidden = document.createElement('input');
                hidden.type  = 'hidden';
                hidden.name  = param.key;
                hidden.value = param.default ?? (param.options?.[0]?.value ?? '');

                const updateCurrent = (val) => {
                    const opt = (param.options ?? []).find(o => o.value === val);
                    current.textContent = opt?.label ?? val;
                    hidden.value = val;
                    dropdown.querySelectorAll('.field-cs-option').forEach(el => {
                        el.classList.toggle('is-selected', el.dataset.value === val);
                    });
                };

                (param.options ?? []).forEach(opt => {
                    const item = document.createElement('div');
                    item.className    = 'field-cs-option';
                    item.dataset.value = opt.value;
                    item.textContent  = opt.label;
                    item.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        updateCurrent(opt.value);
                        wrapper.classList.remove('open');
                    });
                    dropdown.appendChild(item);
                });

                updateCurrent(hidden.value);

                current.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = wrapper.classList.contains('open');
                    document.querySelectorAll('.field-custom-select.open')
                            .forEach(s => s.classList.remove('open'));
                    if (!isOpen) wrapper.classList.add('open');
                });

                current.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        wrapper.classList.toggle('open');
                    } else if (e.key === 'Escape') {
                        wrapper.classList.remove('open');
                    }
                });

                wrapper.appendChild(current);
                wrapper.appendChild(dropdown);
                wrapper.appendChild(hidden);
                group.appendChild(wrapper);

            } else if (param.type === 'multiselect') {
                // ---- Multiselect (checkboxes) ----
                const wrap = document.createElement('div');
                wrap.className       = 'field-checkboxes';
                wrap.id              = `field-${param.key}`;
                wrap.dataset.name    = param.key;
                (param.options ?? []).forEach(opt => {
                    const lbl = document.createElement('label');
                    lbl.className = 'field-checkbox-item';
                    const cb = document.createElement('input');
                    cb.type         = 'checkbox';
                    cb.value        = opt.value;
                    cb.dataset.group = param.key;
                    lbl.appendChild(cb);
                    lbl.appendChild(document.createTextNode(' ' + opt.label));
                    wrap.appendChild(lbl);
                });
                group.appendChild(wrap);

            } else if (param.type === 'textarea') {
                // ---- Textarea ----
                const ta = document.createElement('textarea');
                ta.className   = 'field-input field-textarea';
                ta.id          = `field-${param.key}`;
                ta.name        = param.key;
                ta.placeholder = param.placeholder ?? '';
                ta.rows        = 4;
                if (param.required) ta.required = true;
                group.appendChild(ta);

            } else {
                // ---- Text / Password ----
                const input = document.createElement('input');
                input.className   = 'field-input';
                input.id          = `field-${param.key}`;
                input.name        = param.key;
                input.type        = param.type === 'password' ? 'password' : 'text';
                input.placeholder = param.placeholder ?? '';
                if (param.required) input.required = true;
                group.appendChild(input);
            }

            container.appendChild(group);
        });

        // Charger les valeurs existantes depuis l'API
        fetch(`api/widgets.php?action=settings-get&widget=${encodeURIComponent(widgetId)}`)
            .then(r => r.json())
            .then(data => {
                if (!data.success || !data.settings) return;
                Object.entries(data.settings).forEach(([key, val]) => {
                    // text / password / textarea
                    const input = container.querySelector(`.field-input[name="${key}"]`);
                    if (input) { input.value = val; return; }
                    // custom select
                    const customSel = container.querySelector(`.field-custom-select[data-name="${key}"]`);
                    if (customSel && val) {
                        const hid = customSel.querySelector('input[type="hidden"]');
                        const cur = customSel.querySelector('.field-cs-current');
                        if (hid) hid.value = val;
                        const optEl = customSel.querySelector(`.field-cs-option[data-value="${CSS.escape(val)}"]`);
                        if (cur && optEl) {
                            cur.textContent = optEl.textContent;
                            customSel.querySelectorAll('.field-cs-option').forEach(el => {
                                el.classList.toggle('is-selected', el.dataset.value === val);
                            });
                        }
                        return;
                    }
                    // multiselect
                    const wrap = container.querySelector(`.field-checkboxes[data-name="${key}"]`);
                    if (wrap && val) {
                        val.split(',').forEach(v => {
                            const cb = wrap.querySelector(`input[value="${v.trim()}"]`);
                            if (cb) cb.checked = true;
                        });
                    }
                });
            })
            .catch(() => {});
    },

    /** Soumission du formulaire de paramètres. */
    async _submitSettings(e) {
        e.preventDefault();
        if (!this._settingsWidget) return;

        const widgetId = this._settingsWidget.id;

        const form   = document.getElementById('settings-form');
        const inputs = form.querySelectorAll('.field-input[name]');
        const values = {};
        inputs.forEach(input => { values[input.name] = input.value; });

        // Dropdowns custom
        form.querySelectorAll('.field-custom-select[data-name]').forEach(wrap => {
            const hid = wrap.querySelector('input[type="hidden"]');
            if (hid) values[hid.name] = hid.value;
        });

        // Multiselect → chaîne séparée par virgules
        form.querySelectorAll('.field-checkboxes[data-name]').forEach(wrap => {
            const key     = wrap.dataset.name;
            const checked = [...wrap.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.value);
            values[key]   = checked.join(',');
        });

        const btn = document.getElementById('save-settings');
        btn.disabled    = true;
        btn.textContent = 'Sauvegarde…';

        try {
            await this._saveSettings(widgetId, values);
            this._closeModal();
            // Recharger le widget
            const card      = document.getElementById(`widget-card-${widgetId}`);
            const contentEl = card?.querySelector('.widget-content');
            if (contentEl) await this._renderWidgetContent(widgetId, contentEl);
        } catch (err) {
            alert('Erreur : ' + err.message);
        } finally {
            btn.disabled    = false;
            btn.textContent = 'Sauvegarder';
        }
    },

    /** Ferme la modale de paramètres. */
    _closeModal() {
        document.getElementById('settings-modal').classList.add('hidden');
        this._settingsWidget = null;
    },

    /** Lie les événements du formulaire et des boutons de fermeture. */
    _bindModal() {
        document.getElementById('settings-form').addEventListener('submit', e => this._submitSettings(e));
        document.getElementById('cancel-settings').addEventListener('click', () => this._closeModal());
        document.getElementById('modal-close').addEventListener('click',    () => this._closeModal());
        document.getElementById('modal-overlay').addEventListener('click',  () => this._closeModal());
    },
});
