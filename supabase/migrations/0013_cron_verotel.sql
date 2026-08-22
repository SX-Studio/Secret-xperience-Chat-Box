-- 0013 — Expiry sweep + token orders (Verotel)
-- expire_rentals(): scheduled sweep flipping expired rentals (on-access checks
-- already enforce expiry; this is defense-in-depth for the /rentals list etc).
-- token_order: a fiat purchase of tokens via an adult-friendly PSP (Verotel).

create or replace function public.expire_rentals()
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.rental set status = 'expired'
   where status = 'active' and expires_at <= now();
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.expire_rentals() from public, anon, authenticated;
grant execute on function public.expire_rentals() to service_role;

create table public.token_order (
  id           uuid primary key default gen_random_uuid(),
  public_id    text unique not null,                 -- ORD-…
  account_id   uuid not null references public.account(id) on delete cascade,
  tokens       integer not null check (tokens > 0),
  eur_cents    integer not null check (eur_cents >= 0),
  provider     text not null default 'verotel',
  provider_ref text,
  status       text not null default 'pending' check (status in ('pending','paid','failed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index token_order_account_idx on public.token_order (account_id, status);

alter table public.token_order enable row level security;
revoke all on public.token_order from anon, authenticated;
grant all on public.token_order to service_role;
