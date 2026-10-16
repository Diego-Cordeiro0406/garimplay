-- Prepara o disparador assinado, sem ativar coleta periódica.
-- Executar por último, após a migration nova, as duas funções publicadas e os segredos no Vault.
-- Não contém segredo nem recria o job garimplay-expire-deals já existente.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.dispatch_pelando_collection()
returns bigint language plpgsql security definer set search_path='' as $$
declare project_url text; secret text; request_id bigint; nonce uuid:=gen_random_uuid(); epoch text; signature text; crypto_schema text;
begin
  if not exists(select 1 from public.collector_control where id='pelando' and enabled) then return null; end if;
  select decrypted_secret into project_url from vault.decrypted_secrets where name='garimplay_project_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name='garimplay_collector_secret';
  if project_url is null or project_url !~ '^https://[a-z0-9]+\.supabase\.co$' or coalesce(length(secret),0)<32 then
    raise exception 'Configure garimplay_project_url and garimplay_collector_secret in Vault';
  end if;
  epoch:=floor(extract(epoch from clock_timestamp()))::bigint::text;
  select n.nspname into crypto_schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto';
  execute format('select encode(%I.hmac($1,$2,''sha256''),''hex'')',crypto_schema)
    into signature using convert_to(epoch||':'||nonce::text,'UTF8'),convert_to(secret,'UTF8');
  select net.http_post(
    url:=project_url||'/functions/v1/collect-pelando',
    headers:=jsonb_build_object('Content-Type','application/json','x-collector-time',epoch,'x-collector-nonce',nonce::text,'x-collector-signature',signature),
    body:='{}'::jsonb,timeout_milliseconds:=60000
  ) into request_id;
  delete from cron.job_run_details where jobid in (select jobid from cron.job where jobname='garimplay-collect-pelando')
    and end_time<now()-interval '7 days';
  return request_id;
end; $$;
revoke all on function public.dispatch_pelando_collection() from public,anon,authenticated,service_role;

