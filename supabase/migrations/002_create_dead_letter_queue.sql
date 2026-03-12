-- PayRoute Dead Letter Queue
-- Stores webhooks that couldn't be routed to any destination

CREATE TABLE IF NOT EXISTS dead_letter_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Webhook data
  payload JSONB NOT NULL,
  reference VARCHAR(100),
  reason VARCHAR(255) NOT NULL, -- 'no_matching_app', 'missing_metadata', etc.

  -- Source info
  ip_address VARCHAR(45),
  headers JSONB,

  -- Review status
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(100),

  -- Resolution
  resolution VARCHAR(50), -- 'forwarded', 'ignored', 'manual_processed'
  resolution_notes TEXT,
  forwarded_to VARCHAR(50), -- app id if manually forwarded

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dead_letter_created_at ON dead_letter_webhooks(created_at DESC);
CREATE INDEX idx_dead_letter_reviewed ON dead_letter_webhooks(reviewed);
CREATE INDEX idx_dead_letter_reference ON dead_letter_webhooks(reference);

-- Enable Row Level Security
ALTER TABLE dead_letter_webhooks ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role has full access to dead_letter_webhooks"
  ON dead_letter_webhooks
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dead_letter_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_dead_letter_updated_at
  BEFORE UPDATE ON dead_letter_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_dead_letter_updated_at();
