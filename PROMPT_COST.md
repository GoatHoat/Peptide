# Make the assistant cheap, and make it impossible for one user to be expensive

Five messages on Opus 5 cost $0.95 yesterday — about $0.19 each. The model is now
`claude-haiku-4-5`, which removes roughly 80% of that on its own. This closes the
rest and puts a hard ceiling on any single account.

**The target: no user can cost more than $1.00 in a calendar month.** Not "should
not" — cannot. Enforced server-side, on **measured dollars**, not on a message
count and not on a token allowance.

Work in this order. The first two are most of the saving.

---

# 1. Measure before you tune

Everything below is guesswork until you have real numbers. Do this first.

`ask_usage` currently holds `id`, `user_id`, `created_at`. Add the actual usage
the API returns:

```sql
alter table public.ask_usage
  add column if not exists input_tokens        integer,
  add column if not exists output_tokens       integer,
  add column if not exists cache_read_tokens   integer,
  add column if not exists cache_write_tokens  integer,
  add column if not exists cost_usd            numeric(10,6);
```

Write every field from `response.usage` after each call, and compute `cost_usd`
from the rates in one place:

```ts
// Claude Haiku 4.5, per million tokens
export const RATES = { input: 1.00, output: 5.00, cacheRead: 0.10, cacheWrite5m: 1.25 };
```

Keep the rates in a single exported constant so a price change is one edit.

Then run five real conversations and report the actual per-message cost, split
into input, cached, and output. **Everything after this is tuned against those
numbers, not against my estimates.**

---

# 2. Stop paying for output you do not want

The biggest single line on the bill, because output is 5× input.

**The assistant may answer at whatever length the question needs.** Do not cap it
to a sentence count — a question about interactions between four things in
someone's stack deserves a real answer, and a truncated one is worse than an
expensive one. What to remove is waste, not substance.

- **`MAX_TOKENS` is 8192.** That is not a target, it is a runaway ceiling —
  enough for an answer several times longer than any user will read. Set it to
  **2000**: ample for a full answer plus three recommendation cards with
  rationales, and a hard cap on what one response can cost.
- **`output_config: { effort: 'medium' }` on line 380.** Drop to `'low'`, or
  remove the line. Deliberation tokens bill as output at 5× input, and this is
  retrieval and summarisation over a catalogue you supply — there is little for
  it to reason about before answering.
- **Cut padding, not content.** In the system prompt: *"Do not restate the
  question. Do not narrate what you are about to do. Do not summarise at the end.
  Answer directly and at whatever length the question actually needs."* That
  trims the wrapper every model puts around an answer without shortening the
  answer.

---

# 3. Stop sending the whole catalogue every time

Second biggest, and the one with real engineering in it.

Right now the system prompt carries all 304 products so the model can pick from
them. That is roughly 12–30k input tokens on every single message, including
"thanks".

Two changes:

**Send only what could plausibly be relevant.** Filter the catalogue by the
user's selected goals before building the prompt. Someone with Sleep and Focus
does not need the 40 training products in context. Report how much this cuts the
prompt by.

> **Do not filter below 4,096 tokens.** Haiku 4.5's minimum cacheable prefix is
> 4,096 tokens. Below that the prompt is simply not cached — **no error is
> returned**, it silently costs 10× more per token. So there is a floor here:
> trimming from 12,000 to 6,000 tokens saves money; trimming to 3,500 costs you
> money while looking like a win. Measure the cached prefix and keep it
> comfortably above 4,096, padding the catalogue back up with additional entries
> if filtering overshoots.

**Order the prompt so the cacheable part is actually static.** A cache hit
requires an exact prefix match, and the system prompt currently mixes the fixed
catalogue with per-user context — profile, stack, schedule, adherence — which
differs on every request. Everything before the `cache_control` breakpoint must
be identical every time:

```
[ tools ]  [ instructions ]  [ catalogue ]   ← cache_control breakpoint here
[ user profile, stack, schedule, adherence, memory facts ]
[ conversation history ]
[ question ]
```

If any per-user value sits above the breakpoint, the prefix is unique per user
per session and nothing caches at all. Verify this is the current ordering; fix
it if not.

Also note: **changing the tool definitions invalidates the entire cache.** That
is fine day to day, but expect the first call after any deploy that touches
`TOOLS` to be a cache write rather than a read.

**Verify the cache is actually hitting.** `index.ts` sets a breakpoint after the
catalogue with a comment saying it is identical for every person. Confirm that
against `cache_read_tokens` in the telemetry from §1 — if reads are zero, the
cache is not working and you are paying full price every call.

If it is working, check the TTL. The default is 5 minutes. People read an answer,
think, and type again — often past that window, which costs a cache *write* at
1.25× base instead of a read at 0.1×. The 1-hour TTL is requested with
`cache_control: { type: 'ephemeral', ttl: '1h' }` and writes at 2× base, but
reads stay at 0.1×.

Log the gap between consecutive messages in a conversation. If the median is over
five minutes, 1h is cheaper despite the higher write price. Decide from that
number, not from intuition.

**Trim the history sent.** Send at most the last 6 turns. A long conversation
should not get progressively more expensive with every message.

---

# 4. The input limit — the user's message only

**This applies to what the user types, never to what the assistant replies.** A
UX decision rather than a cost one — 240
characters is about 60 tokens, which is fractions of a cent — but short questions
do get shorter answers, so it helps indirectly.

- `maxLength={240}` on the composer.
- A live counter appearing at 200 characters: `40 left`, secondary text, no
  colour change.
- Placeholder: *"Ask in a sentence or two"*.
- **Reject over 240 server-side too.** A client limit is a suggestion.
- The user's typed text is never lost — if a send is rejected for any reason it
  stays in the box.

One thing to watch: the assistant is meant to take a history like a careful
clinician. It already loads age, sex, diet, reactions, goals, stack and schedule
server-side, so the *question* can be short without the answer getting worse. If
you find answers degrading in testing, raise the limit rather than keeping it.

---

# 5. The hard ceiling — this is the part that must not fail

Message counts drift as prompts change. Budget on **measured spend**.

Before every call, sum `cost_usd` for that user in the current calendar month. If
it is at or over the cap, return `402` with a machine-readable code and do not
call the API.

```ts
export const MONTHLY_BUDGET_USD = { free: 0.02, pro: 1.00 };
```

### Why dollars, and why $1.00

**Do not cap on tokens.** A token allowance does not cap cost. At the blended mix
2.5M tokens is about $0.97 with the cache working and around $2.60 without it —
the same allowance, nearly triple the bill, precisely in the situation where a
brake is most needed. Dollars are the unit that cannot drift with cache
behaviour, prompt size or a price change.

$29.99 a year is $2.12 a month after Apple's 15% Small Business rate. A $1.00
ceiling is under half of that at the absolute maximum, and roughly 255 messages —
about eight a day — when the cache is healthy. Nobody legitimate reaches it, and
if caching underperforms the same budget simply yields fewer messages, which is
the correct behaviour rather than a bug.

**Under no circumstances is any user allowed past $2.00.** If the measured
per-message cost from §1 makes $1.00 look tight in normal use, report the number
rather than raising the cap.

Keep the existing per-hour and per-day message limits as a first line of defence,
lowered to **20 an hour and 40 a day**. They stop a runaway loop quickly; the
budget stops sustained expense.

Both checks read the tier from the database inside the Edge Function. Never from
the request body.

**What the user sees** when the budget is reached: not an error. A quiet line
saying they have used this month's assistant messages and it resets on the 1st,
with the message they typed still in the box. **Never show a dollar figure or a
token count.** If a number is shown anywhere, it is messages — "255 messages a
month" reads as generous, "$1.00 of AI" reads as metered.

---

# 6. Free tier

Three messages total, as already specified, and the $0.02 budget above as a
backstop in case a single message somehow runs long.

---

# Before you say it is done

1. Real measured cost per message, reported, split input / cached / output.
2. `MAX_TOKENS` is 2000, and if a response ever does hit that ceiling it ends
   cleanly rather than mid-sentence — handle the truncation case in the UI.
3. Answers are as long as the question needs. A question about four interacting
   products still gets a full answer.
4. Cache reads are non-zero in the telemetry, and the cached prefix measures
   above 4,096 tokens — below that Haiku 4.5 silently does not cache.
5. A user at the monthly budget gets 402 and a calm message, not an error.
6. A user one cent under the budget can still send.
7. The composer stops at 240 characters and the server rejects 241.
8. Simulate 300 messages from one account and confirm total spend lands under
   $1.00 and the cutoff fired before it was exceeded.
9. Confirm the ceiling is enforced on summed `cost_usd`, not on a token count or
   a message count.

Then tell me: the measured per-message cost before and after each change, the
worst-case monthly spend for one Pro user, and what the catalogue filtering in §3
saved in tokens.
