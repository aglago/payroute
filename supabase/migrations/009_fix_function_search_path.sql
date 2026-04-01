-- Fix function search path security warnings
-- Setting search_path prevents search path injection attacks

-- Fix update_dead_letter_updated_at function
CREATE OR REPLACE FUNCTION public.update_dead_letter_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_app_configs_updated_at function
CREATE OR REPLACE FUNCTION public.update_app_configs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
