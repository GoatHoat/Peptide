-- A schedule item can begin on a day the user chooses rather than always
-- "from now on, starting whenever the row happened to be written".
--
-- Existing rows start from the day they were created, which is what the app
-- already did implicitly, so this is a no-op for anything already saved.

alter table public.schedule_items
  add column if not exists start_date date not null default current_date;

update public.schedule_items
  set start_date = created_at::date
  where start_date > created_at::date;

-- ensureTodayDoses filters on (user_id, active, start_date) every app open
create index if not exists schedule_items_user_active_start_idx
  on public.schedule_items (user_id, active, start_date);
