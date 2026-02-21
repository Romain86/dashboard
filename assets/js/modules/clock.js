/* ============================================================
 *  Module : Clock — Horloge temps réel
 *  dashboard/assets/js/modules/clock.js
 *
 *  Affiche l'heure et la date en français dans le header.
 *  Mise à jour toutes les secondes.
 * ============================================================ */

Object.assign(Dashboard, {

    _startClock() {
        const timeEl = document.getElementById('clock-time');
        const dateEl = document.getElementById('clock-date');

        const update = () => {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString('fr-FR', {
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            dateEl.textContent = now.toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long'
            });
        };

        update();
        setInterval(update, 1000);
    },
});
