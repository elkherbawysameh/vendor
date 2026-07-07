<?php

// POST /auth/login
route('POST', '/auth/login', function () {
    $body = read_json_body();
    $email = $body['email'] ?? null;
    if (!is_string($email) || trim($email) === '') {
        error_response('Email is required', 400);
    }
    $normalized = strtolower(trim($email));
    if (substr($normalized, -10) !== '@qoyod.com') {
        error_response('Email must end with @qoyod.com', 400);
    }

    $_SESSION['user_email'] = $normalized;

    json_response([
        'email' => $normalized,
        'role' => get_role($normalized),
        'name' => null,
    ]);
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
