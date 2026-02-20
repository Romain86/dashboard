<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard</title>
    <link rel="stylesheet" href="assets/css/dashboard.css">
</head>
<body>

    <header class="dashboard-header">
        <div class="header-left">
            <h1 class="dashboard-title">Dashboard</h1>
        </div>
        <div class="header-right">
            <span id="clock" class="clock"></span>
        </div>
    </header>

    <main class="dashboard-main">
        <div id="widgets-grid" class="widgets-grid">
            <div id="widgets-empty" class="widgets-empty hidden">
                <p>Aucun widget activé.</p>
                <p class="muted">Ajoutez un dossier dans <code>widgets/</code> pour commencer.</p>
            </div>
        </div>
    </main>

    <!-- Modal settings -->
    <div id="settings-modal" class="modal hidden" role="dialog" aria-modal="true">
        <div class="modal-overlay" id="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <span id="modal-icon" class="modal-icon"></span>
                <h2 id="modal-title" class="modal-title"></h2>
                <button class="modal-close" id="modal-close" aria-label="Fermer">&times;</button>
            </div>
            <form id="settings-form" class="settings-form" novalidate>
                <div id="settings-fields"></div>
                <div class="modal-actions">
                    <button type="button" id="cancel-settings" class="btn btn-secondary">Annuler</button>
                    <button type="submit" id="save-settings" class="btn btn-primary">Sauvegarder</button>
                </div>
            </form>
        </div>
    </div>

    <script src="assets/js/dashboard.js"></script>

</body>
</html>
