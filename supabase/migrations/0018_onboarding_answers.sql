-- The three personalisation questions asked during onboarding: what the user
-- does not eat, what has not agreed with them before, and which forms they
-- prefer to take.
--
-- They live on the profile rather than in localStorage because they decide
-- which product is suggested, not whether one is — a new device with an empty
-- localStorage would otherwise ask the same three questions again, and nothing
-- running server-side could see the answers at all.
--
-- reactions_note is free text from the "something else" field. It is context
-- for the assistant and is never read by a rule; a rule reading free text is
-- how you end up recommending on a typo.

alter table public.profiles
  add column if not exists diet           text[] not null default '{}',
  add column if not exists reactions      text[] not null default '{}',
  add column if not exists reactions_note text,
  add column if not exists form_prefs     text[] not null default '{}';
