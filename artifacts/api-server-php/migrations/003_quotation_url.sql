-- Run this once via phpMyAdmin on the existing database.
--
-- Every request now always passes through the admin after manager approval
-- (not just ones missing a vendor) so a quotation link can be attached.

ALTER TABLE purchase_requests
  ADD COLUMN quotation_url TEXT NULL AFTER category_id;
