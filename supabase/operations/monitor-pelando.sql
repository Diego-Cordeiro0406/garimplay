-- Consultas administrativas. Não exibem segredos.
select enabled,last_finished_at,lease_until from public.collector_control where id='pelando';
select started_at,finished_at,summary from public.collector_runs order by finished_at desc limit 20;
select jobid,jobname,schedule,active from cron.job where jobname='garimplay-collect-pelando';
-- Referências HTTP são assíncronas: sucesso do comando SQL não garante sucesso da função.
select id,status_code,error_msg,created from net._http_response order by created desc limit 10;
