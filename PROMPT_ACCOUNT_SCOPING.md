# Local state is not scoped to the signed-in account

A real bug, found by signing into three accounts on one device and seeing the
same Ask AI conversation in all of them.

**It is not a server-side leak.** `ask_usage` and every other table carry
`user_id` with RLS policies checking `auth.uid() = user_id`, and nothing is
shared between devices. This is entirely `localStorage`: the app writes to
fixed keys with no account in them, and signing out clears none of them.

## The three keys

```
src/lib/ask.ts:212        const THREAD_KEY = 'pepstack.ask.v1'
src/onboarding/store.ts:69   const KEY      = 'pepstack.onboarding.v1'
src/onboarding/store.ts:180  const DONE_KEY = 'pepstack.onboarded.v1'
```

`signOut()` in `src/screens/You.tsx:189` removes none of them.

**The AI thread is the least of it.** `pepstack.onboarding.v1` holds age, sex,
diet, reactions, goals, wake and sleep times, meal times and the current stack.
`pepstack.onboarded.v1` is the flag that decides whether onboarding runs at all.
So on a shared device, a second account signs in, skips onboarding entirely, and
lands on a Today screen built from the first person's answers — then asks the
assistant a question and sees the first person's conversation above it.

That is a privacy problem on any shared or family device, and it is also why the
assistant cannot be "personal to the account": it is reading a thread that has
no account attached.

---

# 1. Scope every key to the user

Add one helper and route all persisted state through it:

```ts
// src/lib/storage.ts
export const userKey = (base: string, userId: string | null) =>
  userId ? `${base}:${userId}` : `${base}:anon`;
```

Then `pepstack.ask.v1:<uuid>`, `pepstack.onboarding.v1:<uuid>`,
`pepstack.onboarded.v1:<uuid>`.

Two things this has to get right:

**Reading before the session resolves.** Supabase restores the session
asynchronously, so on first paint `user` is null and the key would be `:anon`.
Do not read persisted state until the session has settled — render the loading
state instead. Reading early and writing back under `:anon` is how you get a
second copy of the bug.

**The pre-auth part of onboarding.** `FLOW` runs `welcome`, `auth-choice` and
`auth-form` before a user exists, so those answers legitimately start under
`:anon`. On successful sign-in or sign-up, migrate the `:anon` record onto the
new user's key and delete the `:anon` one. Do this in one place, in the auth
listener, not in the screens.

## Guard on read as well

Namespacing alone is not enough — store the owner inside the payload and check
it on load:

```ts
{ userId: "…", savedAt: 1723800000000, data: { … } }
```

If `userId` does not match the signed-in user, discard and return the default.
Belt and braces, and it makes the bug impossible to reintroduce by renaming a
key.

## Clear on sign-out and on delete

`signOut()` must remove every app key for that user before the Supabase call.
`deleteAccount()` in `src/lib/api.ts:745` must do the same — right now it
deletes the server-side account and leaves the person's whole profile sitting in
`localStorage` on the device, which rather defeats the point.

Write both as one function, `clearLocalState(userId)`, so a new key added later
gets cleared by construction rather than by somebody remembering. Keep a single
exported array of key bases and iterate it.

`Tabs.tsx`'s `storageKey` is which tab was last open. That is UI state, not
personal data — leave it global, and say so in a comment so the next person does
not "fix" it.

---

# 2. Make the thread follow the account, not the device

Scoping fixes the leak. It does not give you what the feature is supposed to be:
sign in on a new phone and your conversation is gone, because it only ever
existed in one browser's storage.

Move it server-side. This was specified in `PROMPT_DISCOVER_AI.md` under
Persistence and never built.

```sql
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('user','assistant')),
  text       text not null,
  cards      jsonb,
  stub       boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.chat_messages (user_id, created_at);
alter table public.chat_messages enable row level security;
create policy "own rows" on public.chat_messages
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- Write both the user message and the assistant reply from the Edge Function,
  server-side, using the JWT it already verifies. Do not let the client insert
  rows it authored — the client can lie about `role`.
- Load the last 50 on mount, ordered by `created_at`.
- Keep `localStorage` as an offline cache only, still user-scoped, and treat the
  server as the source of truth whenever a fetch succeeds.
- One thread per user. No conversation list.
- `delete_account` (migration `0026`) must remove these rows — it will
  automatically via `on delete cascade`, but add it to that function's test.

## While you are there

The assistant is meant to read the user's own data. Confirm the Edge Function
loads profile, stack, schedule and adherence **server-side from `auth.uid()`**,
and does not accept any of it from the request body. If any of that context
arrives from the client, a user could hand it someone else's — same class of bug,
worse consequences.

---

# 3. Tests

Table-driven, and make the first one fail before you fix anything:

1. Two users on one storage instance: user A writes a thread, user B signs in,
   B's thread is empty.
2. Same for onboarding answers — B runs onboarding from scratch rather than
   inheriting A's age and goals.
3. `pepstack.onboarded.v1` for A does not skip onboarding for B.
4. Sign-out removes every key for that user and leaves other users' keys alone.
5. `deleteAccount` clears local state as well as server rows.
6. A payload whose embedded `userId` does not match the session is discarded.
7. Anonymous onboarding answers migrate to the user's key on sign-up, and the
   `:anon` copy is gone afterwards.
8. Thread survives a sign-out and sign-in on the same account, loaded from the
   server rather than storage.

---

# Before you say it is done

Sign in as three accounts in one browser, in sequence. Each must get its own
empty thread, its own onboarding, and its own Today screen. Then sign in as the
first one again and confirm its conversation comes back — from the server, with
`localStorage` cleared manually first.

Then tell me: every key you namespaced, anything else you found writing to
`localStorage` or `sessionStorage` unscoped, and whether the Edge Function was
taking any user context from the request body.
