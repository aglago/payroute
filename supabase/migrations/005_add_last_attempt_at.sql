-- Add last_attempt_at to track when the most recent forward attempt was made
ALTER TABLE webhook_logs ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

-- Initialize existing rows with created_at as fallback
UPDATE webhook_logs SET last_attempt_at = created_at WHERE last_attempt_at IS NULL;
