<?php

function google_redirect_uri(): string
{
    $scheme = (($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $script = $_SERVER['SCRIPT_NAME'];
    return "$scheme://$host$script/api/auth/google/callback";
}

function frontend_base_path(): string
{
    $cfg = config();
    return preg_replace('#/api$#', '', rtrim($cfg['base_path'] ?? '', '/'));
}

// GET /auth/google/start
route('GET', '/auth/google/start', function () {
    $cfg = config();
    if (empty($cfg['google_client_id'])) {
        error_response('Google login is not configured yet (missing google_client_id in config.php)', 500);
    }

    $state = bin2hex(random_bytes(16));
    $_SESSION['oauth_state'] = $state;

    $params = http_build_query([
        'client_id' => $cfg['google_client_id'],
        'redirect_uri' => google_redirect_uri(),
        'response_type' => 'code',
        'scope' => 'openid email profile',
        'state' => $state,
        'prompt' => 'select_account',
    ]);

    header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $params);
    exit;
});

// GET /auth/google/callback
route('GET', '/auth/google/callback', function () {
    $cfg = config();
    $base = frontend_base_path();

    $state = $_GET['state'] ?? '';
    $code = $_GET['code'] ?? '';
    if (!$code || !$state || !hash_equals($_SESSION['oauth_state'] ?? '', $state)) {
        header('Location: ' . $base . '/login?error=oauth_state');
        exit;
    }
    unset($_SESSION['oauth_state']);

    $tokenResponse = http_post_form('https://oauth2.googleapis.com/token', [
        'client_id' => $cfg['google_client_id'],
        'client_secret' => $cfg['google_client_secret'],
        'code' => $code,
        'grant_type' => 'authorization_code',
        'redirect_uri' => google_redirect_uri(),
    ]);
    $accessToken = $tokenResponse['data']['access_token'] ?? null;
    if (!$accessToken) {
        header('Location: ' . $base . '/login?error=oauth_token');
        exit;
    }

    $userInfo = http_get_json(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        ['Authorization: Bearer ' . $accessToken]
    );
    $email = $userInfo['data']['email'] ?? null;
    $emailVerified = $userInfo['data']['email_verified'] ?? false;

    if (!$email || !$emailVerified) {
        header('Location: ' . $base . '/login?error=oauth_email');
        exit;
    }

    $normalized = strtolower($email);
    if (substr($normalized, -10) !== '@qoyod.com') {
        header('Location: ' . $base . '/login?error=domain');
        exit;
    }

    db_execute('INSERT IGNORE INTO users (email, role) VALUES (?, ?)', [$normalized, 'employee']);
    $_SESSION['user_email'] = $normalized;

    header('Location: ' . $base . '/');
    exit;
});

// GET /auth/me
route('GET', '/auth/me', function () {
    $email = current_user_email();
    if (!$email) {
        error_response('Not authenticated', 401);
    }
    json_response([
        'email' => $email,
        'role' => get_role($email),
        'name' => null,
    ]);
});

// POST /auth/logout
route('POST', '/auth/logout', function () {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    json_response(['ok' => true]);
});
