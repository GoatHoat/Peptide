-- Growth as a goal tag.
--
-- PROMPT_V2.md section 2 says "Growth already exists as a goal_tags value on
-- catalogue rows, so the tag vocabulary does not need extending". It does not.
-- `growth` exists as a `category` on 19 rows — a different column with a
-- different job — and no row anywhere carries 'Growth' in `goal_tags`.
--
-- That distinction matters: `match_goal` (migration 0009) and
-- `src/lib/recommend.ts` both search `goal_tags`, so a Growth goal shipped
-- against the untouched vocabulary would have matched nothing and returned an
-- empty list to anyone who picked it. The spec says to add it properly if it is
-- not in the canonical list, so this is that.
--
-- WHAT GETS THE TAG. Every row already categorised `growth` — the creatines,
-- the proteins, the amino acids, the beta-alanines, the tribulus. The tag is
-- appended, never replacing what is there, so a product already tagged Muscle
-- and Recovery keeps both and gains Growth.
--
-- Idempotent: the guard means a second run appends nothing.

update public.glossary
set goal_tags = array_append(goal_tags, 'Growth')
where category = 'growth'
  and not ('Growth' = any(goal_tags));

do $$
declare
  tagged integer;
begin
  select count(*) into tagged
  from public.glossary
  where 'Growth' = any(goal_tags);

  raise notice 'growth goal: % products now carry the Growth tag', tagged;

  -- Not fatal, because the catalogue migrations may not have been applied yet
  -- and this file should not block the ones after it. Loud, because a Growth
  -- goal that matches nothing is a screen that looks broken.
  if tagged = 0 then
    raise warning 'no products carry the Growth tag — apply 0021 before this, or the Growth goal will return an empty list';
  end if;
end $$;
