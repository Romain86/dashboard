<?php

// $settings est injecté par WidgetManager::callWidget()
$pdo = Database::getInstance()->getPdo();

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

// Migration : ajoute la colonne si la table existait déjà sans elle
try { $pdo->exec("ALTER TABLE tablatures ADD COLUMN source_url TEXT NOT NULL DEFAULT ''"); } catch (PDOException $e) {}

$tabs = $pdo
    ->query("SELECT id, title, artist, instrument, tags, source_url, created_at FROM tablatures ORDER BY created_at DESC")
    ->fetchAll();

return ['tabs' => $tabs];
