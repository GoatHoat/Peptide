-- Goal-based Browse: a filter layer over the existing glossary, not a new
-- content type. No dosing, no cross-user data, no popularity ranking —
-- tag-match only. See legal.md for why that boundary matters.

alter table public.glossary
  add column goal_tags text[] not null default '{}';

update public.glossary set goal_tags = array['Recovery', 'Gut Health', 'Injury'] where slug = 'bpc-157';
update public.glossary set goal_tags = array['Recovery', 'Injury']              where slug = 'tb-500';
update public.glossary set goal_tags = array['Muscle', 'Recovery']              where slug = 'igf-1';
update public.glossary set goal_tags = array['Muscle', 'Recovery', 'Anti-Aging'] where slug = 'hgh';
update public.glossary set goal_tags = array['Skin', 'Anti-Aging']              where slug = 'ghk-cu';
