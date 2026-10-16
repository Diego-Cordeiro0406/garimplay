-- Pré-requisitos: stores, platforms, deals, is_admin() e set_updated_at() existentes.
create table public.imported_offers (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source = 'pelando'),
  external_id text not null check (length(btrim(external_id)) between 1 and 200),
  source_data jsonb not null check (jsonb_typeof(source_data) = 'object'),
  source_collected_at timestamptz not null,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  review_status text not null default 'pending' check (review_status in ('pending','discarded','imported')),
  deal_id uuid references public.deals(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  unique (source, external_id)
);
create index imported_offers_review_received_idx on public.imported_offers(review_status, received_at desc);
create trigger imported_offers_set_updated_at before update on public.imported_offers
for each row execute function public.set_updated_at();
alter table public.imported_offers enable row level security;
revoke all on public.imported_offers from public, anon, authenticated;
grant select on public.imported_offers to authenticated;
create policy "Admins can read imported offers" on public.imported_offers
for select to authenticated using ((select public.is_admin()));
-- Revisão e conversão passam por funções, sem UPDATE direto nos dados da fonte.

create function public.ingest_imported_offers(p_offers jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare item jsonb; collected timestamptz; receipts jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_offers) is distinct from 'array' then
    raise exception 'Expected array';
  end if;
  if jsonb_array_length(p_offers) not between 1 and 50 then
    raise exception 'Batch must contain 1-50 offers';
  end if;
  for item in select value from jsonb_array_elements(p_offers) loop
    if item->>'source' is distinct from 'pelando'
       or coalesce(length(btrim(item->>'external_id')),0) not between 1 and 200
       or coalesce(length(btrim(item->>'title')),0) not between 3 and 200
       or jsonb_typeof(item) is distinct from 'object' then
      raise exception 'Invalid source, identity or title';
    end if;
    collected := (item->>'collected_at')::timestamptz;
    if collected is null or collected > now() + interval '5 minutes' then
      raise exception 'Invalid collection time';
    end if;
    insert into public.imported_offers(source, external_id, source_data, source_collected_at)
    values ('pelando', item->>'external_id', item, collected)
    on conflict (source, external_id) do update
    set source_data = excluded.source_data,
        source_collected_at = excluded.source_collected_at
    where excluded.source_collected_at > public.imported_offers.source_collected_at
       or (excluded.source_collected_at = public.imported_offers.source_collected_at
           and excluded.source_data - 'verification' = public.imported_offers.source_data - 'verification'
           and coalesce((excluded.source_data #>> '{verification,checked_at}')::timestamptz, '-infinity'::timestamptz)
             > coalesce((public.imported_offers.source_data #>> '{verification,checked_at}')::timestamptz, '-infinity'::timestamptz));
    -- Reenvios antigos também são confirmados: o banco já possui uma revisão igual ou mais nova.
    receipts := receipts || jsonb_build_array(jsonb_build_object(
      'source','pelando','external_id',item->>'external_id','collected_at',item->>'collected_at'));
  end loop;
  return jsonb_build_object('accepted',receipts);
end;
$$;
revoke all on function public.ingest_imported_offers(jsonb) from public, anon, authenticated;
grant execute on function public.ingest_imported_offers(jsonb) to service_role;

create function public.review_imported_offer(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  if p_status not in ('pending','discarded') or p_status is null then
    raise exception 'Invalid review status';
  end if;
  update public.imported_offers set review_status=p_status,
    reviewed_by=auth.uid(), reviewed_at=now()
  where id=p_id and review_status <> 'imported';
  if not found then raise exception 'Import not found or already converted'; end if;
end;
$$;
revoke all on function public.review_imported_offer(uuid,text) from public, anon, authenticated;
grant execute on function public.review_imported_offer(uuid,text) to authenticated;

create function public.convert_imported_offer(p_id uuid, p_values jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare imported public.imported_offers; new_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
  select * into imported from public.imported_offers where id=p_id for update;
  if not found then raise exception 'Import not found'; end if;
  if imported.review_status='imported' then
    if imported.deal_id is null then raise exception 'Previously created deal was deleted'; end if;
    return imported.deal_id;
  end if;
  if imported.review_status='discarded' then raise exception 'Restore the import before conversion'; end if;
  if jsonb_typeof(p_values) is distinct from 'object'
    or coalesce(length(btrim(p_values->>'title')),0) not between 3 and 200
    or length(coalesce(p_values->>'description','')) > 5000
    or coalesce((p_values->>'price_cents')::integer, -1) < 0
    or coalesce(p_values->>'deal_url','') !~* '^https://[^[:space:]]+$'
    or (nullif(p_values->>'image_url','') is not null and p_values->>'image_url' !~* '^https://[^[:space:]]+$')
    or (nullif(p_values->>'coupon_url','') is not null and p_values->>'coupon_url' !~* '^https://[^[:space:]]+$')
    or (nullif(p_values->>'original_price_cents','') is not null
        and (p_values->>'original_price_cents')::integer <= (p_values->>'price_cents')::integer)
    or length(coalesce(p_values->>'coupon_code','')) > 100
    or length(coalesce(p_values->>'payment_conditions','')) > 1000
    or length(coalesce(p_values->>'rules','')) > 3000
    then raise exception 'Invalid deal data';
  end if;
  insert into public.deals(title,description,image_url,price_cents,original_price_cents,deal_url,
    store_id,platform_id,coupon_code,coupon_url,payment_conditions,rules,expires_at,status,created_by)
  values (btrim(p_values->>'title'),nullif(btrim(p_values->>'description'),''),nullif(p_values->>'image_url',''),
    (p_values->>'price_cents')::integer,nullif(p_values->>'original_price_cents','')::integer,
    p_values->>'deal_url',(p_values->>'store_id')::uuid,p_values->>'platform_id',
    nullif(btrim(p_values->>'coupon_code'),''),nullif(p_values->>'coupon_url',''),
    nullif(btrim(p_values->>'payment_conditions'),''),nullif(btrim(p_values->>'rules'),''),
    nullif(p_values->>'expires_at','')::timestamptz,'draft',auth.uid()) returning id into new_id;
  update public.imported_offers set review_status='imported',deal_id=new_id,
    reviewed_by=auth.uid(),reviewed_at=now() where id=p_id;
  return new_id;
end;
$$;
revoke all on function public.convert_imported_offer(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.convert_imported_offer(uuid,jsonb) to authenticated;
