-- The waking day, set during onboarding. The Today arc spans wake -> sleep,
-- so a dose at 10pm sits where 10pm actually falls on the user's own day
-- rather than on a window hardcoded from the artwork.

alter table public.profiles
  add column if not exists wake_time time not null default '07:00',
  add column if not exists sleep_time time not null default '23:00';
