<?php

// Single-use "magic link" actions embedded in notification emails so a
// recipient can approve/reject/clarify/respond without logging in. See
// resolve_notification_targets()/create_action_token() in purchaseRequests.php
// for how tokens are minted.

function get_action_token(string $token): ?array
{
    return db_query_one(
        'SELECT id, token, purchase_request_id AS purchaseRequestId, action, actor_email AS actorEmail,
            expected_status AS expectedStatus, expires_at AS expiresAt, used_at AS usedAt
         FROM email_action_tokens WHERE token = ?',
        [$token]
    );
}

function validate_action_token(string $token): array
{
    $row = get_action_token($token);
    if (!$row) error_response('Link not found', 404);
    if ($row['usedAt'] !== null) error_response('This link has already been used', 410);
    if (strtotime($row['expiresAt']) < time()) error_response('This link has expired', 410);

    $request = get_purchase_request((int) $row['purchaseRequestId']);
    if (!$request) error_response('Request not found', 404);
    if ($request['status'] !== $row['expectedStatus']) {
        error_response('This request has already moved past this step', 410);
    }

    return ['token' => $row, 'request' => $request];
}

// GET /magic-actions/{token} -- read-only preview, safe for email-scanner prefetching
route('GET', '/magic-actions/{token}', function ($params) {
    ['token' => $tokenRow, 'request' => $request] = validate_action_token($params['token']);

    json_response([
        'action' => $tokenRow['action'],
        'requestId' => $request['id'],
        'requestNumber' => $request['requestNumber'],
        'itemDescription' => $request['itemDescription'],
        'type' => $request['type'],
    ]);
});

// POST /magic-actions/{token}/confirm -- performs the action; only reached via
// an explicit Confirm click on the /magic/:token landing page, never on plain navigation
route('POST', '/magic-actions/{token}/confirm', function ($params) {
    ['token' => $tokenRow, 'request' => $request] = validate_action_token($params['token']);

    $body = read_json_body();
    $note = isset($body['note']) && is_string($body['note']) && trim($body['note']) !== '' ? $body['note'] : null;

    $id = (int) $tokenRow['purchaseRequestId'];
    $actorEmail = $tokenRow['actorEmail'];

    switch ($tokenRow['action']) {
        case 'approve':
            $result = perform_approve($id, $actorEmail, $note);
            break;
        case 'reject':
            $result = perform_reject($id, $actorEmail, $note);
            break;
        case 'clarify':
            $result = perform_clarify($id, $actorEmail, $note);
            break;
        case 'respond':
            if ($note === null) error_response('A response message is required', 400);
            $result = perform_respond($id, $actorEmail, $note);
            break;
        default:
            error_response('Unknown action', 400);
    }

    db_execute('UPDATE email_action_tokens SET used_at = NOW() WHERE id = ?', [$tokenRow['id']]);

    json_response($result);
});
