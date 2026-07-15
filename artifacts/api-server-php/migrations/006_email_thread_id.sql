-- Run this once via phpMyAdmin on the existing database.
--
-- Lets every notification email sent for the same request thread together
-- in the recipient's inbox instead of appearing as unrelated messages.

ALTER TABLE purchase_requests
  ADD COLUMN email_thread_id VARCHAR(255) NULL AFTER quotation_amount;
