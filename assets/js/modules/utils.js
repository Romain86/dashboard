/* ============================================================
 *  Module : Utils — Fonctions utilitaires
 *  dashboard/assets/js/modules/utils.js
 *
 *  Échappement HTML, rendu d'icône (emoji ou SVG inline).
 * ============================================================ */

Object.assign(Dashboard, {

    /**
     * Rendu d'une icône : si c'est du SVG, on l'injecte tel quel ;
     * sinon on échappe le texte (emoji, caractère unicode).
     */
    _renderIcon(icon) {
        const i = icon ?? '🔧';
        return i.trimStart().startsWith('<svg') ? i : this._escHtml(i);
    },

    /**
     * Échappe les caractères spéciaux HTML pour éviter les injections XSS.
     */
    _escHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },
});
