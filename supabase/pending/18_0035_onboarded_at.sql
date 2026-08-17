-- Onboarding is a property of the account, not of the browser.
--
-- `hasOnboarded()` read one unscoped localStorage key, so completing the flow
-- once on a device meant every account that signed in afterwards skipped it
-- entirely and landed on a Today screen built from the first person's answers.
-- The local flag is now scoped per user (see src/lib/storage.ts); this column is
-- the thing that makes it true across devices rather than merely per browser.
--
-- Two behaviours fall out of it, and both are the ones you want:
--   * signing in on a new phone does not re-run a flow the account has finished
--   * signing in as a different person on the same phone does run it

alter table public.profiles
  add column if not exists onboarded_at timestamptz;

comment on column public.profiles.onboarded_at is
  'When this account finished onboarding. Null means it has not. The source of truth; the local flag is a cache.';

/**
 * Marks the calling account as onboarded, once.
 *
 * `coalesce` rather than a plain set: re-running the flow — which someone can
 * do by clearing local storage — should not move the date they actually
 * finished, and that date is the only record of when these answers were given.
 */
create or replace function public.mark_onboarded()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  stamped timestamptz;
begin
  if auth.uid() is null then
    raise exception 'mark_onboarded: no authenticated user' using errcode = '28000';
  end if;

  update public.profiles
  set onboarded_at = coalesce(onboarded_at, now())
  where id = auth.uid()
  returning onboarded_at into stamped;

  return stamped;
end;
$$;

comment on function public.mark_onboarded() is
  'Stamps profiles.onboarded_at for the caller if it is not already set, and returns it.';

revoke all on function public.mark_onboarded() from public, anon;
grant execute on function public.mark_onboarded() to authenticated;

-- Anyone with a profile and a stack or a schedule has plainly been through the
-- flow already; backdating them stops the fix re-running onboarding for every
-- existing user on their next launch.
update public.profiles p
set onboarded_at = coalesce(p.onboarded_at, p.created_at, now())
where p.onboarded_at is null
  and (
    exists (select 1 from public.stacks s where s.user_id = p.id)
    or exists (select 1 from public.schedule_items si where si.user_id = p.id)
  );

do $$
declare
  done integer;
  total integer;
begin
  select count(*) filter (where onboarded_at is not null), count(*)
    into done, total
  from public.profiles;
  raise notice 'onboarding: % of % profiles marked as finished', done, total;
end $$;
