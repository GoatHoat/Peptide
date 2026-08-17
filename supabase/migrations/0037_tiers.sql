-- The free/pro split, enforced where it costs money.
--
-- `profiles.subscription_tier` already exists, not null default 'free'. This
-- adds the two server-side checks and the stable ordering the catalogue cap
-- needs. A client-side limit is a suggestion; these are the ones somebody would
-- otherwise open dev tools to get around.
--
-- WHAT IS *NOT* ENFORCED HERE, deliberately: the 60-product catalogue cap. That
-- data is public reference material — published NIH label filings and PubMed
-- citations — so a server check on it would be theatre rather than a boundary.
-- It is presentation, and it is enforced in the client only.

-- ------------------------------------------------------- 1. stable free order

alter table public.glossary
  add column if not exists free_rank integer;

comment on column public.glossary.free_rank is
  'Position within its kind for the free tier. free_rank <= 30 is visible. Computed here rather than in the client so a product cannot move in or out between sessions.';

/**
 * Recompute the ordering.
 *
 * Evidence first, then how much research is on file, then name. Deterministic
 * and stable: a product must not appear one session and vanish the next, and
 * adding a citation must not silently push something out of the free tier —
 * which is why the tie-break ends on name rather than on anything that moves.
 */
create or replace function public.recompute_free_rank()
returns void
language sql
security definer
set search_path = public
as $$
  with ordered as (
    select
      g.id,
      row_number() over (
        partition by g.kind
        order by
          case g.evidence when 'strong' then 0 when 'mixed' then 1 when 'thin' then 2 else 3 end,
          (select count(*) from public.glossary_research r where r.glossary_id = g.id) desc,
          g.name asc
      ) as rn
    from public.glossary g
  )
  update public.glossary g
  set free_rank = ordered.rn
  from ordered
  where ordered.id = g.id;
$$;

select public.recompute_free_rank();

create index if not exists glossary_free_rank_idx on public.glossary (kind, free_rank);

-- --------------------------------------------------- 2. one stack item, free

/**
 * A free account holds one product.
 *
 * The one item may be anything — a locked product, or a hand-typed custom
 * entry. The catalogue cap limits browsing, not what somebody is allowed to
 * take, and nothing about the free tier should stop a person tracking what they
 * actually swallow.
 *
 * `security definer` because the trigger has to read `profiles`, which RLS
 * would otherwise scope to the caller — correct here, but the join is clearer
 * without depending on it.
 */
create or replace function public.enforce_stack_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tier text;
  held integer;
begin
  select p.subscription_tier into tier
  from public.profiles p
  join public.stacks s on s.user_id = p.id
  where s.id = new.stack_id;

  if coalesce(tier, 'free') <> 'free' then
    return new;
  end if;

  select count(*) into held
  from public.stack_items
  where stack_id = new.stack_id;

  if held >= 1 then
    -- The client catches this code and opens the paywall naming what was hit,
    -- rather than surfacing a raw database error.
    raise exception 'free_tier_stack_limit' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists stack_items_free_limit on public.stack_items;
create trigger stack_items_free_limit
  before insert on public.stack_items
  for each row execute function public.enforce_stack_limit();

-- ------------------------------------------- 3. what the client may ask about

/**
 * The caller's own tier and lifetime assistant usage.
 *
 * One round trip, and it reads `auth.uid()` rather than taking an id, so the
 * client cannot ask about somebody else. The Edge Function reads the tier
 * itself from the database for the message cap — this is for rendering the
 * counter and the upsell, not for deciding anything.
 */
create or replace function public.my_entitlement()
returns table (tier text, ask_used bigint, catalogue_total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select p.subscription_tier from public.profiles p where p.id = auth.uid()), 'free'),
    (select count(*) from public.ask_usage u where u.user_id = auth.uid()),
    (select count(*) from public.glossary);
$$;

revoke all on function public.my_entitlement() from public, anon;
grant execute on function public.my_entitlement() to authenticated;

do $$
declare
  s integer;
  p integer;
begin
  select count(*) into s from public.glossary where kind = 'supplement' and free_rank <= 30;
  select count(*) into p from public.glossary where kind = 'peptide' and free_rank <= 30;
  raise notice 'free tier sees % supplements and % peptides', s, p;
end $$;
