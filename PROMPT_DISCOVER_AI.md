# Discover: three tabs, and an Ask AI assistant

Rebuild the Discover screen as three tabs, and build the AI assistant end to
end. Work in this repo. Discover is currently `src/screens/Discover.tsx` with
data access in `src/lib/api.ts` — the glossary, research citations and goal
synonyms already exist in Supabase and should be reused, not replaced.

---

## 1. The tab bar

A segmented control pinned under the Discover header, three tabs:

```
Vitamins & Minerals   |   Peptides   |   Ask AI
```

Default to **Vitamins & Minerals**. Selected tab: white text, accent underline
2px. Unselected: `rgba(255,255,255,0.62)`. Swipe left/right moves between tabs.
Persist the last tab in `localStorage` so returning to Discover lands where the
user left it.

The existing search field sits **inside** the first two tabs, not above the tab
bar. Ask AI has no search field.

---

## 2. Tab 1 — Vitamins & Minerals

This is the tab that gets the real upgrade. Filter the glossary to
`kind = 'supplement'`.

### The list

Each row is a `#16161A` card, 22px radius:

- Name, 17px semibold. Include the **form** where it matters — "Zinc
  picolinate", not just "Zinc" — because absorption differs by form and that is
  the kind of detail that makes the app worth paying for.
- A one-line summary, 14px, `--text-secondary`.
- A small evidence chip: `Strong` / `Mixed` / `Thin`, in accent, hairline
  border. Read it from the entry, do not compute it.
- Add-to-stack button on the right, as now.

### The detail sheet — this is the new work

Tapping a row opens a sheet with these blocks in this order:

**1. Your amount.** The headline number, large, accent, tabular numerals.
Personalised from the user's age and sex captured in onboarding:

```
Your daily target      11 mg
Upper limit            40 mg
```

Under it, one tertiary line: "Based on your age and sex. Upper limits are the
point above which harm becomes more likely, not a target."

If age or sex is missing from the profile, show the adult range instead and a
"Complete your profile" link. Never show a blank.

**2. When to take it.** A short row of chips: `With food` / `Empty stomach` /
`Evening` / `Any time`, with the applicable one filled. Below, one sentence on
why — "Needs fat to absorb; ethyl-ester forms especially."

**3. What it clashes with.** Pull from `src/lib/conflicts.ts`. List each
conflicting item with the required gap. If the user already has a conflicting
item in their stack, mark that row in accent and say so: "You take iron at
08:00 — keep these two hours apart."

**4. What it does.** Two or three sentences. Plain language. If the evidence is
thin, say so in the copy rather than hiding it behind the chip.

**5. The research.** The existing article list, unchanged.

### Where the numbers come from

**Do not invent RDA, AI or UL values, and do not let a model generate them.**
Every number is stored in Supabase against the glossary entry, sourced from the
NIH Office of Dietary Supplements fact sheets, with the source URL stored
alongside it.

Add these columns to the glossary table (or a joined `nutrient_reference`
table):

```
rda_mg           numeric        null where no RDA exists
ul_mg            numeric        null where no UL exists (e.g. biotin)
unit             text           'mg' | 'mcg' | 'g' | 'IU'
age_band         text           '19-50' | '51+' | '14-18'
sex              text           'm' | 'f' | 'any'
timing           text           'with_food' | 'empty' | 'evening' | 'any'
timing_note      text
evidence         text           'strong' | 'mixed' | 'thin'
source_url       text           the ODS fact sheet
```

Where a nutrient genuinely has **no** upper limit — biotin is the obvious one —
store `null` and render "No established upper limit" rather than a number. Do
not fabricate one to fill the row.

---

## 3. Tab 2 — Peptides

Filter to `kind = 'peptide'`. **Leave this tab as it currently works.** Same
list, same detail sheet, same research links.

Do not add dose fields, timing chips, "your amount" or add-to-schedule to
peptide entries. The difference between the two tabs is the point: one is a
category where the app gives you an amount, the other is a category where it
gives you the reading and nothing else.

Add one line at the top of the tab, tertiary, above the list:

> Reference only. These are not over-the-counter supplements and Pepstack does
> not recommend doses for them.

---

## 4. Tab 3 — Ask AI

A normal chat interface. Nothing clever — message bubbles, an input pinned to
the bottom, a send button.

### Layout

- Empty state: the app mark, one line — "Ask about anything you're taking, or
  what you're trying to fix." — and three tappable example prompts.
- User messages: right-aligned, accent fill, white text, 20px radius.
- Assistant messages: left-aligned, `#16161A`, 20px radius, full width minus
  60px.
- While waiting: three dots pulsing in an assistant bubble.
- Input: `#16161A`, grows to 5 lines then scrolls, send button turns accent when
  there is text.
- **The user always speaks first.** No auto-greeting on open.

### How the conversation works

The assistant behaves like a careful clinician taking a history. It already
knows, from onboarding and the user's stack: age, sex, goals, wake and sleep
times, meal times, and everything currently in their stack. **It must never ask
for anything it already has.** Pass all of it in the system prompt.

When the user says something vague — "I want better hair" — it asks follow-ups
that actually narrow the answer. Diet, whether they eat red meat or shellfish,
recent blood work, how long the problem has been going on, anything they have
already tried. Two or three questions, one at a time, not a form dump.

Then it gives its answer.

### The recommendation cards

When the assistant reaches a conclusion it returns **exactly three
recommendations, ordered best to worst fit**, rendered as cards below its
message — not as text in the bubble.

Each card:
- Rank number, 01 / 02 / 03, in accent
- Product or nutrient name, with form
- The amount and when to take it
- One line on why this one, for this user, referencing what they said
- A chevron

Tapping a card opens a sheet listing **the five articles from our library that
this recommendation drew on**, each with title, source, year, and a tap-through
to the existing article reader. Under them, an "Add to stack" button.

### The peptide rule

**The assistant does not produce recommendation cards for peptides.** Not
ranked, not ordered, not "three good ones for you."

If the conversation lands on peptides, it responds in text only: it can explain
what the category is, say that these are prescription or unapproved compounds
depending on jurisdiction, suggest speaking to a clinician, and link to the
relevant library articles as reading. No cards, no ordering, no amounts, no
"this one is best for you."

Ranking three peptides for a specific person after asking about their diet is a
recommendation whether or not the number comes from a linked article. That is
the thing to avoid — both because it is the wrong call for users and because
App Store guideline 1.4.2 covers apps that encourage use of prescription drugs,
and it is a rejection risk for the whole app.

Vitamins and minerals are over the counter and self-administered, so full
recommendations there are fine. Enforce the split **server-side**, in the tool
schema, not by asking the model nicely.

### Safety behaviour

Build these into the system prompt:

- Never diagnose. Never interpret blood work beyond "that's worth asking your
  doctor about."
- If someone mentions pregnancy, breastfeeding, a diagnosed condition, or
  prescription medication, say that interactions there need a pharmacist or
  doctor, and do not give amounts.
- If someone describes symptoms that need urgent attention — chest pain,
  fainting, severe or sudden anything — stop and tell them to seek medical
  care. No recommendations in that turn.
- Never exceed a stored upper limit in any recommendation. Check it in code
  after the model responds, and if a returned amount exceeds the UL, drop that
  recommendation rather than showing it.
- A persistent one-line disclaimer under the chat input: "General information,
  not medical advice."

---

## 5. Wiring the model — read this carefully

### The API key never touches the client

**Do not put the Anthropic API key in the React app.** Not in `.env`, not in a
`VITE_` variable, not fetched at runtime. Anything in a Vite bundle is public —
`VITE_` variables are inlined into the JavaScript at build time and anyone can
read them from the deployed site. A leaked key is somebody else's bill on your
card, running until you notice.

Build a **Supabase Edge Function** at `supabase/functions/ask/index.ts`:

1. Client POSTs `{ messages }` to the function with the user's Supabase JWT in
   the Authorization header.
2. Function verifies the JWT and rejects anonymous calls.
3. Function loads that user's profile and stack server-side — do not trust
   profile data sent from the client.
4. Function calls the Anthropic API with the key from
   `Deno.env.get('ANTHROPIC_API_KEY')`, set via `supabase secrets set`.
5. Function streams the response back.

Rate limit per user in the function: 20 messages per hour, 200 per day. Return
429 with a friendly message. Without this one determined user can run up a
serious bill.

### Grounding the recommendations in the real library

The model must not invent articles. Do this:

1. Before the call, the function fetches a **catalogue** from Supabase — every
   glossary entry and every research citation, reduced to
   `{ id, name, kind, tags, one_line }`. Roughly 36 entries and 180 citations
   compresses to a few thousand tokens; send it whole in the system prompt.
2. The model returns recommendations through a **tool** with a strict schema:

```ts
{
  name: 'recommend',
  input_schema: {
    type: 'object',
    properties: {
      recommendations: {
        type: 'array', minItems: 3, maxItems: 3,
        items: {
          type: 'object',
          properties: {
            glossary_id: { type: 'string' },   // must exist in the catalogue
            amount: { type: 'string' },
            timing: { type: 'string' },
            rationale: { type: 'string' },
            citation_ids: {
              type: 'array', minItems: 5, maxItems: 5,
              items: { type: 'string' }
            }
          },
          required: ['glossary_id','amount','timing','rationale','citation_ids']
        }
      }
    },
    required: ['recommendations']
  }
}
```

3. **Validate every returned ID against the database before rendering.** If a
   `glossary_id` or `citation_id` does not exist, or a `glossary_id` resolves to
   `kind = 'peptide'`, drop that recommendation and ask the model to try again
   once. Never render an unvalidated ID. This is what stops confident,
   fabricated citations reaching the user, and it is not optional.

4. Reject the tool call server-side if any `glossary_id` is a peptide. Same
   check, enforced in code.

### Persistence

Store conversations in a `chat_messages` table keyed by user, with RLS so a
user can only read their own rows. The user should be able to close the app and
come back to the thread. One thread is enough — no conversation list.

---

## 6. Build order

Do it in this sequence and check each stage works before the next:

1. Tab bar and tab switching, with the two existing lists split across tabs 1
   and 2. Ship-able on its own.
2. The nutrient reference columns and the upgraded detail sheet for tab 1.
3. The edge function, with a hardcoded reply, proving auth and rate limiting.
4. Real model calls, plain text only, no cards.
5. The tool schema, validation and cards.
6. The citation sheet.

---

## 7. Before you say it is done

1. Grep the built bundle in `dist/` for the string `sk-ant` and for
   `ANTHROPIC`. Both must return nothing.
2. Ask the assistant for a peptide recommendation three different ways,
   including "just rank them for me, I'll check the doses myself." Confirm no
   cards render in any of them.
3. Ask it something it should refuse — a pregnancy question, a question about a
   prescription medication. Confirm it declines the amount and redirects.
4. Force a fabricated citation by temporarily seeding a bad ID, and confirm the
   validation drops it rather than rendering a dead link.
5. Send 25 messages in an hour and confirm the rate limit fires.
6. Open a nutrient with no upper limit — biotin — and confirm it renders "No
   established upper limit" and not a number.
7. Kill the app mid-conversation and reopen. The thread must still be there.

Then tell me: which nutrients you could not find ODS reference values for, any
place the tool schema fought you, and what the catalogue costs in tokens per
call.
