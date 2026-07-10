-- Run this once via phpMyAdmin on the existing database (schema.sql's
-- CREATE TABLE IF NOT EXISTS won't touch a table that already exists).
--
-- Employees now pick a vendor category when submitting a request; an admin
-- assigns the actual vendor afterwards, once the manager approves.

ALTER TABLE purchase_requests
  MODIFY vendor_id INT UNSIGNED NULL,
  ADD COLUMN category_id INT UNSIGNED NULL AFTER vendor_id,
  ADD INDEX idx_pr_category (category_id);
