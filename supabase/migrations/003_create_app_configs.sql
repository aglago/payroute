-- PayRoute App Configurations
-- Stores registered destination apps for webhook routing

CREATE TABLE IF NOT EXISTS app_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- App identification
  app_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,

  -- Webhook configuration
  webhook_url TEXT NOT NULL,
  router_secret VARCHAR(255) NOT NULL,

  -- Routing rules
  prefixes TEXT[] DEFAULT '{}',

  -- Status
  enabled BOOLEAN DEFAULT true,

  -- Metadata
  description TEXT,
  icon VARCHAR(10), -- Emoji or single character
  color VARCHAR(20), -- Hex color for UI

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_app_configs_app_id ON app_configs(app_id);
CREATE INDEX idx_app_configs_enabled ON app_configs(enabled);

-- Enable Row Level Security
ALTER TABLE app_configs ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role has full access to app_configs"
  ON app_configs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_app_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_app_configs_updated_at
  BEFORE UPDATE ON app_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_app_configs_updated_at();
