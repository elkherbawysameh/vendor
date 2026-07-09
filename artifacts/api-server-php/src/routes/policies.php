<?php

const POLICY_COLUMNS = "id, title, file_name AS fileName, file_url AS fileUrl, uploaded_by AS uploadedBy, created_at AS createdAt";
const POLICY_ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg'];

function policies_upload_dir(): string
{
    $dir = __DIR__ . '/../../public/uploads/policies';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    $htaccess = $dir . '/.htaccess';
    if (!file_exists($htaccess)) {
        file_put_contents($htaccess, "<FilesMatch \"\\.(php|phtml|phar|cgi|pl|py)$\">\n    Require all denied\n</FilesMatch>\n");
    }
    return $dir;
}

// GET /policies
route('GET', '/policies', function () {
    require_auth();
    $rows = db_query('SELECT ' . POLICY_COLUMNS . ' FROM policies ORDER BY created_at DESC');
    json_response($rows);
});

// POST /policies
route('POST', '/policies', function () {
    require_role('admin', 'accounts_manager');

    $title = trim($_POST['title'] ?? '');
    $file = $_FILES['file'] ?? null;
    if ($title === '' || !$file || $file['error'] !== UPLOAD_ERR_OK) {
        error_response('A title and a file are required', 400);
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, POLICY_ALLOWED_EXTENSIONS, true)) {
        error_response('File type not allowed. Allowed: ' . implode(', ', POLICY_ALLOWED_EXTENSIONS), 400);
    }
    if ($file['size'] > 20 * 1024 * 1024) {
        error_response('File is too large (max 20MB)', 400);
    }

    $dir = policies_upload_dir();
    $storedName = bin2hex(random_bytes(12)) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $storedName)) {
        error_response('Failed to store the uploaded file', 500);
    }

    $cfg = config();
    $basePath = rtrim($cfg['base_path'] ?? '', '/');
    $fileUrl = $basePath . '/uploads/policies/' . $storedName;

    $id = db_insert(
        'INSERT INTO policies (title, file_name, file_url, uploaded_by) VALUES (?, ?, ?, ?)',
        [$title, $file['name'], $fileUrl, current_user_email()]
    );
    $policy = db_query_one('SELECT ' . POLICY_COLUMNS . ' FROM policies WHERE id = ?', [$id]);
    json_response($policy, 201);
});

// DELETE /policies/{id}
route('DELETE', '/policies/{id}', function ($params) {
    require_role('admin', 'accounts_manager');
    $id = (int) $params['id'];
    $policy = db_query_one('SELECT ' . POLICY_COLUMNS . ' FROM policies WHERE id = ?', [$id]);
    if (!$policy) error_response('Policy not found', 404);

    $dir = policies_upload_dir();
    $storedName = basename($policy['fileUrl']);
    $path = $dir . '/' . $storedName;
    if (is_file($path)) {
        unlink($path);
    }

    db_execute('DELETE FROM policies WHERE id = ?', [$id]);
    no_content();
});
