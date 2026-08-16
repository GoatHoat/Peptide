-- Reports of objectionable assistant output.
--
-- App Store Review Guideline 1.2 requires an app that shows user-generated or
-- model-generated content to give people a way to report what they find
-- objectionable, and to act on it. A chat surface with no report control is a
-- rejection regardless of how well the model behaves, because the reviewer is
-- checking that the mechanism exists.
--
-- The row stores the question and the answer together. A report holding only
-- "this was bad" and a timestamp cannot be acted on — whoever reads it needs to
-- see what was asked and what came back, or there is nothing to fix.
--
-- WRITE-ONLY FROM THE CLIENT, deliberately. There is an insert policy and no
-- select policy, so a person can file a report and cannot read anyone's,
-- including their own. Reports are read from the dashboard by whoever is
-- triaging them.
--
-- `on delete cascade` means deleting an account takes its reports with it. That
-- is the right trade: 5.1.1(v) says deletion must actually delete, and a report
-- is not worth keeping a record of a deleted user for.

create table if not exists public.ask_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  answer text not null,
  reason text,
  created_at timestamptz not null default now()
);

comment on table public.ask_reports is
  'Assistant answers a user flagged as objectionable. Insert-only from the client; triaged from the dashboard. Required by App Store Review Guideline 1.2.';

alter table public.ask_reports enable row level security;

create index if not exists ask_reports_created_idx
  on public.ask_reports (created_at desc);

drop policy if exists "ask_reports: insert own" on public.ask_reports;
create policy "ask_reports: insert own"
  on public.ask_reports for insert
  with check (auth.uid() = user_id);

-- No select, update or delete policy. See the note above.
