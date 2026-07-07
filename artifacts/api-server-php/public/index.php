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
require __DIR__ . '/../src/routes/vendorCategories.php';
require __DIR__ . '/../src/routes/vendors.php';
require __DIR__ . '/../src/routes/purchaseRequests.php';
require __DIR__ . '/../src/routes/dashboard.php';
require __DIR__ . '/../src/routes/reports.php';

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = rtrim($path, '/');
if ($path === '') $path = '/';

$basePath = rtrim($cfg['base_path'] ?? '', '/');
if ($basePath !== '' && strpos($path, $basePath) === 0) {
    $path = substr($path, strlen($basePath));
    if ($path === '') $path = '/';
}

dispatch($_SERVER['REQUEST_METHOD'], $path);
