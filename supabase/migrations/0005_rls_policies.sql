-- 0005 — Row-Level Security
-- Phase 1 posture: EVERY table has RLS enabled with NO permissive policy for the
-- anon/authenticated roles, so the browser key can touch nothing directly. All
-- reads and writes go through server routes using the service_role key, which
-- bypasses RLS — that is the application-layer lock. RLS is the second, independent
-- lock: even a leaked anon key or a bug in a route cannot reach these rows.
--
-- Per-account SELECT policies (a member reading their own memberships, etc.) are
-- deliberately deferred to the phase that first exposes the client key for direct
-- reads; the helper below is provided now so those policies are a one-liner then.

-- Maps the Supabase JWT (once we mint one carrying account_id) to our account id.
-- Returns null in Phase 1 (no such claim yet) — used only by future client policies.
create or replace function public.current_account_id()
returns uuid
language sql stable
set search_path = ''   -- pinned to avoid search_path injection (advisor 0011)
as $$
  select nullif(
    current_setting('request.jwt.claims', true)::jsonb ->> 'account_id',
    ''
  )::uuid
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'account','account_role','box','box_membership',
    'invitation','audit_log','events','app_config'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    -- Deny-by-default for the PostgREST client roles; service_role bypasses RLS.
    execute format('revoke all on public.%I from anon, authenticated;', t);
    execute format('grant all on public.%I to service_role;', t);
  end loop;
end $$;

grant usage, select on all sequences in schema public to service_role;
