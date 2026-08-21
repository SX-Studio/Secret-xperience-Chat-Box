-- 0010 — Moderation & reports (Phase 4)
-- Every uploaded item gets a moderation_case. AI screening (a stub for now) sets an
-- initial risk_level; low risk auto-approves, anything else waits for a human. Reports
-- let users flag content into the queue. AI is assistive — never the sole decider.

create table public.moderation_case (
  id         uuid primary key default gen_random_uuid(),
  content_id uuid not null unique references public.content(id) on delete cascade,
  status     text not null default 'pending_review'
             check (status in ('pending_review','approved','rejected','suspended','deleted','escalated')),
  risk_level text not null default 'low' check (risk_level in ('low','uncertain','high')),
  ai_flags   jsonb not null default '{}'::jsonb,
  decided_by uuid references public.account(id),
  decided_at timestamptz,
  reason     text,
  created_at timestamptz not null default now()
);
create index moderation_case_status_idx on public.moderation_case (status, risk_level, created_at desc);

create table public.report (
  id          uuid primary key default gen_random_uuid(),
  public_id   text unique not null,                       -- RPT-…
  reporter_id uuid references public.account(id) on delete set null,
  target_type text not null default 'content' check (target_type in ('content','account')),
  target_id   text not null,                              -- public_id of the target
  reason      text not null,
  details     text,
  status      text not null default 'open' check (status in ('open','triaged','actioned','dismissed')),
  created_at  timestamptz not null default now()
);
create index report_status_idx on public.report (status, created_at desc);

alter table public.moderation_case enable row level security;
alter table public.report          enable row level security;
revoke all on public.moderation_case, public.report from anon, authenticated;
grant all on public.moderation_case, public.report to service_role;
