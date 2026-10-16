-- Banco local de teste; baseado no esquema fornecido. Não aplicar no Supabase.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create table public.stores(id uuid primary key default gen_random_uuid(),name text not null unique,website_url text,logo_url text,created_at timestamptz not null default now(), check(length(btrim(name))>0));
create table public.platforms(id text primary key check(id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),name text not null unique,created_at timestamptz not null default now(),check(length(btrim(name))>0));
create table public.user_roles(user_id uuid primary key references auth.users(id) on delete cascade,role text not null default 'admin' check(role='admin'),created_at timestamptz not null default now());
create table public.deals(
 id uuid primary key default gen_random_uuid(),title text not null check(length(btrim(title))>0),description text,image_url text,
 price_cents integer not null check(price_cents>=0),original_price_cents integer check(original_price_cents is null or original_price_cents>=0),
 deal_url text not null check(deal_url ~* '^https://[^[:space:]]+$'),
 store_id uuid not null references public.stores(id) on delete restrict,
 platform_id text not null references public.platforms(id) on delete restrict,
 coupon_code text check(coupon_code is null or length(btrim(coupon_code))>0),coupon_url text,
 payment_conditions text,rules text,status text not null default 'draft' check(status in ('draft','published','expired')),
 expires_at timestamptz,created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(coupon_code is null or coupon_url is null));
create function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now();return new;end; $$;
create trigger deals_set_updated_at before update on public.deals for each row execute function public.set_updated_at();
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin'); $$;
revoke all on function public.is_admin() from public,anon,authenticated;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.set_updated_at() from public,anon,authenticated;
alter table public.deals enable row level security;
revoke all on public.deals from anon,authenticated;
grant select on public.deals to anon,authenticated;
grant insert,update,delete on public.deals to authenticated;
create policy "Public can read published deals" on public.deals for select to anon,authenticated using(status in ('published','expired'));
create policy "Admins can read all deals" on public.deals for select to authenticated using((select public.is_admin()));
create policy "Admins can insert deals" on public.deals for insert to authenticated with check((select public.is_admin()));
create policy "Admins can update deals" on public.deals for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
