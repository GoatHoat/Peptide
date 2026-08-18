-- Which system granted the tier that is currently on the row.
--
-- Two payment systems can now write `profiles.subscription_tier`: the Stripe
-- webhook and the RevenueCat one. Without this column neither can tell whether
-- a tier it is about to clear was its own to clear, so an Apple EXPIRATION
-- would happily downgrade somebody paying by card, and a Stripe cancellation
-- would do the same to an App Store subscriber. Both of those take away access
-- somebody is still paying for.
--
-- Nullable, and null means "granted before this column existed, by something
-- that did not say". Every downgrade path treats null as "not mine to clear"
-- rather than as "mine", because refusing to downgrade costs a few days of
-- access that was already paid for, and the other way round is a refund.
--
-- NOT APPLIED. Written, listed in supabase/pending, and left alone.

alter table public.profiles
  add column if not exists subscription_source text;

comment on column public.profiles.subscription_source is
  'stripe | apple | null. The system that granted the current subscription_tier. Only that system may clear it.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_subscription_source_check'
  ) then
    alter table public.profiles
      add constraint profiles_subscription_source_check
      check (subscription_source is null or subscription_source in ('stripe', 'apple'));
  end if;
end $$;
