-- 0006 — OTP challenges
-- One row per verification attempt. code_hash is a keyed HMAC (never the raw code).
-- attempts caps guessing; consumed_at makes a challenge single-use; expires_at bounds
-- its lifetime. Rate limiting counts recent rows per phone_hash.

create table public.otp_challenge (
  id          uuid primary key default gen_random_uuid(),
  phone_hash  text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  consumed_at timestamptz,
  request_ip  text,
  created_at  timestamptz not null default now()
);

create index otp_challenge_phone_idx  on public.otp_challenge (phone_hash, created_at desc);
create index otp_challenge_active_idx on public.otp_challenge (phone_hash)
  where consumed_at is null;

alter table public.otp_challenge enable row level security;
revoke all on public.otp_challenge from anon, authenticated;
grant all on public.otp_challenge to service_role;
