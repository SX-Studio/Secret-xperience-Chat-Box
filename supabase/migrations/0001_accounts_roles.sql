-- 0001 — Accounts & roles
-- One person = one account, regardless of role. Roles are separate, box-scoped
-- rows so the same account can be e.g. a creator in one box and a user in another.
-- The phone number is stored ENCRYPTED (phone_enc) plus a keyed HMAC (phone_hash)
-- that lets us look an account up without decrypting anything.

create extension if not exists pgcrypto;

-- ── account ───────────────────────────────────────────────────────────
create table public.account (
  id                uuid primary key default gen_random_uuid(),
  public_id         text unique not null,                 -- USR-… / CRT-…
  phone_enc         bytea not null,                        -- AES-256-GCM ciphertext
  phone_hash        text unique not null,                  -- HMAC-SHA256(e164) — lookup key
  status            text not null default 'active'
                    check (status in ('active','restricted','suspended')),
  phone_verified_at timestamptz,
  created_at        timestamptz not null default now()
);

comment on column public.account.phone_enc  is 'Encrypted E.164 phone. Never store or log plaintext.';
comment on column public.account.phone_hash is 'Keyed HMAC of the E.164 phone; enables equality lookup without decryption.';

-- ── account_role ──────────────────────────────────────────────────────
-- box_id is nullable: platform_operator / moderator are platform-wide (box_id null).
-- The FK to box() is added in 0002 once the box table exists.
create table public.account_role (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.account(id) on delete cascade,
  role       text not null
             check (role in ('platform_operator','moderator','box_admin','creator','user')),
  box_id     uuid,
  created_at timestamptz not null default now(),
  unique (account_id, role, box_id)
);

create index account_role_account_idx on public.account_role (account_id);
create index account_role_box_idx     on public.account_role (box_id);
