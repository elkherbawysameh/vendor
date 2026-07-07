<?php

const VENDOR_COLUMNS = "id, company_name AS companyName, contact_person AS contactPerson, contact_email AS contactEmail,
    contact_phone AS contactPhone, bank_name AS bankName, bank_account_name AS bankAccountName,
    bank_account_number AS bankAccountNumber, iban, swift_code AS swiftCode, bank_branch AS bankBranch, notes,
    created_at AS createdAt";

const VENDOR_DOCUMENT_COLUMNS = "id, vendor_id AS vendorId, document_type AS documentType, document_number AS documentNumber,
    expiry_date AS expiryDate, file_url AS fileUrl, notes, created_at AS createdAt";

function enrich_vendor(array $vendor): array
{
    $vendorId = (int) $vendor['id'];

    $links = db_query('SELECT category_id FROM vendor_category_links WHERE vendor_id = ?', [$vendorId]);
    $categoryIds = array_map(fn($l) => (int) $l['category_id'], $links);

    $categories = [];
    if (count($categoryIds) > 0) {
        $placeholders = implode(',', array_fill(0, count($categoryIds), '?'));
        $categories = db_query(
            'SELECT ' . VENDOR_CATEGORY_COLUMNS . " FROM vendor_categories WHERE id IN ($placeholders)",
            $categoryIds
        );
    }

    $documents = db_query('SELECT ' . VENDOR_DOCUMENT_COLUMNS . ' FROM vendor_documents WHERE vendor_id = ?', [$vendorId]);

    $tx = db_query_one(
        'SELECT COALESCE(SUM(amount), 0) AS totalSpent, COUNT(*) AS transactionCount FROM vendor_transactions WHERE vendor_id = ?',
        [$vendorId]
    );

    return array_merge($vendor, [
        'categoryIds' => $categoryIds,
        'categories' => $categories,
        'documents' => $documents,
        'totalSpent' => (float) ($tx['totalSpent'] ?? 0),
        'transactionCount' => (int) ($tx['transactionCount'] ?? 0),
    ]);
}

// GET /vendors
route('GET', '/vendors', function () {
    require_auth();
    $categoryId = $_GET['categoryId'] ?? null;
    $search = $_GET['search'] ?? null;

    $vendorIds = null;
    if ($categoryId !== null) {
        $links = db_query('SELECT vendor_id FROM vendor_category_links WHERE category_id = ?', [(int) $categoryId]);
        $vendorIds = array_map(fn($l) => (int) $l['vendor_id'], $links);
        if (count($vendorIds) === 0) json_response([]);
    }

    $where = [];
    $params = [];
    if ($vendorIds !== null) {
        $placeholders = implode(',', array_fill(0, count($vendorIds), '?'));
        $where[] = "id IN ($placeholders)";
        array_push($params, ...$vendorIds);
    }
    if ($search) {
        $where[] = 'company_name LIKE ?';
        $params[] = '%' . $search . '%';
    }
    $sql = 'SELECT ' . VENDOR_COLUMNS . ' FROM vendors';
    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY company_name';

    $vendors = db_query($sql, $params);
    json_response(array_map('enrich_vendor', $vendors));
});

// GET /vendors/summary
route('GET', '/vendors/summary', function () {
    require_auth();
    $totalVendors = db_query_one('SELECT COUNT(*) AS count FROM vendors');
    $spending = db_query_one('SELECT COALESCE(SUM(amount), 0) AS totalSpent FROM vendor_transactions');
    $active = db_query_one('SELECT COUNT(DISTINCT vendor_id) AS count FROM vendor_transactions');
    $today = date('Y-m-d');
    $in30 = date('Y-m-d', strtotime('+30 days'));
    $expiring = db_query_one(
        'SELECT COUNT(*) AS count FROM vendor_documents WHERE expiry_date IS NOT NULL AND expiry_date >= ? AND expiry_date <= ?',
        [$today, $in30]
    );

    json_response([
        'totalVendors' => (int) $totalVendors['count'],
        'totalSpent' => (float) $spending['totalSpent'],
        'activeVendors' => (int) $active['count'],
        'expiringDocumentsCount' => (int) $expiring['count'],
    ]);
});

// GET /vendors/export
route('GET', '/vendors/export', function () {
    require_auth();
    $vendors = db_query('SELECT ' . VENDOR_COLUMNS . ' FROM vendors ORDER BY company_name');
    $headers = ['id', 'companyName', 'contactPerson', 'contactEmail', 'contactPhone', 'bankName', 'iban', 'createdAt'];
    $lines = [implode(',', $headers)];
    foreach ($vendors as $v) {
        $lines[] = implode(',', [
            $v['id'],
            $v['companyName'],
            $v['contactPerson'] ?? '',
            $v['contactEmail'] ?? '',
            $v['contactPhone'] ?? '',
            $v['bankName'] ?? '',
            $v['iban'] ?? '',
            $v['createdAt'],
        ]);
    }
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename=vendors.csv');
    echo implode("\n", $lines);
    exit;
});

// POST /vendors/import
route('POST', '/vendors/import', function () {
    require_auth();
    $body = read_json_body();
    $csvData = $body['csvData'] ?? null;
    if (!is_string($csvData)) error_response('Invalid input', 400);

    $lines = array_values(array_filter(explode("\n", $csvData), fn($l) => trim($l) !== ''));
    if (count($lines) < 2) json_response(['imported' => 0, 'errors' => []]);

    $errors = [];
    $imported = 0;
    for ($i = 1; $i < count($lines); $i++) {
        $cols = explode(',', $lines[$i]);
        $name = isset($cols[1]) ? trim($cols[1]) : '';
        if ($name === '') {
            $errors[] = "Row $i: missing company name";
            continue;
        }
        try {
            db_insert(
                'INSERT INTO vendors (company_name, contact_person, contact_email, contact_phone, bank_name, iban) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    $name,
                    trim($cols[2] ?? '') ?: null,
                    trim($cols[3] ?? '') ?: null,
                    trim($cols[4] ?? '') ?: null,
                    trim($cols[5] ?? '') ?: null,
                    trim($cols[6] ?? '') ?: null,
                ]
            );
            $imported++;
        } catch (Exception $e) {
            $errors[] = "Row $i: failed to import $name";
        }
    }
    json_response(['imported' => $imported, 'errors' => $errors]);
});

// GET /vendors/expiring-documents
route('GET', '/vendors/expiring-documents', function () {
    require_auth();
    $today = date('Y-m-d');
    $in30 = date('Y-m-d', strtotime('+30 days'));
    $docs = db_query(
        'SELECT d.id AS docId, d.vendor_id AS vendorId, d.document_type AS documentType, d.expiry_date AS expiryDate,
                v.company_name AS companyName
         FROM vendor_documents d
         INNER JOIN vendors v ON d.vendor_id = v.id
         WHERE d.expiry_date IS NOT NULL AND d.expiry_date >= ? AND d.expiry_date <= ?',
        [$today, $in30]
    );

    $now = new DateTime();
    $result = array_map(function ($d) use ($now) {
        $expiry = new DateTime($d['expiryDate']);
        $daysUntilExpiry = (int) ceil(($expiry->getTimestamp() - $now->getTimestamp()) / 86400);
        return [
            'vendorId' => (int) $d['vendorId'],
            'vendorName' => $d['companyName'],
            'documentType' => $d['documentType'],
            'expiryDate' => $d['expiryDate'],
            'daysUntilExpiry' => $daysUntilExpiry,
        ];
    }, $docs);
    json_response($result);
});

// GET /vendors/{id}
route('GET', '/vendors/{id}', function ($params) {
    require_auth();
    $id = (int) $params['id'];
    $vendor = db_query_one('SELECT ' . VENDOR_COLUMNS . ' FROM vendors WHERE id = ?', [$id]);
    if (!$vendor) error_response('Vendor not found', 404);
    json_response(enrich_vendor($vendor));
});

// POST /vendors
route('POST', '/vendors', function () {
    require_auth();
    $body = read_json_body();
    $companyName = require_string($body, 'companyName', 1);
    if ($companyName === null) error_response('Invalid input', 400);

    $id = db_insert(
        'INSERT INTO vendors (company_name, contact_person, contact_email, contact_phone, bank_name, bank_account_name,
            bank_account_number, iban, swift_code, bank_branch, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            $companyName,
            $body['contactPerson'] ?? null,
            $body['contactEmail'] ?? null,
            $body['contactPhone'] ?? null,
            $body['bankName'] ?? null,
            $body['bankAccountName'] ?? null,
            $body['bankAccountNumber'] ?? null,
            $body['iban'] ?? null,
            $body['swiftCode'] ?? null,
            $body['bankBranch'] ?? null,
            $body['notes'] ?? null,
        ]
    );

    $categoryIds = $body['categoryIds'] ?? [];
    if (is_array($categoryIds) && count($categoryIds) > 0) {
        foreach ($categoryIds as $cid) {
            db_execute('INSERT INTO vendor_category_links (vendor_id, category_id) VALUES (?, ?)', [$id, (int) $cid]);
        }
    }

    $vendor = db_query_one('SELECT ' . VENDOR_COLUMNS . ' FROM vendors WHERE id = ?', [$id]);
    json_response(enrich_vendor($vendor), 201);
});

// PUT /vendors/{id}
route('PUT', '/vendors/{id}', function ($params) {
    require_auth();
    $id = (int) $params['id'];
    $existing = db_query_one('SELECT id FROM vendors WHERE id = ?', [$id]);
    if (!$existing) error_response('Vendor not found', 404);

    $body = read_json_body();
    $fields = [
        'company_name' => $body['companyName'] ?? null,
        'contact_person' => $body['contactPerson'] ?? null,
        'contact_email' => $body['contactEmail'] ?? null,
        'contact_phone' => $body['contactPhone'] ?? null,
        'bank_name' => $body['bankName'] ?? null,
        'bank_account_name' => $body['bankAccountName'] ?? null,
        'bank_account_number' => $body['bankAccountNumber'] ?? null,
        'iban' => $body['iban'] ?? null,
        'swift_code' => $body['swiftCode'] ?? null,
        'bank_branch' => $body['bankBranch'] ?? null,
        'notes' => $body['notes'] ?? null,
    ];
    $set = implode(', ', array_map(fn($k) => "$k = ?", array_keys($fields)));
    db_execute("UPDATE vendors SET $set WHERE id = ?", [...array_values($fields), $id]);

    if (array_key_exists('categoryIds', $body)) {
        db_execute('DELETE FROM vendor_category_links WHERE vendor_id = ?', [$id]);
        $categoryIds = $body['categoryIds'] ?? [];
        if (is_array($categoryIds)) {
            foreach ($categoryIds as $cid) {
                db_execute('INSERT INTO vendor_category_links (vendor_id, category_id) VALUES (?, ?)', [$id, (int) $cid]);
            }
        }
    }

    $updated = db_query_one('SELECT ' . VENDOR_COLUMNS . ' FROM vendors WHERE id = ?', [$id]);
    json_response(enrich_vendor($updated));
});

// DELETE /vendors/{id}
route('DELETE', '/vendors/{id}', function ($params) {
    require_auth();
    $id = (int) $params['id'];
    db_execute('DELETE FROM vendor_category_links WHERE vendor_id = ?', [$id]);
    db_execute('DELETE FROM vendor_documents WHERE vendor_id = ?', [$id]);
    db_execute('DELETE FROM vendors WHERE id = ?', [$id]);
    no_content();
});

// GET /vendors/{vendorId}/documents
route('GET', '/vendors/{vendorId}/documents', function ($params) {
    require_auth();
    $vendorId = (int) $params['vendorId'];
    $docs = db_query(
        'SELECT ' . VENDOR_DOCUMENT_COLUMNS . ' FROM vendor_documents WHERE vendor_id = ? ORDER BY document_type',
        [$vendorId]
    );
    json_response($docs);
});

// POST /vendors/{vendorId}/documents
route('POST', '/vendors/{vendorId}/documents', function ($params) {
    require_auth();
    $vendorId = (int) $params['vendorId'];
    $body = read_json_body();
    $documentType = require_string($body, 'documentType', 1);
    if ($documentType === null) error_response('Invalid input', 400);

    $id = db_insert(
        'INSERT INTO vendor_documents (vendor_id, document_type, document_number, expiry_date, file_url, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [
            $vendorId,
            $documentType,
            $body['documentNumber'] ?? null,
            isset($body['expiryDate']) ? (string) $body['expiryDate'] : null,
            $body['fileUrl'] ?? null,
            $body['notes'] ?? null,
        ]
    );
    $doc = db_query_one('SELECT ' . VENDOR_DOCUMENT_COLUMNS . ' FROM vendor_documents WHERE id = ?', [$id]);
    json_response($doc, 201);
});

// PUT /vendors/{vendorId}/documents/{docId}
route('PUT', '/vendors/{vendorId}/documents/{docId}', function ($params) {
    require_auth();
    $docId = (int) $params['docId'];
    $existing = db_query_one('SELECT id FROM vendor_documents WHERE id = ?', [$docId]);
    if (!$existing) error_response('Document not found', 404);

    $body = read_json_body();
    $fields = [
        'document_type' => $body['documentType'] ?? null,
        'document_number' => $body['documentNumber'] ?? null,
        'expiry_date' => isset($body['expiryDate']) ? (string) $body['expiryDate'] : null,
        'file_url' => $body['fileUrl'] ?? null,
        'notes' => $body['notes'] ?? null,
    ];
    $set = implode(', ', array_map(fn($k) => "$k = ?", array_keys($fields)));
    db_execute("UPDATE vendor_documents SET $set WHERE id = ?", [...array_values($fields), $docId]);

    $updated = db_query_one('SELECT ' . VENDOR_DOCUMENT_COLUMNS . ' FROM vendor_documents WHERE id = ?', [$docId]);
    json_response($updated);
});

// DELETE /vendors/{vendorId}/documents/{docId}
route('DELETE', '/vendors/{vendorId}/documents/{docId}', function ($params) {
    require_auth();
    $docId = (int) $params['docId'];
    db_execute('DELETE FROM vendor_documents WHERE id = ?', [$docId]);
    no_content();
});
