<?php

require __DIR__ . '/../src/db.php';
require __DIR__ . '/../src/helpers.php';

$cfg = config();

$crossOrigin = !empty($cfg['allowed_origin']);

session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 7,
    'path' => '/',
    'secure' => $crossOrigin || (($_SERVER['HTTPS'] ?? '') !== ''),
    'httponly' => true,
    'samesite' => $crossOrigin ? 'None' : 'Lax',
]);
session_start();

if ($crossOrigin) {
    header('Access-Control-Allow-Origin: ' . $cfg['allowed_origin']);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

require __DIR__ . '/../src/routes/health.php';
require __DIR__ . '/../src/routes/auth.php';
require __DIR__ . '/../src/routes/users.php';
require __DIR__ . '/../src/routes/vendorCategories.php';
require __DIR__ . '/../src/routes/vendors.php';
require __DIR__ . '/../src/routes/purchaseRequests.php';
require __DIR__ . '/../src/routes/dashboard.php';
require __DIR__ . '/../src/routes/reports.php';
require __DIR__ . '/../src/routes/policies.php';

// Two ways this can be reached:
//
// 1. Direct invocation of this file with extra path info, e.g.
//    /api/index.php/api/vendors -- PATH_INFO = "/api/vendors". This is what
//    the frontend uses by default (see main.tsx's setBaseUrl call) because it
//    works on every Apache/PHP host without needing mod_rewrite or
//    AllowOverride permissions for a nested .htaccess to take effect.
// 2. A pretty URL like /api/vendors rewritten internally to this file by
//    ./.htaccess, in hosts where that rewrite is actually in effect.
$pathInfo = $_SERVER['PATH_INFO'] ?? '';
if ($pathInfo !== '') {
    $path = $pathInfo;
    if (strpos($path, '/api') === 0) {
        $path = substr($path, 4);
    }
} else {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $basePath = rtrim($cfg['base_path'] ?? '', '/');
    if ($basePath !== '' && strpos($path, $basePath) === 0) {
        $path = substr($path, strlen($basePath));
    }
}

$path = rtrim($path, '/');
if ($path === '') $path = '/';

dispatch($_SERVER['REQUEST_METHOD'], $path);
