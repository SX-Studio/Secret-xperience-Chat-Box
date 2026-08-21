-- 0009 — Rental engine (Phase 3)
-- Each rental is its own time-bound entitlement: purchased_at (server clock) and
-- expires_at = purchased_at + rental_hours. rent_content() does the whole thing in
-- one transaction — debit the renter, record the creator's earning split, create the
-- rental — so money and access can never diverge.

create table public.rental (
  id           uuid primary key default gen_random_uuid(),
  public_id    text unique not null,                    -- RNT-…
  content_id   uuid not null references public.content(id) on delete cascade,
  user_id      uuid not null references public.account(id) on delete cascade,
  box_id       uuid not null references public.box(id) on delete cascade,
  price_tokens int not null,
  purchased_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  status       text not null default 'active' check (status in ('active','expired','revoked')),
  created_at   timestamptz not null default now()
);
create index rental_user_idx    on public.rental (user_id, status, expires_at);
create index rental_content_idx on public.rental (content_id);
-- At most one ACTIVE rental per (user, content) — makes rent idempotent under retries.
create unique index rental_active_unique on public.rental (user_id, content_id) where status = 'active';

alter table public.earning
  add constraint earning_rental_fk foreign key (rental_id) references public.rental(id) on delete set null;

-- Atomic rent. Reuses wallet_apply for the debit (throws INSUFFICIENT_FUNDS). Returns
-- the created (or already-active) rental.
create or replace function public.rent_content(p_user uuid, p_content uuid, p_idempotency_key text)
returns table(rental_public_id text, expires_at timestamptz, price int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_content   public.content%rowtype;
  v_hours     int;
  v_split     numeric;
  v_price     int;
  v_creator   int;
  v_platform  int;
  v_pub       text;
  v_rid       uuid;
  v_exp       timestamptz;
  v_ex_pub    text;
  v_ex_exp    timestamptz;
  v_ex_price  int;
begin
  select * into v_content from public.content where id = p_content for update;
  if not found or v_content.status <> 'approved' then
    raise exception 'CONTENT_UNAVAILABLE';
  end if;
  if v_content.creator_id = p_user then
    raise exception 'CANNOT_RENT_OWN';
  end if;

  select r.public_id, r.expires_at, r.price_tokens into v_ex_pub, v_ex_exp, v_ex_price
    from public.rental r
    where r.user_id = p_user and r.content_id = p_content and r.status = 'active';
  if found then
    return query select v_ex_pub, v_ex_exp, v_ex_price;
    return;
  end if;

  v_hours := coalesce((select value::int from public.app_config where key = 'rental_hours'), 24);
  v_split := coalesce((select value::numeric from public.app_config where key = 'creator_split'), 0.8);
  v_price := v_content.price_tokens;
  v_creator := floor(v_price * v_split)::int;
  v_platform := v_price - v_creator;

  perform public.wallet_apply(p_user, -v_price, 'rental_debit', 'content', v_content.public_id, p_idempotency_key);

  v_pub := 'RNT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.rental (public_id, content_id, user_id, box_id, price_tokens, expires_at)
    values (v_pub, p_content, p_user, v_content.box_id, v_price, now() + make_interval(hours => v_hours))
    returning id, rental.expires_at into v_rid, v_exp;

  insert into public.earning (creator_id, rental_id, gross_tokens, creator_tokens, platform_tokens, state, available_at)
    values (v_content.creator_id, v_rid, v_price, v_creator, v_platform, 'available', now());

  return query select v_pub, v_exp, v_price;
end;
$$;

alter table public.rental enable row level security;
revoke all on public.rental from anon, authenticated;
grant all on public.rental to service_role;
grant usage, select on all sequences in schema public to service_role;

revoke execute on function public.rent_content(uuid, uuid, text) from anon, authenticated, public;
grant execute on function public.rent_content(uuid, uuid, text) to service_role;
