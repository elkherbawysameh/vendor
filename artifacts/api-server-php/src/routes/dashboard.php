<?php

// GET /dashboard/stats
route('GET', '/dashboard/stats', function () {
    require_auth();

    $total = db_query_one('SELECT COUNT(*) AS count FROM purchase_requests');
    $totalVendors = db_query_one('SELECT COUNT(*) AS count FROM vendors');
    $spending = db_query_one('SELECT COALESCE(SUM(amount), 0) AS total FROM vendor_transactions');

    $pending = db_query_one(
        "SELECT COUNT(*) AS count FROM purchase_requests WHERE status IN
            ('pending_manager','pending_clarification_employee_manager','pending_vendor_assignment','pending_clarification_employee_accounts','approved_by_manager')"
    );
    $approved = db_query_one(
        "SELECT COUNT(*) AS count FROM purchase_requests WHERE status IN ('approved_by_accounts','executed')"
    );
    $rejected = db_query_one(
        "SELECT COUNT(*) AS count FROM purchase_requests WHERE status IN ('rejected_by_manager','rejected_by_accounts')"
    );
    $executed = db_query_one("SELECT COUNT(*) AS count FROM purchase_requests WHERE status = 'executed'");

    $today = date('Y-m-d');
    $in30 = date('Y-m-d', strtotime('+30 days'));
    $expiring = db_query_one(
        'SELECT COUNT(*) AS count FROM vendor_documents WHERE expiry_date IS NOT NULL AND expiry_date >= ? AND expiry_date <= ?',
        [$today, $in30]
    );

    json_response([
        'totalRequests' => (int) $total['count'],
        'pendingRequests' => (int) $pending['count'],
        'approvedRequests' => (int) $approved['count'],
        'rejectedRequests' => (int) $rejected['count'],
        'executedRequests' => (int) $executed['count'],
        'totalVendors' => (int) $totalVendors['count'],
        'totalSpent' => (float) $spending['total'],
        'expiringDocuments' => (int) $expiring['count'],
    ]);
});

// GET /dashboard/vendor-spending
route('GET', '/dashboard/vendor-spending', function () {
    require_auth();
    $rows = db_query(
        'SELECT t.vendor_id AS vendorId, v.company_name AS companyName, SUM(t.amount) AS totalSpent, COUNT(*) AS transactionCount
         FROM vendor_transactions t
         INNER JOIN vendors v ON t.vendor_id = v.id
         GROUP BY t.vendor_id, v.company_name
         ORDER BY SUM(t.amount) DESC'
    );
    json_response(array_map(fn($r) => [
        'vendorId' => (int) $r['vendorId'],
        'vendorName' => $r['companyName'],
        'totalSpent' => (float) $r['totalSpent'],
        'transactionCount' => (int) $r['transactionCount'],
    ], $rows));
});

// GET /dashboard/recent-activity
route('GET', '/dashboard/recent-activity', function () {
    require_auth();
    $rows = db_query(
        'SELECT ' . PURCHASE_REQUEST_COLUMNS . ' FROM purchase_requests ORDER BY updated_at DESC LIMIT 10'
    );
    json_response(array_map(fn($r) => array_merge($r, ['vendor' => null]), $rows));
});

// GET /dashboard/status-breakdown
route('GET', '/dashboard/status-breakdown', function () {
    require_auth();
    $rows = db_query('SELECT status, COUNT(*) AS count FROM purchase_requests GROUP BY status');
    json_response(array_map(fn($r) => ['status' => $r['status'], 'count' => (int) $r['count']], $rows));
});
