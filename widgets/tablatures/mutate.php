<?php

// $input et $pdo sont injectés par api/widgets.php (action=mutate)
$sub = $input['sub'] ?? '';

$pdo->exec("
    CREATE TABLE IF NOT EXISTS tablatures (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT NOT NULL,
        artist      TEXT NOT NULL DEFAULT '',
        instrument  TEXT NOT NULL DEFAULT 'Guitare',
        content     TEXT NOT NULL DEFAULT '',
        tags        TEXT NOT NULL DEFAULT '',
        source_url  TEXT NOT NULL DEFAULT '',
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
");

try { $pdo->exec("ALTER TABLE tablatures ADD COLUMN source_url TEXT NOT NULL DEFAULT ''"); } catch (PDOException $e) {}

if ($sub === 'add') {
    $title = trim($input['title'] ?? '');
    if ($title === '') {
        throw new Exception('Le titre est obligatoire');
    }
    $stmt = $pdo->prepare("
        INSERT INTO tablatures (title, artist, instrument, tags, source_url)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $title,
        trim($input['artist']     ?? ''),
        trim($input['instrument'] ?? 'Guitare'),
        trim($input['tags']       ?? ''),
        trim($input['source_url'] ?? ''),
    ]);

} elseif ($sub === 'delete') {
    $id = (int) ($input['id'] ?? 0);
    if ($id > 0) {
        $pdo->prepare("DELETE FROM tablatures WHERE id = ?")->execute([$id]);
    }
}

// Retourne la liste mise à jour
$tabs = $pdo
    ->query("SELECT id, title, artist, instrument, tags, source_url, created_at FROM tablatures ORDER BY created_at DESC")
    ->fetchAll();

return ['tabs' => $tabs];
