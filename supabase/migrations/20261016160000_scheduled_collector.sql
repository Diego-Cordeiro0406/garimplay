-- Aplicar DEPOIS da migration de imported_offers já instalada.
create table public.collector_control (
  id text primary key check(id='pelando'),
  enabled boolean not null default true,
  visitor_id uuid not null default gen_random_uuid(),
  cursors jsonb not null default '{}'::jsonb,
  lease_token uuid,
  lease_until timestamptz,
  last_finished_at timestamptz
);
insert into public.collector_control(id) values('pelando');
create table public.collector_runs (
  id uuid primary key,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  summary jsonb not null
);
create index collector_runs_finished_idx on public.collector_runs(finished_at);
create table public.offer_verification_cache (
  product_url text primary key,
  result jsonb,
  expires_at timestamptz,
  lease_token uuid,
  lease_until timestamptz
);
create index verification_cache_expiry_idx on public.offer_verification_cache(expires_at);
alter table public.collector_control enable row level security;
alter table public.collector_runs enable row level security;
alter table public.offer_verification_cache enable row level security;
revoke all on public.collector_control,public.collector_runs,public.offer_verification_cache from public,anon,authenticated;
grant select on public.collector_control,public.collector_runs to authenticated;
create policy "Admins read collector control" on public.collector_control for select to authenticated using((select public.is_admin()));
create policy "Admins read collector runs" on public.collector_runs for select to authenticated using((select public.is_admin()));

create table public.collector_seen_nonces(nonce uuid primary key,expires_at timestamptz not null);
alter table public.collector_seen_nonces enable row level security;
revoke all on public.collector_seen_nonces from public,anon,authenticated;

create function public.claim_pelando_collection(p_nonce uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare control public.collector_control; inserted integer;
begin
  delete from public.collector_seen_nonces where expires_at<now();
  insert into public.collector_seen_nonces(nonce,expires_at) values(p_nonce,now()+interval '5 minutes') on conflict do nothing;
  get diagnostics inserted=row_count;
  if inserted=0 then return null; end if;
  update public.collector_control
  set lease_token=gen_random_uuid(), lease_until=now()+interval '120 seconds'
  where id='pelando' and enabled and (lease_until is null or lease_until<now()) returning * into control;
  if not found then return null; end if;
  return jsonb_build_object('token',control.lease_token,'visitor_id',control.visitor_id,'cursors',control.cursors,'started_at',now());
end; $$;
revoke all on function public.claim_pelando_collection(uuid) from public,anon,authenticated;
grant execute on function public.claim_pelando_collection(uuid) to service_role;

-- Compara somente campos estáveis, sem horários de coleta, comentários, contadores ou verificação.
create function public.import_content_fingerprint(p_data jsonb)
returns text language sql immutable set search_path='' as $$
 select md5(jsonb_build_object(
 'source_url',p_data->'source_url','title',p_data->'title','price',p_data->'price_cents','currency',p_data->'currency',
 'product_url',p_data->'product_url','image',p_data->'image_url','status',p_data->'source_status',
 'store_name',p_data#>'{store,name}','platforms',p_data->'platform_suggestions',
 'media',p_data->'physical_media','approved',p_data->'approved_at')::text);
$$;
revoke all on function public.import_content_fingerprint(jsonb) from public,anon,authenticated;

create function public.finish_pelando_collection(p_token uuid,p_offers jsonb,p_cursors jsonb,p_summary jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; affected integer; saved integer:=0; started timestamptz;
begin
  select lease_until-interval '120 seconds' into started from public.collector_control
    where id='pelando' and lease_token=p_token and lease_until>now() for update;
  if not found then raise exception 'Lease expired or no longer owned'; end if;
  if jsonb_typeof(p_offers) is distinct from 'array' or jsonb_array_length(p_offers)>200
     or jsonb_typeof(p_cursors) is distinct from 'object' then raise exception 'Invalid collection'; end if;
  for item in select value from jsonb_array_elements(p_offers) loop
    if item->>'source' is distinct from 'pelando' or item->>'source_status' is distinct from 'active'
       or coalesce(length(btrim(item->>'external_id')),0) not between 1 and 200
       or coalesce(length(btrim(item->>'title')),0) not between 3 and 200
       or item->>'collected_at' is null then raise exception 'Invalid offer'; end if;
    insert into public.imported_offers(source,external_id,source_data,source_collected_at)
    values('pelando',item->>'external_id',item,(item->>'collected_at')::timestamptz)
    on conflict(source,external_id) do update
      set source_data=excluded.source_data ||
        case when public.imported_offers.source_data->>'product_url'=excluded.source_data->>'product_url'
          and public.imported_offers.source_data ? 'verification'
          then jsonb_build_object('verification',public.imported_offers.source_data->'verification') else '{}'::jsonb end,
          source_collected_at=excluded.source_collected_at
    where excluded.source_collected_at>public.imported_offers.source_collected_at
      and public.import_content_fingerprint(excluded.source_data)<>public.import_content_fingerprint(public.imported_offers.source_data);
    get diagnostics affected=row_count; saved:=saved+affected;
  end loop;
  update public.collector_control set cursors=p_cursors,last_finished_at=now(),lease_token=null,lease_until=null where id='pelando';
  insert into public.collector_runs(id,started_at,summary) values(p_token,started,p_summary||jsonb_build_object('rows_written',saved));
  -- Somente resumos; retenção curta, sem HTML ou respostas brutas.
  delete from public.collector_runs where finished_at<now()-interval '7 days';
  delete from public.offer_verification_cache where expires_at<now()-interval '7 days' and (lease_until is null or lease_until<now());
  return jsonb_build_object('rows_written',saved);
end; $$;
revoke all on function public.finish_pelando_collection(uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.finish_pelando_collection(uuid,jsonb,jsonb,jsonb) to service_role;

create function public.claim_offer_verification(p_url text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare row public.offer_verification_cache;
begin
  insert into public.offer_verification_cache(product_url) values(p_url) on conflict do nothing;
  select * into row from public.offer_verification_cache where product_url=p_url for update;
  if row.expires_at>now() and row.result is not null then return jsonb_build_object('cached',row.result); end if;
  if row.lease_until>now() then return jsonb_build_object('busy',true); end if;
  update public.offer_verification_cache set lease_token=gen_random_uuid(),lease_until=now()+interval '30 seconds'
    where product_url=p_url returning * into row;
  return jsonb_build_object('token',row.lease_token);
end; $$;
revoke all on function public.claim_offer_verification(text) from public,anon,authenticated;
grant execute on function public.claim_offer_verification(text) to service_role;

create function public.complete_offer_verification(p_url text,p_token uuid,p_result jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.offer_verification_cache set result=p_result,
    expires_at=now()+case when p_result->>'result' in ('physical_explicit_in_store','boxed_code_in_store','physical_packaging_in_store','excluded_digital_without_packaging')
      then interval '6 hours' else interval '30 minutes' end,lease_token=null,lease_until=null
    where product_url=p_url and lease_token=p_token and lease_until>now();
  if not found then raise exception 'Verification lease expired'; end if;
end; $$;
revoke all on function public.complete_offer_verification(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.complete_offer_verification(text,uuid,jsonb) to service_role;

create function public.attach_offer_verification(p_id uuid,p_expected_url text,p_result jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.imported_offers set source_data=source_data||jsonb_build_object('verification',p_result)
    where id=p_id and source_data->>'product_url'=p_expected_url
      and (source_data->'verification') is distinct from p_result;
  return found;
end; $$;
revoke all on function public.attach_offer_verification(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.attach_offer_verification(uuid,text,jsonb) to service_role;
