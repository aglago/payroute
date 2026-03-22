-- Add is_test column to webhook_logs for test mode filtering
-- Paystack sends domain: "test" for test webhooks, domain: "live" for live webhooks

ALTER TABLE webhook_logs
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

-- Index for filtering test vs live webhooks
CREATE INDEX IF NOT EXISTS idx_webhook_logs_is_test ON webhook_logs(is_test);

-- Also add to dead_letter_webhooks for consistency
ALTER TABLE dead_letter_webhooks
ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_dead_letter_is_test ON dead_letter_webhooks(is_test);
