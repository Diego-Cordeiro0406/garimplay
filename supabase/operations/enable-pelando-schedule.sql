-- Executar por último, após teste manual bem-sucedido.
-- Falha antes de agendar se faltar configuração; não transmite segredos para a saída.
do $$ begin
  if to_regprocedure('public.dispatch_pelando_collection()') is null then
    raise exception 'Execute prepare-pelando-dispatcher.sql first';
  end if;
  if not exists(select 1 from vault.decrypted_secrets where name='garimplay_project_url' and decrypted_secret ~ '^https://[a-z0-9]+\.supabase\.co$')
     or not exists(select 1 from vault.decrypted_secrets where name='garimplay_collector_secret' and length(decrypted_secret)>=32)
  then raise exception 'Configure the two Vault secrets before scheduling'; end if;
end $$;
-- Nome fixo: executar novamente atualiza o job, em vez de criar outro.
select cron.schedule('garimplay-collect-pelando','7,37 * * * *','select public.dispatch_pelando_collection();');
