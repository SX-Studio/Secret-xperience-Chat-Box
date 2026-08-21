-- 0007 — Content & assets (Phase 2)
-- A content item is one offer in a box's feed. Its files live in content_asset:
-- the private master (never public) and safe derivatives (blurred preview + thumb)
-- in a public bucket for the feed. Moderation status defaults to 'approved' in
-- Phase 2; Phase 4 introduces the pending -> review gate.

create table public.content (
  id             uuid primary key default gen_random_uuid(),
  public_id      text unique not null,                    -- CNT-…
  box_id         uuid not null references public.box(id) on delete cascade,
  creator_id     uuid not null references public.account(id) on delete cascade,
  title          text not null check (char_length(title) between 1 and 120),
  description    text,
  price_tokens   int not null default 0 check (price_tokens >= 0),
  duration_hours int not null default 24 check (duration_hours between 1 and 168),
  status         text not null default 'approved'
                 check (status in ('draft','processing','pending','approved','rejected','suspended','deleted')),
  created_at     timestamptz not null default now(),
  published_at   timestamptz not null default now()
);
create index content_box_idx     on public.content (box_id, status, created_at desc);
create index content_creator_idx on public.content (creator_id);

create table public.content_asset (
  id           uuid primary key default gen_random_uuid(),
  content_id   uuid not null references public.content(id) on delete cascade,
  kind         text not null default 'image' check (kind in ('image','video')),
  storage_path text not null,                             -- master, private bucket
  preview_path text,                                      -- blurred, public bucket
  thumb_path   text,                                      -- thumbnail, public bucket
  mime         text,
  bytes        int,
  width        int,
  height       int,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);
create index content_asset_content_idx on public.content_asset (content_id, position);

alter table public.content       enable row level security;
alter table public.content_asset enable row level security;
revoke all on public.content, public.content_asset from anon, authenticated;
grant all on public.content, public.content_asset to service_role;

-- Storage buckets: master is private (served later via signed URLs on rental);
-- preview is public (blurred previews + thumbnails shown in the feed).
insert into storage.buckets (id, name, public)
values ('master', 'master', false), ('preview', 'preview', true)
on conflict (id) do nothing;
