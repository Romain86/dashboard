<?php

define('ROOT_PATH', __DIR__);
define('WIDGETS_PATH', ROOT_PATH . '/widgets');
define('DATA_PATH', ROOT_PATH . '/data');
define('CACHE_PATH', DATA_PATH . '/cache');
define('DB_PATH', DATA_PATH . '/dashboard.db');

// Durée de cache par défaut en secondes
define('DEFAULT_CACHE_TTL', 300);

// Timezone
date_default_timezone_set('Europe/Paris');

// Autoload des classes core
spl_autoload_register(function (string $class): void {
    $file = ROOT_PATH . '/core/' . $class . '.php';
    if (file_exists($file)) {
        require_once $file;
    }
});
