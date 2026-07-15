-- Run this once via phpMyAdmin on the existing database.
--
-- Adds support for Refund Requests (a second request "type" alongside the
-- existing purchase requests) plus a quotation/invoice total amount.
-- All columns are additive/nullable so existing purchase requests are
-- unaffected.

ALTER TABLE purchase_requests
  ADD COLUMN type VARCHAR(16) NOT NULL DEFAULT 'purchase' AFTER request_number,
  ADD COLUMN invoice_url TEXT NULL AFTER quotation_url,
  ADD COLUMN quotation_amount DOUBLE NULL AFTER quotation_url,
  ADD INDEX idx_pr_type (type);
