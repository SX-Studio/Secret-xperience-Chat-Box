-- 0012 — Admin dashboard stats (read-only views for the admin backend)
-- Per-box performance + platform-wide totals. Queried via the service-role admin
-- client only; revoked from anon/authenticated.

create or replace view public.box_stats as
select
  b.id                                                        as box_id,
  b.public_id,
  b.name,
  b.status,
  (select count(*) from public.box_membership m where m.box_id = b.id and m.status = 'active') as users,
  (select count(*) from public.content c where c.box_id = b.id)                                as drops,
  (select count(*) from public.rental r where r.box_id = b.id)                                 as rentals,
  coalesce((select sum(r.price_tokens) from public.rental r where r.box_id = b.id), 0)         as tokens_in,
  coalesce((select sum(e.creator_tokens) from public.earning e
              join public.rental r on r.id = e.rental_id where r.box_id = b.id), 0)            as creator_tokens,
  coalesce((select sum(e.platform_tokens) from public.earning e
              join public.rental r on r.id = e.rental_id where r.box_id = b.id), 0)            as platform_tokens
from public.box b;

create or replace view public.platform_stats as
select
  (select count(*) from public.account)                                                        as accounts,
  (select count(*) from public.box)                                                            as boxes,
  (select count(*) from public.content)                                                        as content,
  (select count(*) from public.content where published_at > now() - interval '1 hour')         as drops_last_hour,
  (select count(*) from public.rental)                                                         as rentals,
  (select count(*) from public.rental where status = 'active' and expires_at > now())          as active_rentals,
  coalesce((select sum(balance_tokens) from public.wallet), 0)                                 as tokens_in_circulation,
  coalesce((select sum(creator_tokens) from public.earning), 0)                                as creator_tokens,
  coalesce((select sum(platform_tokens) from public.earning), 0)                               as platform_tokens,
  (select count(*) from public.report where status = 'open')                                   as open_reports;

revoke all on public.box_stats, public.platform_stats from anon, authenticated;
grant select on public.box_stats, public.platform_stats to service_role;
