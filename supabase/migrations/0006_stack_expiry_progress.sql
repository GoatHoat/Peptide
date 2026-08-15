-- Stack expiry, injection site logging, and progress notes (with photos).
-- All user-authored data the app just stores and displays back — same rule
-- as everything else in this file: the app never suggests a value.

alter table public.stack_items
  add column expires_on date;

alter table public.doses
  add column injection_site text;

create table public.progress_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  note_date date not null default current_date,
  text_note text,
  measurement text,
  photo_path text,
  created_at timestamptz not null default now()
);

alter table public.progress_notes enable row level security;

create policy "progress_notes: manage own"
  on public.progress_notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index progress_notes_user_date_idx on public.progress_notes (user_id, note_date desc);

-- Private bucket, one folder per user (path: {user_id}/{filename}).
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

create policy "progress photos: manage own folder"
  on storage.objects for all
  using (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]);
