/* ============================================================
 *  Module : Geolocation — Position GPS
 *  dashboard/assets/js/modules/geolocation.js
 *
 *  Demande la géolocalisation au navigateur.
 *  Utilisée pour les widgets météo, etc.
 *  Cache de 5 minutes, timeout de 5 secondes.
 * ============================================================ */

Object.assign(Dashboard, {

    /** Demande la position GPS (non-bloquant). */
    _getLocation() {
        return new Promise(resolve => {
            if (!navigator.geolocation) return resolve();
            navigator.geolocation.getCurrentPosition(
                pos => {
                    this._location = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                    this._updateGeoBtn(true);
                    resolve();
                },
                () => { this._updateGeoBtn(false); resolve(); },
                { timeout: 5000, maximumAge: 300000 }
            );
        });
    },

    /** Met à jour l'état visuel du bouton géolocalisation. */
    _updateGeoBtn(active) {
        const btn = document.getElementById('btn-geo');
        if (!btn) return;
        btn.classList.toggle('active', active);
        btn.title = active
            ? 'Géolocalisation active (cliquer pour désactiver)'
            : 'Géolocalisation inactive';
    },
});
