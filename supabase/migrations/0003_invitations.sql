-- 0003 — Invitations
-- A single-use, time-limited, revocable invite bound to a target phone number.
-- Only the HASH of the token is stored — the raw token lives only in the SMS link,
-- so a database leak can't reconstruct usable invitations.

create table public.invitation (
  id                uuid primary key default gen_random_uuid(),
  public_id         text unique not null,                  -- INV-…
  box_id            uuid not null references public.box(id) on delete cascade,
  target_role       text not null check (target_role in ('creator','user')),
  target_phone_enc  bytea not null,
  target_phone_hash text not null,                          -- keyed HMAC of target phone
  token_hash        text unique not null,                   -- HMAC of the raw invite token
  invited_by        uuid not null references public.account(id),
  expires_at        timestamptz not null,
  used_at           timestamptz,
  revoked_at        timestamptz,
  created_at        timestamptz not null default now()
);

create index invitation_box_idx        on public.invitation (box_id);
create index invitation_phonehash_idx  on public.invitation (target_phone_hash);

-- An invitation is "pending" only while unused, unrevoked and unexpired.
create index invitation_pending_idx on public.invitation (token_hash)
  where used_at is null and revoked_at is null;
