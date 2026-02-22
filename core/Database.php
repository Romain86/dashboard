<?php

class Database
{
    private static ?Database $instance = null;
    private PDO $pdo;

    private function __construct()
    {
        if (!is_dir(DATA_PATH)) {
            mkdir(DATA_PATH, 0755, true);
        }

        $this->pdo = new PDO('sqlite:' . DB_PATH, null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        $this->initialize();
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function initialize(): void
    {
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS widget_settings (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                widget_id   TEXT NOT NULL,
                key         TEXT NOT NULL,
                value       TEXT,
                updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(widget_id, key)
            );

            CREATE TABLE IF NOT EXISTS widget_layout (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                widget_id   TEXT NOT NULL UNIQUE,
                position    INTEGER DEFAULT 0,
                enabled     INTEGER DEFAULT 1,
                updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS dashboard_tabs (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL,
                position    INTEGER DEFAULT 0
            );
        ");

        // Migration : ajout de la colonne size si absente
        try {
            $this->pdo->exec("ALTER TABLE widget_layout ADD COLUMN size TEXT DEFAULT 'normal'");
        } catch (PDOException $e) {
            // Colonne déjà présente
        }

        // Migration : ajout de tab_id + changement de contrainte UNIQUE
        $cols = $this->pdo->query("PRAGMA table_info(widget_layout)")->fetchAll();
        $hasTabId = false;
        foreach ($cols as $col) {
            if ($col['name'] === 'tab_id') { $hasTabId = true; break; }
        }

        if (!$hasTabId) {
            $this->pdo->exec("
                CREATE TABLE widget_layout_new (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    widget_id   TEXT NOT NULL,
                    tab_id      INTEGER DEFAULT 1,
                    position    INTEGER DEFAULT 0,
                    enabled     INTEGER DEFAULT 1,
                    size        TEXT DEFAULT 'normal',
                    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(widget_id, tab_id)
                );
                INSERT INTO widget_layout_new (widget_id, tab_id, position, enabled, size, updated_at)
                    SELECT widget_id, 1, position, enabled, size, updated_at FROM widget_layout;
                DROP TABLE widget_layout;
                ALTER TABLE widget_layout_new RENAME TO widget_layout;
            ");
        }

        // Seed : onglet Accueil par défaut
        $count = (int) $this->pdo->query("SELECT COUNT(*) FROM dashboard_tabs")->fetchColumn();
        if ($count === 0) {
            $this->pdo->exec("INSERT INTO dashboard_tabs (id, name, position) VALUES (1, 'Accueil', 0)");
        }
    }

    // --- Widget Settings ---

    public function getSetting(string $widgetId, string $key): ?string
    {
        $stmt = $this->pdo->prepare(
            'SELECT value FROM widget_settings WHERE widget_id = ? AND key = ?'
        );
        $stmt->execute([$widgetId, $key]);
        $row = $stmt->fetch();
        return $row ? $row['value'] : null;
    }

    public function getSettings(string $widgetId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT key, value FROM widget_settings WHERE widget_id = ?'
        );
        $stmt->execute([$widgetId]);
        $result = [];
        foreach ($stmt->fetchAll() as $row) {
            $result[$row['key']] = $row['value'];
        }
        return $result;
    }

    public function setSetting(string $widgetId, string $key, string $value): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO widget_settings (widget_id, key, value, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(widget_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        ');
        $stmt->execute([$widgetId, $key, $value]);
    }

    public function getAllSettings(): array
    {
        $stmt = $this->pdo->query('SELECT widget_id, key, value FROM widget_settings ORDER BY widget_id');
        $result = [];
        foreach ($stmt->fetchAll() as $row) {
            $result[$row['widget_id']][$row['key']] = $row['value'];
        }
        return $result;
    }

    // --- Widget Layout ---

    public function getLayout(int $tabId = 1): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT widget_id, position, enabled, size FROM widget_layout WHERE tab_id = ? ORDER BY position ASC'
        );
        $stmt->execute([$tabId]);
        return $stmt->fetchAll();
    }

    public function saveLayout(string $widgetId, int $position, bool $enabled, int $tabId = 1): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO widget_layout (widget_id, tab_id, position, enabled, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(widget_id, tab_id) DO UPDATE SET position = excluded.position, enabled = excluded.enabled, updated_at = excluded.updated_at
        ');
        $stmt->execute([$widgetId, $tabId, $position, (int) $enabled]);
    }

    public function saveSize(string $widgetId, string $size, int $tabId = 1): void
    {
        $allowed = ['normal', 'lg', 'xl'];
        $size    = in_array($size, $allowed, true) ? $size : 'normal';
        $stmt    = $this->pdo->prepare('
            INSERT INTO widget_layout (widget_id, tab_id, size, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(widget_id, tab_id) DO UPDATE SET size = excluded.size, updated_at = excluded.updated_at
        ');
        $stmt->execute([$widgetId, $tabId, $size]);
    }

    // --- Tabs ---

    public function getTabs(): array
    {
        return $this->pdo->query('SELECT id, name, position FROM dashboard_tabs ORDER BY position ASC')->fetchAll();
    }

    public function createTab(string $name, int $position = 999): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO dashboard_tabs (name, position) VALUES (?, ?)');
        $stmt->execute([$name, $position]);
        return (int) $this->pdo->lastInsertId();
    }

    public function renameTab(int $tabId, string $name): void
    {
        $stmt = $this->pdo->prepare('UPDATE dashboard_tabs SET name = ? WHERE id = ?');
        $stmt->execute([$name, $tabId]);
    }

    public function deleteTab(int $tabId): void
    {
        // Supprimer le layout associé
        $stmt = $this->pdo->prepare('DELETE FROM widget_layout WHERE tab_id = ?');
        $stmt->execute([$tabId]);
        // Supprimer l'onglet
        $stmt = $this->pdo->prepare('DELETE FROM dashboard_tabs WHERE id = ?');
        $stmt->execute([$tabId]);
    }

    public function getPdo(): PDO
    {
        return $this->pdo;
    }
}
