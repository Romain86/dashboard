/* ============================================================
 *  Module : API — Communication avec le backend
 *  dashboard/assets/js/modules/api.js
 *
 *  Helpers pour les appels à api/widgets.php :
 *  liste, données, sauvegarde des paramètres.
 * ============================================================ */

Object.assign(Dashboard, {

    /** Récupère la liste de tous les widgets (activés ou non). */
    async _fetchWidgetList() {
        const res  = await fetch('api/widgets.php?action=list');
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        return data.widgets;
    },

    /** Récupère les données d'un widget (avec cache côté serveur). */
    async _fetchWidgetData(widgetId, force = false) {
        let url = `api/widgets.php?action=data&widget=${encodeURIComponent(widgetId)}`;
        if (force) url += '&force=1';
        if (this._location) {
            url += `&lat=${this._location.lat}&lon=${this._location.lon}`;
        }
        const res  = await fetch(url);
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        return { data: json.data, cache_ts: json.cache_ts ?? 0 };
    },

    /** Sauvegarde les paramètres d'un widget. */
    async _saveSettings(widgetId, values) {
        const res = await fetch(`api/widgets.php?action=settings&widget=${encodeURIComponent(widgetId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
    },
});
