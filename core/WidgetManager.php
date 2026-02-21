<?php

class WidgetManager
{
    private string $widgetsPath;

    public function __construct(string $widgetsPath)
    {
        $this->widgetsPath = $widgetsPath;
    }

    public function getAvailableWidgets(): array
    {
        $widgets = [];
        $dirs = glob($this->widgetsPath . '/*/config.json');

        foreach ($dirs as $configFile) {
            $config = json_decode(file_get_contents($configFile), true);
            if ($config) {
                $widgets[$config['id']] = $config;
            }
        }

        return $widgets;
    }

    public function callWidget(string $widgetId, array $settings, Cache $cache): mixed
    {
        $apiFile = $this->widgetsPath . '/' . $widgetId . '/api.php';

        if (!file_exists($apiFile)) {
            throw new Exception("Widget '$widgetId' introuvable");
        }

        $configFile = $this->widgetsPath . '/' . $widgetId . '/config.json';
        $config     = json_decode(file_get_contents($configFile), true);
        $ttl      = $config['refresh_interval'] ?? DEFAULT_CACHE_TTL;
        $cacheKey = 'widget_' . $widgetId;

        // Inclure les coordonnées GPS dans la clé de cache si fournies
        if (isset($settings['_lat'], $settings['_lon'])) {
            $cacheKey .= '_' . round((float) $settings['_lat'], 2) . '_' . round((float) $settings['_lon'], 2);
        }

        return $cache->remember($cacheKey, $ttl, function () use ($apiFile, $settings) {
            return (function (array $settings) use ($apiFile) {
                return require $apiFile;
            })($settings);
        });
    }

    /** Retourne la clé de cache pour un widget (utile pour getCachedAt). */
    public function getCacheKey(string $widgetId, array $settings): string
    {
        $key = 'widget_' . $widgetId;
        if (isset($settings['_lat'], $settings['_lon'])) {
            $key .= '_' . round((float) $settings['_lat'], 2) . '_' . round((float) $settings['_lon'], 2);
        }
        return $key;
    }
}
