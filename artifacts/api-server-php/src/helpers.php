<?php

function json_response($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error_response(string $message, int $status): void
{
    json_response(['error' => $message], $status);
}

function no_content(): void
{
    http_response_code(204);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function require_string(array $body, string $key, int $minLength = 1): ?string
{
    $value = $body[$key] ?? null;
    if (!is_string($value)) return null;
    $trimmed = trim($value);
    if (strlen($trimmed) < $minLength) return null;
    return $value;
}

function require_email(array $body, string $key): ?string
{
    $value = $body[$key] ?? null;
    if (!is_string($value) || !filter_var($value, FILTER_VALIDATE_EMAIL)) return null;
    return $value;
}

function require_int(array $body, string $key): ?int
{
    $value = $body[$key] ?? null;
    if (!is_numeric($value)) return null;
    return (int) $value;
}

function optional_number(array $body, string $key)
{
    $value = $body[$key] ?? null;
    if ($value === null || $value === '') return null;
    if (!is_numeric($value)) return null;
    return (float) $value;
}

// ── Auth ─────────────────────────────────────────────────────────────────

const VALID_ROLES = ['admin', 'accounts_manager', 'accounts_employee', 'employee'];

// Roles are stored in the `users` table (see schema.sql), managed via the
// /users endpoints. Any @qoyod.com email with no row there is an "employee".
function get_role(string $email): string
{
    $row = db_query_one('SELECT role FROM users WHERE email = ?', [$email]);
    return $row['role'] ?? 'employee';
}

function current_user_email(): ?string
{
    return $_SESSION['user_email'] ?? null;
}

function current_user_role(): ?string
{
    $email = current_user_email();
    return $email ? get_role($email) : null;
}

function require_auth(): string
{
    $email = current_user_email();
    if (!$email) {
        error_response('Not authenticated', 401);
    }
    return $email;
}

function require_role(string ...$roles): string
{
    $email = require_auth();
    if (!in_array(get_role($email), $roles, true)) {
        error_response('Access denied', 403);
    }
    return $email;
}

// ── HTTP client (for Google OAuth) ──────────────────────────────────────

function http_post_form(string $url, array $fields): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($fields),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode((string) $raw, true);
    return ['status' => $status, 'data' => is_array($data) ? $data : []];
}

function http_get_json(string $url, array $headers = []): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode((string) $raw, true);
    return ['status' => $status, 'data' => is_array($data) ? $data : []];
}

// ── Routing ──────────────────────────────────────────────────────────────

$GLOBALS['__routes'] = [];

function route(string $method, string $pattern, callable $handler): void
{
    $GLOBALS['__routes'][] = [$method, $pattern, $handler];
}

function dispatch(string $method, string $path): void
{
    foreach ($GLOBALS['__routes'] as [$routeMethod, $pattern, $handler]) {
        if ($routeMethod !== $method) continue;

        $paramNames = [];
        $regex = preg_replace_callback('#\{([a-zA-Z]+)\}#', function ($m) use (&$paramNames) {
            $paramNames[] = $m[1];
            return '([^/]+)';
        }, $pattern);

        if (preg_match('#^' . $regex . '$#', $path, $matches)) {
            array_shift($matches);
            $params = array_combine($paramNames, $matches);
            $handler($params);
            return;
        }
    }
    error_response('Not found', 404);
}
