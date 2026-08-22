-- 0011 — Admin fingerprint (WebAuthn) + operator phone allowlist
-- Adds passkey (fingerprint) step-up for the admin backend, plus an allowlist so
-- specific phone numbers are always granted platform_operator. Phones are matched
-- by keyed HMAC (phone_hash) — plaintext is never stored here either.
-- All access via the service-role server routes; RLS deny-by-default as the 2nd lock.

-- Numbers that should always be platform_operator (matched by phone_hash).
create table public.admin_phone_allowlist (
  phone_hash text primary key,          -- HMAC-SHA256 of the E.164 phone (lib/crypto)
  label      text,
  created_at timestamptz not null default now()
);

-- Registered passkeys (device biometric / fingerprint) for an account.
create table public.webauthn_credential (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.account(id) on delete cascade,
  credential_id text not null unique,   -- base64url
  public_key    text not null,          -- base64
  counter       bigint not null default 0,
  transports    text[] not null default '{}',
  device_label  text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
create index webauthn_credential_account_idx on public.webauthn_credential (account_id);

-- Short-lived registration/authentication challenges.
create table public.webauthn_challenge (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.account(id) on delete cascade,
  challenge  text not null,
  kind       text not null check (kind in ('register','authenticate')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index webauthn_challenge_account_idx on public.webauthn_challenge (account_id, kind);

alter table public.admin_phone_allowlist enable row level security;
alter table public.webauthn_credential   enable row level security;
alter table public.webauthn_challenge     enable row level security;
revoke all on public.admin_phone_allowlist, public.webauthn_credential, public.webauthn_challenge from anon, authenticated;
grant all on public.admin_phone_allowlist, public.webauthn_credential, public.webauthn_challenge to service_role;
