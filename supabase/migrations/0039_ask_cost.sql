-- What each assistant message actually cost.
--
-- `ask_usage` held id, user_id, created_at — enough to count messages and
-- nothing else. Counting messages does not bound spend: the same allowance is
-- roughly $0.97 with the prompt cache working and $2.60 without it, and the
-- moment a prompt changes the number drifts again.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE POINT OF THIS TABLE. The monthly ceiling is enforced on summed
-- `cost_usd`, not on tokens and not on messages. Dollars are the only unit that
-- does not move with cache behaviour, prompt size or a price change.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.ask_usage
  add column if not exists input_tokens        integer,
  add column if not exists output_tokens       integer,
  add column if not exists cache_read_tokens   integer,
  add column if not exists cache_write_tokens  integer,
  add column if not exists cost_usd            numeric(10, 6);

comment on column public.ask_usage.cost_usd is
  'Computed in the edge function from the rates in lib.ts. The monthly budget is a sum of this column, never a count of rows.';
comment on column public.ask_usage.cache_read_tokens is
  'Zero here across the board means the prompt cache is not hitting and every call is paying full price for the catalogue.';

-- The budget check reads one month for one user on every call, so it wants an
-- index rather than a sequential scan of a table that only ever grows.
create index if not exists ask_usage_user_created_idx
  on public.ask_usage (user_id, created_at desc);

/**
 * Spend for one user in the current calendar month, in dollars.
 *
 * SECURITY DEFINER and argument-free: it reads `auth.uid()`, so it can only
 * ever report the caller's own spend and cannot be pointed at somebody else.
 * Rows written before this migration have a null `cost_usd` and count as zero,
 * which is the right way round — nobody is locked out because of usage from
 * before there was a meter.
 */
create or replace function public.my_ask_spend_this_month()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(cost_usd), 0)::numeric
  from public.ask_usage
  where user_id = auth.uid()
    and created_at >= date_trunc('month', now());
$$;

comment on function public.my_ask_spend_this_month() is
  'The caller''s assistant spend since the 1st. The edge function checks this before calling the model.';

grant execute on function public.my_ask_spend_this_month() to authenticated;
