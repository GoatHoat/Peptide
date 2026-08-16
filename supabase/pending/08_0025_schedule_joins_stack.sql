-- Anything on the schedule belongs in the stack.
--
-- Adding to the stack from Discover offered to schedule the item, but nothing
-- ever went the other way: an item added from Today, or created by onboarding,
-- landed on the schedule and never reached the stack. The two lists drifted.
--
-- Two things kept them apart, and both are fixed here for rows that already
-- exist. New rows are handled in lib/api addScheduleItem.

-- 1. Items typed by hand carry no glossary_id at all, so they have nowhere to
--    go: stack_items.glossary_id is NOT NULL. Match them back to the catalogue
--    by name, case-insensitively, where a single entry matches.
update public.schedule_items s
set glossary_id = g.id
from public.glossary g
where s.glossary_id is null
  and lower(trim(s.name)) = lower(g.name);

-- 2. Everything scheduled and linked to the catalogue joins the owner's stack.
--    A user with no stack yet gets one, named the way the app names it.
insert into public.stacks (user_id, name)
select distinct s.user_id, 'My Stack'
from public.schedule_items s
where s.glossary_id is not null
  and not exists (select 1 from public.stacks k where k.user_id = s.user_id);

insert into public.stack_items (stack_id, glossary_id)
select distinct k.id, s.glossary_id
from public.schedule_items s
join public.stacks k on k.user_id = s.user_id
where s.glossary_id is not null
  and not exists (
    select 1 from public.stack_items existing
    where existing.stack_id = k.id and existing.glossary_id = s.glossary_id
  );

-- Removing something from the schedule deliberately does NOT remove it from the
-- stack. The stack is what you have; the schedule is when you take it. Stopping
-- a reminder is not the same as throwing the bottle away.
