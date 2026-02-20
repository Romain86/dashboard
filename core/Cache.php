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
            'expires_at' => time() + $ttl,
            'payload'    => $value,
        ];
        file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
    }

    public function delete(string $key): void
    {
        $file = $this->filePath($key);
        if (file_exists($file)) {
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
