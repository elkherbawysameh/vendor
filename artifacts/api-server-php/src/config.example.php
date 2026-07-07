<?php
// Copy this file to config.php and fill in your real Hostinger MySQL
// credentials (hPanel → Databases → MySQL Databases). Do not commit
// config.php to git — it holds real secrets.

return [
    // DB credentials shown in hPanel when you create the database.
    'db_host' => getenv('DB_HOST') ?: 'localhost',
    'db_port' => getenv('DB_PORT') ?: '3306',
    'db_name' => getenv('DB_NAME') ?: 'u123456789_qoyod',
    'db_user' => getenv('DB_USER') ?: 'u123456789_qoyod',
    'db_pass' => getenv('DB_PASS') ?: 'change-me',

    // URL path this API is mounted under. Leave as "/api" if you deploy
    // the frontend and this API under the same domain, with this folder
    // placed at public_html/api. Set to "" if this API is the domain root.
    'base_path' => '/api',

    // Only needed if the frontend is hosted on a DIFFERENT domain than
    // this API (cross-origin). Leave null for same-origin deployments —
    // that is the simplest and recommended setup for shared hosting.
    'allowed_origin' => null,
];
