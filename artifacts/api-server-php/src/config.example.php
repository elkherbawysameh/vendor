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

    // Must match the URL path this "api" folder is actually reachable at,
    // relative to the domain root. Root deployment (public_html/api) -> "/api".
    // Subfolder deployment (public_html/Apps/Vendor/api) -> "/Apps/Vendor/api".
    'base_path' => '/api',

    // Only needed if the frontend is hosted on a DIFFERENT domain than
    // this API (cross-origin). Leave null for same-origin deployments —
    // that is the simplest and recommended setup for shared hosting.
    'allowed_origin' => null,

    // From Google Cloud Console -> APIs & Services -> Credentials -> OAuth
    // client ID (Web application). Register this redirect URI there:
    // https://<your-domain>/<base_path minus "/api">/api/index.php/api/auth/google/callback
    'google_client_id' => getenv('GOOGLE_CLIENT_ID') ?: '',
    'google_client_secret' => getenv('GOOGLE_CLIENT_SECRET') ?: '',

    // Base URL of the deployed frontend used to build links inside
    // notification emails (magic-action links and plain "open in app"
    // links). Intentionally the GitHub Pages staging URL, not the
    // production Hostinger domain, per product requirement.
    'app_base_url' => getenv('APP_BASE_URL') ?: 'https://elkherbawysameh.github.io/vendor',
];
