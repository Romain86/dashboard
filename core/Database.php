<?php

class Database
{
    private static ?Database $instance = null;
    private PDO $pdo;

    private function __construct()
    {
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
        ");
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

    // --- Widget Layout ---

    public function getLayout(): array
    {
        $stmt = $this->pdo->query(
            'SELECT widget_id, position, enabled FROM widget_layout ORDER BY position ASC'
        );
        return $stmt->fetchAll();
    }

    public function saveLayout(string $widgetId, int $position, bool $enabled): void
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO widget_layout (widget_id, position, enabled, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(widget_id) DO UPDATE SET position = excluded.position, enabled = excluded.enabled, updated_at = excluded.updated_at
        ');
        $stmt->execute([$widgetId, $position, (int) $enabled]);
    }

    public function getPdo(): PDO
    {
        return $this->pdo;
    }
}
