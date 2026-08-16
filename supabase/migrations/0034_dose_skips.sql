-- Why a dose was not taken, and when the app was last opened.
--
-- The catch-up screen asks one question — what got in the way — and this is
-- where the answer goes. It exists to move the schedule, never to score the
-- user: a person who feels judged marks everything taken and the data stops
-- meaning anything, which is worse than not asking.
--
-- WHAT IT FEEDS. An aggregate goes to the assistant's system prompt: reason
-- counts over the last 30 days and which blocks are worst. That is what lets it
-- say "you have skipped the 3pm block eleven times, mostly 'wasn't near them' —
-- worth moving it to dinner?" instead of recommending a fourth thing to take at
-- 3pm.

create table if not exists public.dose_skips (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  dose_id    uuid not null references public.doses (id) on delete cascade,
  reason     text not null,
  note       text,
  created_at timestamptz not null default now(),
  -- one answer per dose; changing your mind updates rather than stacks
  unique (dose_id)
);

comment on table public.dose_skips is
  'Why a scheduled dose was not taken. Feeds schedule changes and the assistant, never a score shown back to the user.';

alter table public.dose_skips enable row level security;

create index if not exists dose_skips_user_created_idx
  on public.dose_skips (user_id, created_at desc);

-- RLS is not optional here: this is health-adjacent personal data.
drop policy if exists "dose_skips: own rows" on public.dose_skips;
create policy "dose_skips: own rows"
  on public.dose_skips for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------- last opened

-- Server-side rather than in localStorage, so the catch-up screen behaves
-- correctly after a reinstall or on a second device. A device that has never
-- seen the app before must not be told it missed a week.
alter table public.profiles
  add column if not exists last_opened_at timestamptz;

comment on column public.profiles.last_opened_at is
  'When the app was last opened. The catch-up screen fires for doses whose time passed between this and now. Null means never opened, and never fires.';

/**
 * Stamp the open, and hand back the previous value in one round trip.
 *
 * Two statements would race with themselves: the app reads, then writes, and a
 * second launch in between reads the value the first one already consumed. The
 * previous timestamp is returned by the same statement that replaces it.
 */
create or replace function public.touch_last_opened()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  previous timestamptz;
begin
  if auth.uid() is null then
    raise exception 'touch_last_opened: no authenticated user' using errcode = '28000';
  end if;

  select p.last_opened_at into previous
  from public.profiles p where p.id = auth.uid();

  update public.profiles
  set last_opened_at = now()
  where id = auth.uid();

  return previous;
end;
$$;

comment on function public.touch_last_opened() is
  'Records this app open and returns the previous one. Null on a first launch, which the catch-up screen reads as "do not fire".';

revoke all on function public.touch_last_opened() from public, anon;
grant execute on function public.touch_last_opened() to authenticated;
