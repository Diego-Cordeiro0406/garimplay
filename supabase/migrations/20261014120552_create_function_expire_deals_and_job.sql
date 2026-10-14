CREATE OR REPLACE FUNCTION public.expire_deals()
RETURNS integer
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  affected_count integer;
BEGIN
  UPDATE public.deals
  SET
    status = 'expired',
    updated_at = now()
  WHERE status = 'published'
    AND expires_at IS NOT NULL
    AND expires_at <= now();

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  RETURN affected_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_deals()
FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.schedule(
  'garimplay-expire-deals',
  '* * * * *',
  $$ SELECT public.expire_deals(); $$
);