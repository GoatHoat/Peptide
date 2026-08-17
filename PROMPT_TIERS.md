# Onboarding, and a real free/pro split

Read `CLAUDE.md` and `PROMPT_ACCOUNT_SCOPING.md` first — part 1 here overlaps
with that file and should be done as one piece of work.

Five things:

1. Onboarding is never shown again — fix the gate
2. A real entitlement system, enforced on the server as well as the client
3. The free limits: 1 stack item, 60 visible products, 3 AI messages
4. The upsell card on Today, and the paywall sheet
5. The Ask AI empty state and message counter

---

# 1. Onboarding never runs again

`src/App.tsx:50` gates on `hasOnboarded()`, which reads
`localStorage['pepstack.onboarded.v1']` — one key, no account, and the comment
on line 48 says so plainly. Complete onboarding once in a browser and every
account that signs in afterwards skips it and inherits the previous person's
Today screen.

**Move the flag to the server.** `profiles` already exists and already has
`subscription_tier`; add one more column:

```sql
alter table public.profiles
  add column if not exists onboarded_at timestamptz;
```

- `hasOnboarded` becomes a read of `profiles.onboarded_at` for the signed-in
  user, not a localStorage read.
- Set it at the end of the flow, in the same write that persists the answers.
- Keep a user-scoped localStorage copy purely as an offline cache —
  `pepstack.onboarded.v1:<uid>` — never as the source of truth.

This is the right shape anyway: onboarding is a property of the account, so
signing in on a new phone should not re-run it, and signing in as a different
person on the same phone must.

**The ordering problem.** Onboarding currently runs *before* the auth gate,
because it owns account creation. So the first few screens have no user to read
a flag for. Resolve it like this: if there is no session, always run onboarding
from the start. If there is a session, read `onboarded_at` and run it only when
null. Migrate anonymous answers onto the user at sign-up, as specified in
`PROMPT_ACCOUNT_SCOPING.md`.

---

# 2. Entitlements, for real

Right now `subscribed` is written into the onboarding store and read by nothing.
There is no `isPro` anywhere in `src/`.

## One source of truth

`profiles.subscription_tier` already exists, `not null default 'free'`. Use it.
Add a hook:

```ts
// src/lib/entitlements.ts
export type Tier = 'free' | 'pro';

export const LIMITS = {
  free: { stackItems: 1, catalogue: { supplement: 30, peptide: 30 }, askMessagesTotal: 3 },
  pro:  { stackItems: Infinity, catalogue: null, askMessagesTotal: null },
} as const;

export function useEntitlement(): {
  tier: Tier;
  isPro: boolean;
  limits: typeof LIMITS['free'] | typeof LIMITS['pro'];
}
```

Every gate in the app reads from this hook. No component decides for itself.

## Enforce it server-side too

**A client-side limit is a suggestion.** Anyone can open dev tools and set a
flag. Since this is what people are paying for, each limit needs a matching
check the client cannot bypass:

- **Stack items.** A trigger on `stack_items` that raises when a `free` user
  would exceed their allowance:

  ```sql
  create or replace function public.enforce_stack_limit() returns trigger as $$
  declare tier text; n integer;
  begin
    select p.subscription_tier into tier
      from public.profiles p
      join public.stacks s on s.user_id = p.id
     where s.id = new.stack_id;
    if tier = 'free' then
      select count(*) into n from public.stack_items where stack_id = new.stack_id;
      if n >= 1 then
        raise exception 'free_tier_stack_limit' using errcode = 'P0001';
      end if;
    end if;
    return new;
  end $$ language plpgsql security definer;
  ```

  Catch `free_tier_stack_limit` in `api.ts` and turn it into the paywall sheet
  rather than a raw error.

- **Ask AI messages.** The Edge Function already reads `ask_usage` for rate
  limiting. Add a lifetime check: if the user's tier is `free` and they have 3
  or more rows ever, return `402` with a machine-readable code. Read the tier
  from the database inside the function, never from the request body.

- **Catalogue visibility** is presentation only — the data is public reference
  material and blurring it is an upsell, not a security boundary. No server
  check needed, and do not add one.

---

# 3. The free limits

## 3.1 One item in the stack

Free users can hold **one** product. Attempting to add a second opens the
paywall sheet naming what they hit.

The one item can be **any** product, including a locked one, and including a
manually typed custom entry. The catalogue cap below limits *browsing*, not what
someone is allowed to take. That distinction matters: nothing about the free
tier should stop a person tracking what they actually swallow.

## 3.2 Sixty visible products

Free users see **30 supplements and 30 peptides** in Discover. Everything past
that renders blurred with a lock.

**Which 60.** Deterministic and stable — a product must not move in or out
between sessions. Rank by `evidence` (`strong` → `mixed` → `thin`), then by
number of citations descending, then by name ascending. Compute it once in SQL
as a materialised ordering, not in the client:

```sql
alter table public.glossary add column if not exists free_rank integer;
-- populate with row_number() over that ordering, partitioned by kind
```

Then "is this product free-visible" is `free_rank <= 30`, per kind. Cheap,
stable, and it does not change when someone adds a citation.

**How the locked rows look.** Do not hide them and do not blur the whole list.
Show the 30 normally, then the rest in the same list with:

- the product name and brand blurred, `filter: blur(5px)`, no other change
- a lock glyph centred over the row, accent, 16px
- the row still occupies its exact final height, so nothing shifts if they
  upgrade
- tapping anywhere on a locked row opens the paywall sheet — it does not open
  the detail sheet

Above the first locked row, one full-width divider with a line of copy:

> Get Pro to unlock all 304 products

Read the count from the database rather than hardcoding it.

**Search.** A free user searching for a locked product still sees it, blurred,
in its section. Seeing that it exists is the point. Never return "no results"
for something the catalogue holds.

**Peptides tab.** The same 30-item cap applies. It changes nothing else — no
doses, no timing, reference only, exactly as `0031` enforces.

## 3.3 Three AI messages, ever

Not per month, not per day. `ask_usage` already records every call, so the count
is `select count(*) from ask_usage where user_id = ...`.

On the fourth attempt the function returns `402` and the client opens the
paywall sheet. The message the user typed must not be lost — leave it in the
input so upgrading and sending again is one tap.

---

# 4. The upsell card and the paywall sheet

## 4.1 The card on Today

A rectangle **below the schedule list and above the Add to schedule button**.
Free tier only; renders nothing for Pro.

- Full width minus the screen padding, `#16161A`, 22px radius, hairline border
- Two lines: a title, 15px semibold white, and one line of secondary copy 13px
- A chevron on the right. The whole card is the tap target
- No gradient, no glow, no icon — `CLAUDE.md` rules apply here too
- Not dismissible, but quiet. It sits in the flow rather than floating over
  anything

Copy rotates with what the user has actually hit, so it stays informative
rather than becoming furniture:

> **One product at a time on Free** — Pro removes the limit and unlocks all 304.
> **You've used 2 of 3 AI messages** — Pro raises it to 20 an hour.
> **274 products are locked** — see everything Pro covers.

Pick whichever limit the user is closest to. Recompute on mount, not per render.

## 4.2 The paywall sheet

One component, opened from everywhere a gate fires:

```ts
<ProSheet reason="stack-limit" | "locked-product" | "ask-limit" | "goals" />
```

- Opens as a sheet, not a full screen — the user was doing something, and a
  full-screen takeover loses their place
- Headline names what they hit: "You can hold one product on Free."
- Then the Pro list, four lines, no ticks or icons: unlimited stack · all 304
  products · 20 AI messages an hour · full history and export
- The two plans from `billing.ts` — $29.99/year and $4.99/month
- **Restore Purchases**, always visible, not hidden behind a link
- Terms and Privacy links, using the existing `TERMS_URL` / `PRIVACY_URL`
- Dismiss returns to exactly where they were, with their input intact

Reuse whatever `Commit.tsx` already has rather than writing a second paywall —
two paywalls that drift apart is a rejection waiting to happen.

**Do not wire this to `purchase()` yet.** That function still waits 900ms and
returns `true`, and `SKIP_PAYWALL` defaults to `'true'`. A paywall that grants
the tier without a payment sheet is Guideline 3.1.1 and 2.1 and it is the
fastest rejection available. Build the sheet, leave the button calling the
existing stub, and flip both in the same commit that wires RevenueCat.

---

# 5. Ask AI: empty state and message counter

## 5.1 First-run copy

Replace the current empty state with:

> **Meet PepStack AI**
>
> Your personal supplement helper. Ask about anything in your stack, or what to
> take for a goal — it answers from the research in your library and can
> recommend vitamins and minerals.

Then the three example prompts that already exist.

Two things about that sentence. "Vitamins and minerals" is deliberate and must
stay — the assistant does not recommend peptides, and the empty state should not
promise something the tool schema refuses. And "your library" rather than "the
internet" is the actual differentiator; keep it.

*(The string says PepStack. When the name changes, this is one of the places to
change it.)*

## 5.2 The counter card

A small card under the empty-state copy, and persistently above the input once
the conversation starts.

- **Free:** `3 free AI messages total` before any are used, then
  `2 of 3 free messages left`, then `1 of 3`. At zero:
  `No free messages left` with a Get Pro chevron.
- **Pro:** `20 messages an hour, 200 a day` — read from the rate-limit constants
  in the Edge Function, not hardcoded in the client, so the two cannot drift.

Same card treatment as elsewhere: `#16161A`, hairline, 13px secondary text. No
progress bar, no colour change as it depletes — a counter that turns red is
nagging, and this is information rather than a warning.

---

# Before you say it is done

1. Sign in as three accounts in one browser. Each runs onboarding. Each gets its
   own Today screen.
2. Sign out and back in on one account — onboarding does **not** run again.
3. Free user adds a second stack item: the paywall sheet opens and the database
   trigger rejects it even if the UI is bypassed.
4. Discover as free: exactly 30 supplements and 30 peptides unblurred, the rest
   blurred with a lock, list height identical before and after upgrading.
5. A free user can still add a locked product, and a custom typed one, as their
   one item.
6. Fourth AI message: 402, paywall sheet, typed message still in the input.
7. Today shows the upsell card on free and nothing on pro.
8. The counter reads correctly at 3, 2, 1 and 0 remaining, and shows the Pro
   allowance for a pro account.
9. `SKIP_PAYWALL` still defaults to `'true'` and `purchase()` is untouched.

Then tell me: where you enforced each limit on the server, anything you gated in
the UI that has no server-side equivalent, and what the free-visible 60 actually
came out as for each kind.
