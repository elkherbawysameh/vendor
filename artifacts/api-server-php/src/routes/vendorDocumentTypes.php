<?php

const VENDOR_DOCUMENT_TYPE_COLUMNS = 'id, name, created_at AS createdAt';

// GET /vendor-document-types
route('GET', '/vendor-document-types', function () {
    require_auth();
    $rows = db_query('SELECT ' . VENDOR_DOCUMENT_TYPE_COLUMNS . ' FROM vendor_document_types ORDER BY name');
    json_response($rows);
});

// POST /vendor-document-types
route('POST', '/vendor-document-types', function () {
    require_role('admin', 'accounts_manager');
    $body = read_json_body();
    $name = require_string($body, 'name', 1);
    if ($name === null) error_response('Invalid input', 400);

    $id = db_insert('INSERT INTO vendor_document_types (name) VALUES (?)', [$name]);
    $type = db_query_one('SELECT ' . VENDOR_DOCUMENT_TYPE_COLUMNS . ' FROM vendor_document_types WHERE id = ?', [$id]);
    json_response($type, 201);
});

// PUT /vendor-document-types/{id}
route('PUT', '/vendor-document-types/{id}', function ($params) {
    require_role('admin', 'accounts_manager');
    $id = (int) $params['id'];
    $existing = db_query_one('SELECT id FROM vendor_document_types WHERE id = ?', [$id]);
    if (!$existing) error_response('Document type not found', 404);

    $body = read_json_body();
    $name = require_string($body, 'name', 1);
    if ($name === null) error_response('Invalid input', 400);

    db_execute('UPDATE vendor_document_types SET name = ? WHERE id = ?', [$name, $id]);
    $updated = db_query_one('SELECT ' . VENDOR_DOCUMENT_TYPE_COLUMNS . ' FROM vendor_document_types WHERE id = ?', [$id]);
    json_response($updated);
});

// DELETE /vendor-document-types/{id}
route('DELETE', '/vendor-document-types/{id}', function ($params) {
    require_role('admin', 'accounts_manager');
    $id = (int) $params['id'];
    db_execute('DELETE FROM vendor_document_types WHERE id = ?', [$id]);
    no_content();
});
