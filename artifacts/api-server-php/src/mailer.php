<?php

// Minimal raw SMTP client (no Composer/PHPMailer available in this project)
// for sending notification emails through a single Google Workspace mailbox
// (smtp.gmail.com with an App Password). Talks plain SMTP + STARTTLS + AUTH
// LOGIN, which is all Gmail/Workspace SMTP requires.
//
// Throws RuntimeException on any failure instead of calling error_response()
// directly -- callers decide whether a failed send should surface as an HTTP
// error (a manual "resend" request) or just be logged (an automatic
// after-action notification, which shouldn't fail the action itself).

function smtp_read_response($socket): string
{
    $data = '';
    while (($line = fgets($socket, 515)) !== false) {
        $data .= $line;
        // A multi-line SMTP response has "-" as the 4th character on every
        // line except the last, which has a space there instead.
        if (strlen($line) < 4 || $line[3] === ' ') break;
    }
    return $data;
}

function smtp_expect($socket, string $expectedCode, string $context): void
{
    $response = smtp_read_response($socket);
    if (strpos($response, $expectedCode) !== 0) {
        fclose($socket);
        throw new \RuntimeException("SMTP $context failed: " . trim($response));
    }
}

/**
 * @param string[] $toEmails
 */
function send_email(
    array $toEmails,
    ?string $bcc,
    string $subject,
    string $html,
    string $fromDisplayName,
    ?string $messageId = null,
    ?string $inReplyTo = null
): void {
    $cfg = config();
    $host = $cfg['smtp_host'] ?? 'smtp.gmail.com';
    $port = (int) ($cfg['smtp_port'] ?? 587);
    $username = $cfg['smtp_username'] ?? '';
    $password = $cfg['smtp_password'] ?? '';

    if (!$username || !$password) {
        throw new \RuntimeException('Email sending is not configured (missing SMTP credentials)');
    }

    $socket = @stream_socket_client("tcp://$host:$port", $errno, $errstr, 15);
    if (!$socket) {
        throw new \RuntimeException("Could not connect to mail server: $errstr");
    }

    smtp_expect($socket, '220', 'greeting');

    fwrite($socket, "EHLO qoyod-vendor-system\r\n");
    smtp_expect($socket, '250', 'EHLO');

    fwrite($socket, "STARTTLS\r\n");
    smtp_expect($socket, '220', 'STARTTLS');

    stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);

    fwrite($socket, "EHLO qoyod-vendor-system\r\n");
    smtp_expect($socket, '250', 'EHLO after TLS');

    fwrite($socket, "AUTH LOGIN\r\n");
    smtp_expect($socket, '334', 'AUTH LOGIN');

    fwrite($socket, base64_encode($username) . "\r\n");
    smtp_expect($socket, '334', 'username');

    fwrite($socket, base64_encode($password) . "\r\n");
    smtp_expect($socket, '235', 'authentication');

    fwrite($socket, "MAIL FROM:<$username>\r\n");
    smtp_expect($socket, '250', 'MAIL FROM');

    foreach ($toEmails as $to) {
        fwrite($socket, "RCPT TO:<$to>\r\n");
        smtp_expect($socket, '250', 'RCPT TO');
    }
    if ($bcc) {
        fwrite($socket, "RCPT TO:<$bcc>\r\n");
        smtp_expect($socket, '250', 'RCPT TO (bcc)');
    }

    fwrite($socket, "DATA\r\n");
    smtp_expect($socket, '354', 'DATA');

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $encodedFromName = '=?UTF-8?B?' . base64_encode($fromDisplayName) . '?=';
    $toHeader = implode(', ', array_map(fn($e) => "<$e>", $toEmails));

    $headers = [
        "From: $encodedFromName <$username>",
        "To: $toHeader",
        "Subject: $encodedSubject",
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'Date: ' . date('r'),
    ];
    if ($messageId) {
        $headers[] = "Message-ID: $messageId";
    }
    if ($inReplyTo) {
        // Referencing just the thread's first Message-ID (rather than the
        // full chain) is enough for Gmail/Outlook to group these together,
        // combined with the subject staying identical across every email
        // sent for the same request.
        $headers[] = "In-Reply-To: $inReplyTo";
        $headers[] = "References: $inReplyTo";
    }

    // Dot-stuffing: any body line starting with "." must be escaped by
    // doubling it, per the SMTP DATA command's end-of-message convention.
    $lines = explode("\n", str_replace("\r\n", "\n", $html));
    $escapedLines = array_map(fn($line) => (isset($line[0]) && $line[0] === '.') ? '.' . $line : $line, $lines);
    $body = implode("\r\n", $escapedLines);

    fwrite($socket, implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n.\r\n");
    smtp_expect($socket, '250', 'message body');

    fwrite($socket, "QUIT\r\n");
    fclose($socket);
}
