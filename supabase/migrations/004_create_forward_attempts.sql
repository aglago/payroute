-- PayRoute Forward Attempts Table
-- Tracks all forward attempts (automatic, manual, retry) for each webhook

CREATE TABLE IF NOT EXISTS webhook_forward_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to parent webhook
  webhook_log_id UUID NOT NULL REFERENCES webhook_logs(id) ON DELETE CASCADE,

  -- Attempt info
  attempt_number INTEGER NOT NULL DEFAULT 1,
  attempt_type VARCHAR(20) NOT NULL, -- 'auto', 'manual', 'retry'

  -- Destination info
  destination_app VARCHAR(50) NOT NULL,
  destination_url TEXT NOT NULL,

  -- Result
  status VARCHAR(20) NOT NULL, -- 'success', 'failed'
  response_status INTEGER,
  response_body JSONB,
  duration_ms INTEGER,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_forward_attempts_webhook_log_id ON webhook_forward_attempts(webhook_log_id);
CREATE INDEX idx_forward_attempts_created_at ON webhook_forward_attempts(created_at DESC);
CREATE INDEX idx_forward_attempts_status ON webhook_forward_attempts(status);

-- Enable Row Level Security
ALTER TABLE webhook_forward_attempts ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role has full access to webhook_forward_attempts"
  ON webhook_forward_attempts
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
