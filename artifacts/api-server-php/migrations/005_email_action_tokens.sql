-- Run this once via phpMyAdmin on the existing database.
--
-- Backs the email-notification "magic link" feature: single-use tokens
-- that let a recipient approve/reject/clarify/respond straight from an
-- emailed link without logging in.

CREATE TABLE IF NOT EXISTS email_action_tokens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  purchase_request_id INT UNSIGNED NOT NULL,
  action VARCHAR(32) NOT NULL,
  actor_email VARCHAR(255) NOT NULL,
  expected_status VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  INDEX idx_eat_request (purchase_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
