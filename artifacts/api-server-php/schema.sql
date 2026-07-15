-- Qoyod Vendor & Purchase Tracker — MySQL/MariaDB schema
-- Import this once via phpMyAdmin (or `mysql -u USER -p DBNAME < schema.sql`)
-- on the MySQL database provisioned for this app (e.g. on Hostinger).

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS vendor_categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vendors (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NULL,
  contact_email TEXT NULL,
  contact_phone TEXT NULL,
  bank_name TEXT NULL,
  bank_account_name TEXT NULL,
  bank_account_number TEXT NULL,
  iban TEXT NULL,
  swift_code TEXT NULL,
  bank_branch TEXT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vendor_category_links (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  INDEX idx_vcl_vendor (vendor_id),
  INDEX idx_vcl_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vendor_documents (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT UNSIGNED NOT NULL,
  document_type TEXT NOT NULL,
  document_number TEXT NULL,
  expiry_date TEXT NULL,
  file_url TEXT NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_vd_vendor (vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vendor_transactions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  vendor_id INT UNSIGNED NOT NULL,
  purchase_request_id INT UNSIGNED NOT NULL,
  amount DOUBLE NOT NULL,
  quantity INT NOT NULL,
  executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  executed_by TEXT NOT NULL,
  notes TEXT NULL,
  INDEX idx_vt_vendor (vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  request_number VARCHAR(255) NOT NULL UNIQUE,
  -- 'purchase' (default) or 'refund'. Refund requests skip the admin
  -- vendor-assignment step and instead route back to the employee to
  -- attach an invoice (see invoice_url / pending_employee_invoice status).
  type VARCHAR(16) NOT NULL DEFAULT 'purchase',
  requester_email TEXT NOT NULL,
  department TEXT NOT NULL,
  item_description TEXT NOT NULL,
  quantity INT NOT NULL,
  -- NULL until an admin assigns a vendor (see category_id / the
  -- pending_vendor_assignment status). Requesters pick a category instead.
  vendor_id INT UNSIGNED NULL,
  category_id INT UNSIGNED NULL,
  -- Quotation an admin attaches (Google Drive link) before the request
  -- reaches accounts, regardless of whether the vendor was already known.
  quotation_url TEXT NULL,
  -- Refund-only: Drive link to the employee's invoice/receipt.
  invoice_url TEXT NULL,
  -- Total amount tied to quotation_url (purchase) or invoice_url (refund).
  quotation_amount DOUBLE NULL,
  -- Message-ID of the first notification email sent for this request, so
  -- every later email can reference it and thread together in the
  -- recipient's inbox instead of showing up as unrelated messages.
  email_thread_id VARCHAR(255) NULL,
  reason TEXT NOT NULL,
  manager_email TEXT NOT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'pending_manager',
  estimated_amount DOUBLE NULL,
  final_amount DOUBLE NULL,
  manager_note TEXT NULL,
  accounts_note TEXT NULL,
  clarification_question TEXT NULL,
  clarification_answer TEXT NULL,
  executed_at DATETIME NULL,
  executed_by TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pr_vendor (vendor_id),
  INDEX idx_pr_category (category_id),
  INDEX idx_pr_status (status),
  INDEX idx_pr_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS request_activities (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  request_id INT UNSIGNED NOT NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ra_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Single-use magic-link tokens embedded in notification emails so a
-- recipient can approve/reject/clarify/respond without logging in. A token
-- is only honored while the request's live status still equals
-- expected_status, so it auto-invalidates once the request moves on.
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

-- Roles are looked up from this table instead of being hardcoded in code.
-- Any @qoyod.com email that logs in but has no row here defaults to "employee".
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(32) NOT NULL DEFAULT 'employee',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users (email, role) VALUES
  ('s.elkherbawy@qoyod.com', 'admin'),
  ('balghafli@qoyod.com', 'accounts_manager'),
  ('ohamdy@qoyod.com', 'accounts_employee')
ON DUPLICATE KEY UPDATE role = VALUES(role);

CREATE TABLE IF NOT EXISTS policies (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Editable list backing the "Document Type" dropdown on vendor documents
-- (previously a hardcoded list in the frontend).
CREATE TABLE IF NOT EXISTS vendor_document_types (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO vendor_document_types (name) VALUES
  ('Commercial Registration (CR)'),
  ('VAT Certificate'),
  ('Saudization Certificate'),
  ('GOSI Certificate'),
  ('Zakat & Tax Certificate'),
  ('Other')
ON DUPLICATE KEY UPDATE name = VALUES(name);
