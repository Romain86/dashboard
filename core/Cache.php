<?php

class Cache
{
    private string $cachePath;

    public function __construct(string $cachePath = CACHE_PATH)
    {
        $this->cachePath = $cachePath;

        if (!is_dir($this->cachePath)) {
            mkdir($this->cachePath, 0755, true);
        }
    }

    private function filePath(string $key): string
    {
        return $this->cachePath . '/' . preg_replace('/[^a-zA-Z0-9_\-]/', '_', $key) . '.json';
    }

    public function get(string $key): mixed
    {
        $file = $this->filePath($key);

        if (!file_exists($file)) {
            return null;
        }

        $data = json_decode(file_get_contents($file), true);

        if (!$data || time() > $data['expires_at']) {
            unlink($file);
            return null;
        }

        return $data['payload'];
    }

    public function set(string $key, mixed $value, int $ttl = DEFAULT_CACHE_TTL): void
    {
        $file = $this->filePath($key);
        $data = [
            'cached_at'  => time(),
            'expires_at' => time() + $ttl,
            'payload'    => $value,
        ];
        file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
    }

    /** Retourne le timestamp unix de création du cache, ou 0 si inexistant. */
    public function getCachedAt(string $key): int
    {
        $file = $this->filePath($key);
        if (!file_exists($file)) return 0;
        $data = json_decode(file_get_contents($file), true);
        return (int) ($data['cached_at'] ?? filemtime($file));
    }

    public function delete(string $key): void
    {
        $file = $this->filePath($key);
        if (file_exists($file)) {
            unlink($file);
        }
    }

    /**
     * Supprime tous les fichiers de cache dont le nom commence par $prefix.
     * Utile pour effacer les variantes GPS : widget_tmdb_48_85_2_35.json, etc.
     */
    public function deleteByPrefix(string $prefix): void
    {
        $safePrefix = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $prefix);
        foreach (glob($this->cachePath . '/' . $safePrefix . '*.json') as $file) {
            unlink($file);
        }
    }

    public function clear(): void
    {
        foreach (glob($this->cachePath . '/*.json') as $file) {
            unlink($file);
        }
    }

    /**
     * Récupère depuis le cache ou exécute le callback et met en cache le résultat.
     */
    public function remember(string $key, int $ttl, callable $callback): mixed
    {
        $cached = $this->get($key);

        if ($cached !== null) {
            return $cached;
        }

        $value = $callback();
        $this->set($key, $value, $ttl);

        return $value;
    }
}
