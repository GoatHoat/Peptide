-- Account deletion, initiated by the account holder from inside the app.
--
-- App Store Review Guideline 5.1.1(v) has required this since June 2022: an app
-- that lets someone create an account must let them delete it from within the
-- app. Offering only a "email us and we'll do it" route is an explicit
-- rejection, and so is deleting the rows but leaving the login working.
--
-- WHY SECURITY DEFINER. `auth.users` is owned by the auth schema and no client
-- role can delete from it — that is the whole reason this cannot be done with a
-- PostgREST call from the app. The function runs as its owner so it can, and it
-- is written so that the only row it can ever reach is the caller's own:
--
--   * it takes no arguments, so there is no id to tamper with
--   * it reads `auth.uid()` from the request JWT, which the client cannot forge
--   * it raises rather than proceeding when that is null, so it can never run
--     unauthenticated and delete something arbitrary
--   * `search_path` is pinned, so a shadowed table cannot redirect the deletes
--
-- WHAT GOES. Everything owned by the caller. Most of it would cascade from the
-- auth.users row on its own — stacks, doses, schedule_items, progress_notes and
-- ask_usage all declare `on delete cascade` — but the deletes are written out
-- anyway. A cascade that is silently dropped in a later migration would
-- otherwise turn into data left behind on an account the user believes is gone,
-- and that is a privacy incident rather than a bug.
--
-- WHAT STAYS. The catalogue: glossary, glossary_research, nutrient_reference,
-- goal_synonyms. None of it is user data — it is the same library for everyone
-- and carries no reference back to the person who was reading it.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'delete_account: no authenticated user'
      using errcode = '28000';
  end if;

  -- Child rows first, so nothing depends on a parent that is already gone.
  -- stack_items has no user_id of its own; it hangs off stacks.
  delete from public.stack_items
    where stack_id in (select id from public.stacks where user_id = uid);
  delete from public.stacks         where user_id = uid;
  delete from public.doses          where user_id = uid;
  delete from public.schedule_items where user_id = uid;
  delete from public.progress_notes where user_id = uid;
  delete from public.ask_usage      where user_id = uid;
  delete from public.profiles       where id = uid;

  -- Last, and the reason this function exists: without it the rows are gone
  -- but the credentials still work, which is a half-deleted account.
  delete from auth.users where id = uid;
end;
$$;

comment on function public.delete_account() is
  'Deletes the calling user''s data and their auth record. Takes no arguments and reads auth.uid(), so it can only ever delete the caller. Required by App Store Review Guideline 5.1.1(v).';

-- `authenticated` only. `anon` holds no uid, so the guard above would raise
-- anyway, but not granting it at all is the clearer statement.
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
