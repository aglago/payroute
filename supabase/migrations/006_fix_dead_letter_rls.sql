-- Fix RLS for PayRoute tables
-- All tables are only accessed server-side via service role key
-- Disabling RLS is safe since tables are protected at the API layer
-- (service role bypasses RLS anyway, this just ensures no edge cases)

-- Fix dead_letter_webhooks
DROP POLICY IF EXISTS "Service role has full access to dead_letter_webhooks" ON dead_letter_webhooks;
ALTER TABLE dead_letter_webhooks DISABLE ROW LEVEL SECURITY;

-- Fix webhook_logs
DROP POLICY IF EXISTS "Service role has full access to webhook_logs" ON webhook_logs;
ALTER TABLE webhook_logs DISABLE ROW LEVEL SECURITY;

-- Fix app_configs
DROP POLICY IF EXISTS "Service role has full access to app_configs" ON app_configs;
ALTER TABLE app_configs DISABLE ROW LEVEL SECURITY;

-- Fix webhook_forward_attempts (if exists)
DROP POLICY IF EXISTS "Service role has full access to webhook_forward_attempts" ON webhook_forward_attempts;
ALTER TABLE webhook_forward_attempts DISABLE ROW LEVEL SECURITY;
