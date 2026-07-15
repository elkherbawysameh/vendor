<?php

const PURCHASE_REQUEST_COLUMNS = "id, request_number AS requestNumber, type, requester_email AS requesterEmail, department,
    item_description AS itemDescription, quantity, vendor_id AS vendorId, category_id AS categoryId,
    quotation_url AS quotationUrl, invoice_url AS invoiceUrl, quotation_amount AS quotationAmount,
    reason, manager_email AS managerEmail, status,
    estimated_amount AS estimatedAmount, final_amount AS finalAmount, manager_note AS managerNote,
    accounts_note AS accountsNote, clarification_question AS clarificationQuestion,
    clarification_answer AS clarificationAnswer, executed_at AS executedAt, executed_by AS executedBy,
    created_at AS createdAt, updated_at AS updatedAt";

const REQUEST_ACTIVITY_COLUMNS = "id, request_id AS requestId, actor_email AS actorEmail, action, note, created_at AS createdAt";

function generate_request_number(): string
{
    $year = date('Y');
    $result = db_query_one('SELECT COUNT(*) AS count FROM purchase_requests');
    $count = (int) ($result['count'] ?? 0) + 1;
    return sprintf('PR-%s-%03d', $year, $count);
}

function get_purchase_request(int $id): ?array
{
    return db_query_one('SELECT ' . PURCHASE_REQUEST_COLUMNS . ' FROM purchase_requests WHERE id = ?', [$id]);
}

function log_activity(int $requestId, string $actorEmail, string $action, ?string $note): void
{
    db_execute(
        'INSERT INTO request_activities (request_id, actor_email, action, note) VALUES (?, ?, ?, ?)',
        [$requestId, $actorEmail, $action, $note]
    );
}

function enrich_request(array $req): array
{
    $vendorEnriched = null;
    if ($req['vendorId'] !== null) {
        $vendor = db_query_one('SELECT ' . VENDOR_COLUMNS . ' FROM vendors WHERE id = ?', [(int) $req['vendorId']]);
        if ($vendor) {
            $categories = db_query(
                'SELECT c.id, c.name FROM vendor_category_links l
                 INNER JOIN vendor_categories c ON l.category_id = c.id
                 WHERE l.vendor_id = ?',
                [(int) $vendor['id']]
            );
            $vendorEnriched = array_merge($vendor, [
                'categories' => $categories,
                'documents' => [],
                'categoryIds' => array_map(fn($c) => (int) $c['id'], $categories),
                'totalSpent' => null,
                'transactionCount' => null,
            ]);
        }
    }

    $category = null;
    if ($req['categoryId'] !== null) {
        $category = db_query_one('SELECT ' . VENDOR_CATEGORY_COLUMNS . ' FROM vendor_categories WHERE id = ?', [(int) $req['categoryId']]);
    }

    return array_merge($req, ['vendor' => $vendorEnriched, 'category' => $category]);
}

// GET /purchase-requests
route('GET', '/purchase-requests', function () {
    require_auth();
    $rows = db_query('SELECT ' . PURCHASE_REQUEST_COLUMNS . ' FROM purchase_requests ORDER BY created_at DESC');

    $status = $_GET['status'] ?? null;
    $vendorId = $_GET['vendorId'] ?? null;
    $requesterEmail = $_GET['requesterEmail'] ?? null;
    $managerEmail = $_GET['managerEmail'] ?? null;
    $requestType = $_GET['requestType'] ?? null;

    if ($status) $rows = array_values(array_filter($rows, fn($r) => $r['status'] === $status));
    if ($vendorId) $rows = array_values(array_filter($rows, fn($r) => (int) $r['vendorId'] === (int) $vendorId));
    if ($requesterEmail) $rows = array_values(array_filter($rows, fn($r) => $r['requesterEmail'] === $requesterEmail));
    if ($managerEmail) $rows = array_values(array_filter($rows, fn($r) => $r['managerEmail'] === $managerEmail));
    if ($requestType) $rows = array_values(array_filter($rows, fn($r) => $r['type'] === $requestType));

    json_response(array_map('enrich_request', $rows));
});

// POST /purchase-requests
route('POST', '/purchase-requests', function () {
    require_auth();
    $body = read_json_body();
    $type = ($body['type'] ?? 'purchase') === 'refund' ? 'refund' : 'purchase';
    $requesterEmail = require_email($body, 'requesterEmail');
    $department = require_string($body, 'department', 1);
    $itemDescription = require_string($body, 'itemDescription', 1);
    $quantity = require_int($body, 'quantity');
    // Requesters pick a category, not a vendor -- null/absent means "Other"
    // (no category fit; an admin picks the vendor after manager approval).
    // Refund requests never carry a category at all.
    $categoryId = require_int($body, 'categoryId');
    $reason = require_string($body, 'reason', 1);
    $managerEmail = require_email($body, 'managerEmail');
    if (!$requesterEmail || !$department || !$itemDescription || !$quantity || $quantity < 1 || !$reason || !$managerEmail) {
        error_response('Invalid input', 400);
    }

    $requestNumber = generate_request_number();
    $id = db_insert(
        'INSERT INTO purchase_requests (request_number, type, requester_email, department, item_description, quantity,
            category_id, reason, manager_email, status, estimated_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [$requestNumber, $type, $requesterEmail, $department, $itemDescription, $quantity, $categoryId, $reason, $managerEmail,
            'pending_manager', optional_number($body, 'estimatedAmount')]
    );
    $created = get_purchase_request($id);
    log_activity($id, $created['requesterEmail'], 'submitted',
        ($type === 'refund' ? 'طلب استرداد جديد: ' : 'طلب شراء جديد: ') . $created['itemDescription']);

    json_response(enrich_request($created), 201);
});

// GET /purchase-requests/{id}
route('GET', '/purchase-requests/{id}', function ($params) {
    require_auth();
    $row = get_purchase_request((int) $params['id']);
    if (!$row) error_response('Request not found', 404);
    json_response(enrich_request($row));
});

// POST /purchase-requests/{id}/approve
route('POST', '/purchase-requests/{id}/approve', function ($params) {
    require_auth();
    $id = (int) $params['id'];
    $row = get_purchase_request($id);
    if (!$row) error_response('Request not found', 404);
    $body = read_json_body();
    $actorEmail = current_user_email() ?? $row['managerEmail'];

    if (in_array($row['status'], ['pending_manager', 'pending_clarification_employee_manager'])) {
        // Purchase requests always go through the admin next (even reorders
        // with a known vendor) so a fresh quotation can be attached before
        // accounts sees it. Refund requests instead go back to the employee
        // to attach their invoice.
        $newStatus = $row['type'] === 'refund' ? 'pending_employee_invoice' : 'pending_vendor_assignment';
        $actorNote = $body['note'] ?? 'تمت الموافقة من المدير';
    } elseif (in_array($row['status'], ['approved_by_manager', 'pending_clarification_employee_accounts'])) {
        $newStatus = 'approved_by_accounts';
        $actorNote = $body['note'] ?? 'تمت الموافقة من مدير الحسابات';
    } else {
        error_response('Cannot approve in current status', 400);
    }

    db_execute(
        'UPDATE purchase_requests SET status = ?, manager_note = ?, accounts_note = ?, updated_at = NOW() WHERE id = ?',
        [
            $newStatus,
            in_array($newStatus, ['approved_by_manager', 'pending_vendor_assignment', 'pending_employee_invoice'], true) ? ($body['note'] ?? null) : $row['managerNote'],
            $newStatus === 'approved_by_accounts' ? ($body['note'] ?? null) : $row['accountsNote'],
            $id,
        ]
    );
    log_activity($id, $actorEmail, 'approved', $actorNote);

    json_response(enrich_request(get_purchase_request($id)));
});

// POST /purchase-requests/{id}/assign-vendor
route('POST', '/purchase-requests/{id}/assign-vendor', function ($params) {
    $actorEmail = require_role('admin');
    $id = (int) $params['id'];
    $row = get_purchase_request($id);
    if (!$row) error_response('Request not found', 404);
    if ($row['status'] !== 'pending_vendor_assignment') {
        error_response('Request is not waiting for admin review', 400);
    }

    $body = read_json_body();
    $quotationUrl = require_string($body, 'quotationUrl', 1);
    if ($quotationUrl === null) error_response('quotationUrl is required', 400);
    $quotationAmount = optional_number($body, 'quotationAmount');
    if ($quotationAmount === null) error_response('quotationAmount is required', 400);

    // Vendor is only required here if one isn't already set (fresh request);
    // reorders already carry theirs over and just need a new quotation.
    $vendorId = $row['vendorId'] !== null ? (int) $row['vendorId'] : require_int($body, 'vendorId');
    if (!$vendorId) error_response('vendorId is required', 400);
    $vendor = db_query_one('SELECT id, company_name AS companyName FROM vendors WHERE id = ?', [$vendorId]);
    if (!$vendor) error_response('Vendor not found', 404);

    db_execute(
        'UPDATE purchase_requests SET vendor_id = ?, quotation_url = ?, quotation_amount = ?, status = ?, updated_at = NOW() WHERE id = ?',
        [$vendorId, $quotationUrl, $quotationAmount, 'approved_by_manager', $id]
    );
    log_activity($id, $actorEmail, 'vendor_assigned', 'تم تحديد المورد وإرفاق عرض السعر: ' . $vendor['companyName']);

    json_response(enrich_request(get_purchase_request($id)));
});

// POST /purchase-requests/{id}/submit-invoice
route('POST', '/purchase-requests/{id}/submit-invoice', function ($params) {
    $actorEmail = require_auth();
    $id = (int) $params['id'];
    $row = get_purchase_request($id);
    if (!$row) error_response('Request not found', 404);
    if ($row['type'] !== 'refund' || $row['status'] !== 'pending_employee_invoice') {
        error_response('Request is not waiting for an invoice', 400);
    }
    if ($actorEmail !== $row['requesterEmail']) error_response('Access denied', 403);

    $body = read_json_body();
    $invoiceUrl = require_string($body, 'invoiceUrl', 1);
    if ($invoiceUrl === null) error_response('invoiceUrl is required', 400);
    $totalAmount = optional_number($body, 'totalAmount');
    if ($totalAmount === null) error_response('totalAmount is required', 400);

    db_execute(
        'UPDATE purchase_requests SET invoice_url = ?, quotation_amount = ?, status = ?, updated_at = NOW() WHERE id = ?',
        [$invoiceUrl, $totalAmount, 'approved_by_manager', $id]
    );
    log_activity($id, $actorEmail, 'invoice_submitted', 'تم إرفاق الفاتورة بمبلغ إجمالي ' . $totalAmount);

    json_response(enrich_request(get_purchase_request($id)));
});

// POST /purchase-requests/{id}/reject
route('POST', '/purchase-requests/{id}/reject', function ($params) {
    require_auth();
    $id = (int) $params['id'];
    $row = get_purchase_request($id);
    if (!$row) error_response('Request not found', 404);
    $body = read_json_body();
    $actorEmail = current_user_email() ?? $row['managerEmail'];

    if (in_array($row['status'], ['pending_manager', 'pending_clarification_employee_manager'])) {
        $newStatus = 'rejected_by_manager';
    } elseif (in_array($row['status'], ['approved_by_manager', 'pending_clarification_employee_accounts'])) {
        $newStatus = 'rejected_by_accounts';
    } else {
        error_response('Cannot reject in current status', 400);
    }

    db_execute(
        'UPDATE purchase_requests SET status = ?, manager_note = ?, accounts_note = ?, updated_at = NOW() WHERE id = ?',
        [
            $newStatus,
            $newStatus === 'rejected_by_manager' ? ($body['note'] ?? null) : $row['managerNote'],
            $newStatus === 'rejected_by_accounts' ? ($body['note'] ?? null) : $row['accountsNote'],
            $id,
        ]
    );
    log_activity($id, $actorEmail, 'rejected', $body['note'] ?? 'تم رفض الطلب');

    json_response(enrich_request(get_purchase_request($id)));
});

// POST /purchase-requests/{id}/clarify
route('POST', '/purchase-requests/{id}/clarify', function ($params) {
    require_auth();
    $id = (int) $params['id'];
    $row = get_purchase_request($id);
    if (!$row) error_response('Request not found', 404);
    $body = read_json_body();
    $note = $body['note'] ?? null;
    $actorEmail = current_user_email() ?? $row['managerEmail'];

    if ($row['status'] === 'pending_manager') {
        $newStatus = 'pending_clarification_employee_manager';
    } elseif ($row['status'] === 'approved_by_manager') {
        $newStatus = 'pending_clarification_employee_accounts';
    } else {
        error_response('Cannot request clarification in current status', 400);
    }

    db_execute(
        'UPDATE purchase_requests SET status = ?, clarification_question = ?, clarification_answer = NULL, updated_at = NOW() WHERE id = ?',
        [$newStatus, $note, $id]
    );
    log_activity($id, $actorEmail, 'clarification_requested', $note);

    json_response(enrich_request(get_purchase_request($id)));
});

// POST /purchase-requests/{id}/respond
route('POST', '/purchase-requests/{id}/respond', function ($params) {
    require_auth();
    $id = (int) $params['id'];
    $body = read_json_body();
    $answer = $body['answer'] ?? null;
    if (!is_string($answer) || trim($answer) === '') error_response('Answer is required', 400);

    $row = get_purchase_request($id);
    if (!$row) error_response('Request not found', 404);

    if ($row['status'] === 'pending_clarification_employee_manager') {
        $newStatus = 'pending_manager';
    } elseif ($row['status'] === 'pending_clarification_employee_accounts') {
        $newStatus = 'approved_by_manager';
    } else {
        error_response('Not pending clarification', 400);
    }

    $quantity = isset($body['updatedQuantity']) && $body['updatedQuantity'] ? (int) $body['updatedQuantity'] : (int) $row['quantity'];
    $reason = isset($body['updatedReason']) && $body['updatedReason'] ? (string) $body['updatedReason'] : $row['reason'];
    $managerEmail = isset($body['updatedManagerEmail']) && $body['updatedManagerEmail'] ? (string) $body['updatedManagerEmail'] : $row['managerEmail'];

    db_execute(
        'UPDATE purchase_requests SET status = ?, clarification_answer = ?, updated_at = NOW(), quantity = ?, reason = ?, manager_email = ? WHERE id = ?',
        [$newStatus, $answer, $quantity, $reason, $managerEmail, $id]
    );
    log_activity($id, $row['requesterEmail'], 'clarification_answered', $answer);

    json_response(enrich_request(get_purchase_request($id)));
});

// POST /purchase-requests/{id}/execute
route('POST', '/purchase-requests/{id}/execute', function ($params) {
    require_auth();
    $id = (int) $params['id'];
    $body = read_json_body();
    $executedByEmail = $body['executedByEmail'] ?? null;
    $finalAmount = optional_number($body, 'finalAmount');
    if (!$executedByEmail || !$finalAmount) error_response('executedByEmail and finalAmount required', 400);

    $row = get_purchase_request($id);
    if (!$row) error_response('Request not found', 404);
    if ($row['status'] !== 'approved_by_accounts') error_response('Request not approved for execution', 400);

    db_execute(
        'UPDATE purchase_requests SET status = ?, final_amount = ?, executed_at = NOW(), executed_by = ?, updated_at = NOW() WHERE id = ?',
        ['executed', $finalAmount, $executedByEmail, $id]
    );

    db_execute(
        'INSERT INTO vendor_transactions (vendor_id, purchase_request_id, amount, quantity, executed_by, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [(int) $row['vendorId'], $id, $finalAmount, (int) $row['quantity'], $executedByEmail, $body['notes'] ?? null]
    );
    log_activity($id, $executedByEmail, 'executed', 'تم التنفيذ بمبلغ ' . $finalAmount);

    json_response(enrich_request(get_purchase_request($id)));
});

// POST /purchase-requests/{id}/reorder
route('POST', '/purchase-requests/{id}/reorder', function ($params) {
    require_auth();
    $id = (int) $params['id'];
    $body = read_json_body();
    $requesterEmail = $body['requesterEmail'] ?? null;
    $quantity = require_int($body, 'quantity');
    $reason = $body['reason'] ?? null;
    $managerEmail = $body['managerEmail'] ?? null;

    $row = get_purchase_request($id);
    if (!$row) error_response('Request not found', 404);

    $requestNumber = generate_request_number();
    $newId = db_insert(
        'INSERT INTO purchase_requests (request_number, type, requester_email, department, item_description, quantity,
            vendor_id, category_id, reason, manager_email, status, estimated_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [$requestNumber, $row['type'], $requesterEmail, $row['department'], $row['itemDescription'], $quantity, (int) $row['vendorId'],
            $row['categoryId'] !== null ? (int) $row['categoryId'] : null, $reason, $managerEmail, 'pending_manager',
            optional_number($body, 'estimatedAmount')]
    );
    $created = get_purchase_request($newId);
    log_activity($newId, $requesterEmail, 'submitted', 'إعادة طلب من ' . $row['requestNumber']);

    json_response(enrich_request($created), 201);
});

// GET /purchase-requests/{id}/activities
route('GET', '/purchase-requests/{id}/activities', function ($params) {
    require_auth();
    $id = (int) $params['id'];
    $activities = db_query(
        'SELECT ' . REQUEST_ACTIVITY_COLUMNS . ' FROM request_activities WHERE request_id = ? ORDER BY created_at',
        [$id]
    );
    json_response($activities);
});

// DELETE /purchase-requests/{id}
route('DELETE', '/purchase-requests/{id}', function ($params) {
    require_role('admin');
    $id = (int) $params['id'];
    $row = get_purchase_request($id);
    if (!$row) error_response('Request not found', 404);

    db_execute('DELETE FROM request_activities WHERE request_id = ?', [$id]);
    db_execute('DELETE FROM vendor_transactions WHERE purchase_request_id = ?', [$id]);
    db_execute('DELETE FROM purchase_requests WHERE id = ?', [$id]);
    no_content();
});

// DELETE /purchase-requests (delete all)
route('DELETE', '/purchase-requests', function () {
    require_role('admin');
    db_execute('DELETE FROM request_activities');
    db_execute('DELETE FROM vendor_transactions');
    db_execute('DELETE FROM purchase_requests');
    no_content();
});
