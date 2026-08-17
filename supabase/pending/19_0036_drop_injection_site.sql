-- Drop injection_site.
--
-- CLAUDE.md, Positioning: "no injection-related UI or questions anywhere in the
-- product." legal.md records that injection specifics are part of what got the
-- first version of this app rejected.
--
-- The column has been dead in practice for a while: `addScheduleItem` writes
-- null unconditionally since the App Store pass, and the three places that
-- rendered it as a " · site" suffix are gone in the same commit as this file.
-- What is left is the schema still describing a product this one is not.
--
-- IRREVERSIBLE, AND DELIBERATELY SO. Any historical values go with it. That is
-- the point rather than a side effect: keeping a column of injection sites in an
-- over-the-counter supplement app is the thing being removed, and preserving the
-- data would preserve exactly what should not be there.
--
-- Guarded so it can run against a database where the column is already gone.

alter table public.schedule_items drop column if exists injection_site;
alter table public.doses          drop column if exists injection_site;

do $$
declare
  remaining integer;
begin
  select count(*) into remaining
  from information_schema.columns
  where table_schema = 'public'
    and column_name = 'injection_site';

  if remaining > 0 then
    raise exception 'injection_site still present on % table(s)', remaining;
  end if;

  raise notice 'injection_site dropped from schedule_items and doses';
end $$;
