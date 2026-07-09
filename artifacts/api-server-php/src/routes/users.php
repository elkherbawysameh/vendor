<?php

const USER_COLUMNS = "id, email, role, created_at AS createdAt";

// GET /users
route('GET', '/users', function () {
    require_role('admin');
    $rows = db_query('SELECT ' . USER_COLUMNS . ' FROM users ORDER BY email');
    json_response($rows);
});

// POST /users
route('POST', '/users', function () {
    require_role('admin');
    $body = read_json_body();
    $email = require_email($body, 'email');
    $role = $body['role'] ?? null;
    if (!$email || substr(strtolower($email), -10) !== '@qoyod.com') {
        error_response('A valid @qoyod.com email is required', 400);
    }
    if (!in_array($role, VALID_ROLES, true)) {
        error_response('Invalid role', 400);
    }

    $normalized = strtolower($email);
    $existing = db_query_one('SELECT id FROM users WHERE email = ?', [$normalized]);
    if ($existing) {
        error_response('A user with this email already exists', 400);
    }

    $id = db_insert('INSERT INTO users (email, role) VALUES (?, ?)', [$normalized, $role]);
    $user = db_query_one('SELECT ' . USER_COLUMNS . ' FROM users WHERE id = ?', [$id]);
    json_response($user, 201);
});

// PUT /users/{id}
route('PUT', '/users/{id}', function ($params) {
    require_role('admin');
    $id = (int) $params['id'];
    $existing = db_query_one('SELECT ' . USER_COLUMNS . ' FROM users WHERE id = ?', [$id]);
    if (!$existing) error_response('User not found', 404);

    $body = read_json_body();
    $role = $body['role'] ?? null;
    if (!in_array($role, VALID_ROLES, true)) {
        error_response('Invalid role', 400);
    }

    if ($existing['role'] === 'admin' && $role !== 'admin') {
        $adminCount = db_query_one("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
        if ((int) $adminCount['count'] <= 1) {
            error_response('Cannot remove the last remaining admin', 400);
        }
    }

    db_execute('UPDATE users SET role = ? WHERE id = ?', [$role, $id]);
    $updated = db_query_one('SELECT ' . USER_COLUMNS . ' FROM users WHERE id = ?', [$id]);
    json_response($updated);
});

// DELETE /users/{id}
route('DELETE', '/users/{id}', function ($params) {
    require_role('admin');
    $id = (int) $params['id'];
    $existing = db_query_one('SELECT ' . USER_COLUMNS . ' FROM users WHERE id = ?', [$id]);
    if (!$existing) error_response('User not found', 404);

    if (strtolower($existing['email']) === strtolower(current_user_email() ?? '')) {
        error_response('Cannot remove your own account', 400);
    }
    if ($existing['role'] === 'admin') {
        $adminCount = db_query_one("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
        if ((int) $adminCount['count'] <= 1) {
            error_response('Cannot remove the last remaining admin', 400);
        }
    }

    db_execute('DELETE FROM users WHERE id = ?', [$id]);
    no_content();
});
