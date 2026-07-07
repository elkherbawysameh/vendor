<?php

// GET /reports/purchase-requests
route('GET', '/reports/purchase-requests', function () {
    require_auth();
    $vendorId = $_GET['vendorId'] ?? null;
    $month = $_GET['month'] ?? null;
    $type = $_GET['type'] ?? 'detailed';

    $rows = db_query('SELECT ' . PURCHASE_REQUEST_COLUMNS . ' FROM purchase_requests ORDER BY created_at DESC');

    if ($vendorId) {
        $rows = array_values(array_filter($rows, fn($r) => (int) $r['vendorId'] === (int) $vendorId));
    }
    if ($month) {
        $rows = array_values(array_filter($rows, function ($r) use ($month) {
            $rowMonth = date('Y-m', strtotime($r['createdAt']));
            return $rowMonth === $month;
        }));
    }

    $totalAmount = array_reduce($rows, function ($sum, $r) {
        return $sum + ($r['finalAmount'] ?? $r['estimatedAmount'] ?? 0);
    }, 0);

    $reportRows = $rows;
    if ($type === 'summary') {
        $vendorMap = [];
        foreach ($rows as $r) {
            $vid = (int) $r['vendorId'];
            if (!isset($vendorMap[$vid])) {
                $vendorMap[$vid] = array_merge($r, ['vendor' => null, '_count' => 1]);
            } else {
                $vendorMap[$vid]['finalAmount'] = ($vendorMap[$vid]['finalAmount'] ?? 0) + ($r['finalAmount'] ?? 0);
                $vendorMap[$vid]['_count'] += 1;
            }
        }
        $reportRows = array_values($vendorMap);
    }

    json_response([
        'requests' => array_map(fn($r) => array_merge($r, ['vendor' => null]), $reportRows),
        'totalAmount' => (float) $totalAmount,
        'generatedAt' => gmdate('Y-m-d\TH:i:s\Z'),
        'filters' => [
            'vendorId' => $vendorId ? (int) $vendorId : null,
            'month' => $month ?: null,
            'type' => $type,
        ],
    ]);
});
