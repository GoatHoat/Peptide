-- Vial inventory: doses/days remaining, computed entirely from numbers the
-- user already entered (vial size, diluent, and how much they draw per
-- dose, from the reconstitution calculator) — pure bookkeeping, same rule
-- as everything else. The app never suggests a vial size or draw amount.

alter table public.stack_items
  add column vial_total_ml numeric,
  add column ml_per_dose numeric,
  add column vial_started_on date;
