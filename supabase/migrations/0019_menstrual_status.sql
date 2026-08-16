-- Iron is the one reference intake in the catalogue that turns on whether the
-- person menstruates: 18 mg if they do, 8 mg if they do not. The app was
-- deriving that from `age >= 51`, which is wrong for anyone 45-50, anyone with
-- early menopause and anyone on continuous hormonal contraception — and wrong
-- in the direction that matters, because it halves the figure.
--
-- Nullable with no default, and it stays null unless the person answers. Null
-- means "we were not told" and renders both figures rather than picking one;
-- "prefer not to say" writes null for the same reason. There is no question
-- about this in onboarding — it is asked on the iron entry itself, where the
-- reason for asking is next to the figure it changes.

alter table public.profiles
  add column if not exists menstruates boolean;

comment on column public.profiles.menstruates is
  'Null means unanswered, and renders the 18 mg / 8 mg range rather than a guess. Only the iron reference intake reads it.';
