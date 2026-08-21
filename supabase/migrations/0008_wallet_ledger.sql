-- 0008 — Wallet, immutable ledger, earnings (Phase 3)
-- The ledger is the source of truth; wallet.balance_tokens is a cached projection.
-- All movement goes through wallet_apply(): one transaction, row-locked, idempotent,
-- and it refuses to let a balance go negative.

create table public.wallet (
  account_id     uuid primary key references public.account(id) on delete cascade,
  balance_tokens int not null default 0 check (balance_tokens >= 0),
  updated_at     timestamptz not null default now()
);

create table public.ledger_entry (
  id              bigserial primary key,
  account_id      uuid not null references public.account(id) on delete cascade,
  type            text not null check (type in
                  ('purchase','topup','rental_debit','rental_credit','platform_fee','payout','refund','adjustment')),
  amount_tokens   int not null,                 -- signed: + credit, - debit
  ref_type        text,
  ref_id          text,
  balance_after   int not null,
  idempotency_key text unique,
  created_at      timestamptz not null default now()
);
create index ledger_account_idx on public.ledger_entry (account_id, created_at desc);

-- Creator earnings from rentals (split captured at rental time). rental_id FK is
-- added in 0009 once the rental table exists.
create table public.earning (
  id              uuid primary key default gen_random_uuid(),
  creator_id      uuid not null references public.account(id) on delete cascade,
  rental_id       uuid,
  gross_tokens    int not null,
  creator_tokens  int not null,
  platform_tokens int not null,
  state           text not null default 'available' check (state in ('pending','available','withdrawn')),
  available_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index earning_creator_idx on public.earning (creator_id, state);

-- Atomic, idempotent balance mutation. Returns the new balance.
create or replace function public.wallet_apply(
  p_account uuid, p_amount int, p_type text,
  p_ref_type text, p_ref_id text, p_idempotency_key text
) returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance int;
  v_existing int;
begin
  if p_idempotency_key is not null then
    select balance_after into v_existing from public.ledger_entry where idempotency_key = p_idempotency_key;
    if found then return v_existing; end if;
  end if;

  insert into public.wallet (account_id) values (p_account) on conflict (account_id) do nothing;
  select balance_tokens into v_balance from public.wallet where account_id = p_account for update;

  v_balance := v_balance + p_amount;
  if v_balance < 0 then
    raise exception 'INSUFFICIENT_FUNDS';
  end if;

  update public.wallet set balance_tokens = v_balance, updated_at = now() where account_id = p_account;
  insert into public.ledger_entry (account_id, type, amount_tokens, ref_type, ref_id, balance_after, idempotency_key)
    values (p_account, p_type, p_amount, p_ref_type, p_ref_id, v_balance, p_idempotency_key);
  return v_balance;
end;
$$;

alter table public.wallet       enable row level security;
alter table public.ledger_entry enable row level security;
alter table public.earning      enable row level security;
revoke all on public.wallet, public.ledger_entry, public.earning from anon, authenticated;
grant all on public.wallet, public.ledger_entry, public.earning to service_role;
grant usage, select on all sequences in schema public to service_role;

-- wallet_apply is SECURITY DEFINER — it must NOT be callable via the public API
-- (a signed-in user could otherwise credit themselves). Service role only.
revoke execute on function public.wallet_apply(uuid, integer, text, text, text, text) from anon, authenticated, public;
grant execute on function public.wallet_apply(uuid, integer, text, text, text, text) to service_role;
