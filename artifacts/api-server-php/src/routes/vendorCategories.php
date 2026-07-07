<?php

const VENDOR_CATEGORY_COLUMNS = 'id, name, description, created_at AS createdAt';

// GET /vendor-categories
route('GET', '/vendor-categories', function () {
    require_auth();
    $rows = db_query('SELECT ' . VENDOR_CATEGORY_COLUMNS . ' FROM vendor_categories ORDER BY name');
    json_response($rows);
});

// POST /vendor-categories
route('POST', '/vendor-categories', function () {
    require_auth();
    $body = read_json_body();
    $name = require_string($body, 'name', 1);
    if ($name === null) error_response('Invalid input', 400);
    $description = isset($body['description']) && is_string($body['description']) ? $body['description'] : null;

    $id = db_insert('INSERT INTO vendor_categories (name, description) VALUES (?, ?)', [$name, $description]);
    $category = db_query_one('SELECT ' . VENDOR_CATEGORY_COLUMNS . ' FROM vendor_categories WHERE id = ?', [$id]);
    json_response($category, 201);
});

// GET /vendor-categories/{id}
route('GET', '/vendor-categories/{id}', function ($params) {
    require_auth();
    $id = (int) $params['id'];
    $category = db_query_one('SELECT ' . VENDOR_CATEGORY_COLUMNS . ' FROM vendor_categories WHERE id = ?', [$id]);
    if (!$category) error_response('Category not found', 404);
    json_response($category);
});

// PUT /vendor-categories/{id}
route('PUT', '/vendor-categories/{id}', function ($params) {
    require_auth();
    $id = (int) $params['id'];
    $existing = db_query_one('SELECT id FROM vendor_categories WHERE id = ?', [$id]);
    if (!$existing) error_response('Category not found', 404);

    $body = read_json_body();
    $name = require_string($body, 'name', 1);
    if ($name === null) error_response('Invalid input', 400);
    $description = isset($body['description']) && is_string($body['description']) ? $body['description'] : null;

    db_execute('UPDATE vendor_categories SET name = ?, description = ? WHERE id = ?', [$name, $description, $id]);
    $updated = db_query_one('SELECT ' . VENDOR_CATEGORY_COLUMNS . ' FROM vendor_categories WHERE id = ?', [$id]);
    json_response($updated);
});

// DELETE /vendor-categories/{id}
route('DELETE', '/vendor-categories/{id}', function ($params) {
    require_auth();
    $id = (int) $params['id'];
    db_execute('DELETE FROM vendor_categories WHERE id = ?', [$id]);
    no_content();
});
