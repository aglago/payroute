-- PayRoute Webhook Logs Table
-- Tracks all incoming webhooks and their routing/forwarding status

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source info
  source VARCHAR(50) NOT NULL DEFAULT 'paystack',
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) DEFAULT 'POST',
  headers JSONB,
  payload JSONB NOT NULL,

  -- Routing info
  destination_app VARCHAR(50),
  destination_url TEXT,
  routing_strategy VARCHAR(20), -- 'metadata', 'prefix', 'none'
  reference VARCHAR(100),

  -- Forward status
  forward_status VARCHAR(20), -- 'success', 'failed', 'skipped', 'dead_letter'
  forward_response_status INTEGER,
  forward_response_body JSONB,
  forward_duration_ms INTEGER,

  -- Processing info
  processing_time_ms INTEGER,
  ip_address VARCHAR(45),
  error_message TEXT,
  trace_logs JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_reference ON webhook_logs(reference);
CREATE INDEX idx_webhook_logs_destination_app ON webhook_logs(destination_app);
CREATE INDEX idx_webhook_logs_forward_status ON webhook_logs(forward_status);

-- Enable Row Level Security
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role has full access to webhook_logs"
  ON webhook_logs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
