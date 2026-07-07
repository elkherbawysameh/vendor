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
  requester_email TEXT NOT NULL,
  department TEXT NOT NULL,
  item_description TEXT NOT NULL,
  quantity INT NOT NULL,
  vendor_id INT UNSIGNED NOT NULL,
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
  INDEX idx_pr_status (status)
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
