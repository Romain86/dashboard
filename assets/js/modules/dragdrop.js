/* ============================================================
 *  Module : Drag & Drop — Réorganisation des widgets
 *  dashboard/assets/js/modules/dragdrop.js
 *
 *  Permet de réordonner les cartes par glisser-déposer
 *  en mode édition. Sauvegarde le layout via l'API.
 * ============================================================ */

Object.assign(Dashboard, {

    /** Initialise les événements drag & drop sur la grille. */
    _initDragDrop() {
        const grid = document.getElementById('widgets-grid');
        let dragEl  = null;
        let dragSrc = null;

        grid.addEventListener('dragstart', e => {
            if (!this._editMode) { e.preventDefault(); return; }
            dragEl = e.target.closest('.widget-card');
            if (!dragEl) return;
            dragSrc = dragEl.nextSibling;
            dragEl.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', dragEl.id);
        });

        grid.addEventListener('dragend', () => {
            if (!dragEl) return;
            dragEl.classList.remove('dragging');
            grid.querySelectorAll('.drag-indicator').forEach(el => el.remove());
            dragEl  = null;
            dragSrc = null;
            this._saveLayout();
        });

        grid.addEventListener('dragover', e => {
            e.preventDefault();
            if (!dragEl) return;
            e.dataTransfer.dropEffect = 'move';

            const target = e.target.closest('.widget-card');
            if (!target || target === dragEl) return;

            const rect = target.getBoundingClientRect();
            if (e.clientY < rect.top + rect.height / 2) {
                grid.insertBefore(dragEl, target);
            } else {
                grid.insertBefore(dragEl, target.nextSibling);
            }
        });

        grid.addEventListener('drop', e => {
            e.preventDefault();
        });
    },

    /** Sauvegarde l'ordre actuel des widgets via l'API. */
    async _saveLayout() {
        const cards  = document.querySelectorAll('#widgets-grid .widget-card');
        const layout = Array.from(cards).map((card, i) => ({
            id:       card.id.replace('widget-card-', ''),
            position: i,
            enabled:  true,
        }));

        await fetch('api/widgets.php?action=layout', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(layout),
        }).catch(console.error);
    },
});
