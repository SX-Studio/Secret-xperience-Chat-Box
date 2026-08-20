-- 0002 — Boxes & memberships
-- A Box is the shared content room. box_membership is the per-box permission
-- record: who belongs to which box, in what role.

create table public.box (
  id          uuid primary key default gen_random_uuid(),
  public_id   text unique not null,                        -- BOX-…
  name        text not null check (char_length(name) between 1 and 120),
  description text,
  created_by  uuid not null references public.account(id),
  status      text not null default 'active'
              check (status in ('active','suspended','archived')),
  created_at  timestamptz not null default now()
);

create table public.box_membership (
  id         uuid primary key default gen_random_uuid(),
  box_id     uuid not null references public.box(id) on delete cascade,
  account_id uuid not null references public.account(id) on delete cascade,
  role       text not null check (role in ('box_admin','creator','user')),
  status     text not null default 'active'
             check (status in ('active','suspended','removed')),
  invited_by uuid references public.account(id),
  joined_at  timestamptz not null default now(),
  unique (box_id, account_id)
);

create index box_membership_box_idx     on public.box_membership (box_id);
create index box_membership_account_idx on public.box_membership (account_id);

-- Now that box exists, wire the deferred FK from account_role.box_id.
alter table public.account_role
  add constraint account_role_box_fk
  foreign key (box_id) references public.box(id) on delete cascade;
