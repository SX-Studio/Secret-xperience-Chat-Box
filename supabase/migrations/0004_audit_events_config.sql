-- 0004 — Audit log, event backbone, and configurable defaults
-- audit_log and events are append-only. events stands in for Kafka at MVP scale:
-- append here, a worker reacts. app_config holds values Phase 3+ reads at runtime
-- so token economics can change without a code deploy.

create table public.audit_log (
  id          bigserial primary key,
  actor_id    uuid,                                        -- account.id or null (system/AI)
  action      text not null,                               -- e.g. 'account.created','invitation.sent'
  target_type text,
  target_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  reason      text,
  created_at  timestamptz not null default now()
);
create index audit_log_actor_idx  on public.audit_log (actor_id, created_at desc);
create index audit_log_target_idx on public.audit_log (target_type, target_id);

create table public.events (
  id           bigserial primary key,
  type         text not null,                              -- 'INVITATION_SENT','MEMBERSHIP_CREATED',…
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);
-- Fast lookup of not-yet-processed events for the worker.
create index events_unprocessed_idx on public.events (created_at)
  where processed_at is null;

create table public.app_config (
  key   text primary key,
  value jsonb not null
);

-- Locked defaults (Phase 3 consumes these; captured now so they're single-sourced).
insert into public.app_config (key, value) values
  ('tokens_per_euro',      '100'::jsonb),
  ('creator_split',        '0.80'::jsonb),
  ('payout_threshold_eur', '50'::jsonb),
  ('rental_hours',         '24'::jsonb),
  ('invitation_ttl_hours', '72'::jsonb)
on conflict (key) do nothing;
