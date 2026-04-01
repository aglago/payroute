-- Re-enable RLS on all tables for security
-- Service role (used by our API) bypasses RLS, so this won't affect the app
-- This prevents unauthorized access via anon key

-- Enable RLS on all tables
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_letter_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_forward_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
-- These tables are server-side only, accessed via service role key

CREATE POLICY "Service role access" ON webhook_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access" ON dead_letter_webhooks
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access" ON app_configs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role access" ON webhook_forward_attempts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
