# What the app remembers about you

The reactions question in onboarding has a "Something else" option that opens a
free-text field. Right now that text is stored as `reactionsNote` and nothing
reads it — I originally said not to parse it, because free text cannot drive a
rule in code.

That still holds for **rules**. What changes here is that the text becomes
*memory*: the assistant reads it, and where the model can confidently map it onto
something the app already understands, that mapping is stored and used.

The distinction matters and it runs through everything below. **A model's reading
of free text may inform what the assistant says. It may never silently change a
dose, a schedule or a safety warning.**

---

# 1. The table

```sql
create table if not exists public.user_facts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  source          text not null check (source in ('onboarding_reaction','chat','manual')),
  raw_text        text not null,
  summary         text,
  tags            text[] not null default '{}',
  ingredient_keys text[] not null default '{}',
  confidence      numeric,
  interpreted_at  timestamptz,
  dismissed_at    timestamptz,
  created_at      timestamptz not null default now()
);
create index on public.user_facts (user_id, created_at desc);
alter table public.user_facts enable row level security;
create policy "own rows" on public.user_facts
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- `raw_text` is what the user typed, stored verbatim and never overwritten.
- `summary` is the model's one-line normalisation — "iron on an empty stomach
  causes nausea".
- `tags` map onto the existing reaction taxonomy where possible: `iron-gi`,
  `mag-gi`, `fishoil-burp`, `niacin-flush`, `large-caps`, `zinc-nausea`. Anything
  outside that vocabulary is stored but is context only.
- `ingredient_keys` **must be validated against `ingredient_synonym` before
  insert.** The model may propose "magnesium"; if it proposes something that
  resolves to no canonical key, drop it. Never store an invented ingredient.
- `confidence` is the model's own 0–1. Below 0.6, store the row with empty `tags`
  and `ingredient_keys` — raw text only.
- `dismissed_at` is the user removing it. Soft delete, so the assistant stops
  seeing it without the row vanishing mid-conversation.

RLS is not optional. This is free-text health information about a named person.

---

# 2. Interpreting the text

## When

**Not during onboarding.** An API call in the middle of the flow adds latency to
the one screen sequence you cannot afford to slow down, costs money for every
signup including the ones that never come back, and fails badly offline.

Interpret **lazily**: on the first Ask AI open, or the first time the recommender
runs after the note was written, whichever comes first. Until then the row exists
with `interpreted_at` null and `raw_text` populated, and the assistant simply
reads the raw text as context.

## How

A small dedicated call in the Edge Function — not the main chat turn — with a
tool schema that forces structure:

```ts
{
  name: 'interpret_note',
  input_schema: {
    type: 'object',
    properties: {
      summary:         { type: 'string' },
      tags:            { type: 'array', items: { type: 'string',
                          enum: ['iron-gi','mag-gi','fishoil-burp','niacin-flush',
                                 'large-caps','zinc-nausea','other'] } },
      ingredient_names:{ type: 'array', items: { type: 'string' } },
      confidence:      { type: 'number' }
    },
    required: ['summary','tags','ingredient_names','confidence']
  }
}
```

Then, server-side and in code, not by asking the model nicely:

1. Resolve every `ingredient_names` entry through `ingredient_synonym`. Keep the
   ones that resolve, discard the rest, and log what you discarded.
2. Reject any tag outside the enum.
3. If `confidence < 0.6`, blank `tags` and `ingredient_keys`.
4. Write `interpreted_at`.

**If the note describes something medical rather than a product reaction** — a
diagnosis, a prescription, pregnancy, symptoms needing care — set `tags` to
`['other']`, store the summary, and add no ingredient keys. The assistant will
still see it and can respond appropriately; the recommender must not act on it.

---

# 3. What reads it

**The assistant.** Every non-dismissed fact goes into the system prompt as
context, with the raw text and the summary. The whole point: a user who said
"magnesium citrate wrecks my stomach" in onboarding should never be offered
magnesium citrate three weeks later without acknowledgement.

**The recommender**, but only through validated fields. `recommend.ts` may use a
recognised `tag` and a resolved `ingredient_key` exactly as it already uses the
chip answers — prefer bisglycinate over sulfate, and so on. It must never parse
`raw_text` or `summary`.

**Nothing else.** Not the scheduler directly, not notifications, not the
conflicts engine. Those act on ingredients and stored figures.

---

# 4. Letting the assistant remember new things

The same table should take facts from conversation, because that is where people
actually say them. Give the assistant a second tool:

```ts
{ name: 'remember', input_schema: { type: 'object',
    properties: { raw_text: {type:'string'}, summary: {type:'string'},
                  tags: {...same enum...}, ingredient_names: {...},
                  confidence: {type:'number'} },
    required: ['raw_text','summary','confidence'] } }
```

Rules:

- Same validation path as §2. No shortcuts because it came from a tool call.
- **Only facts the user stated about themselves.** Not inferences, not things the
  assistant concluded, not anything it recommended. If the user says "I get
  headaches from zinc", store it. If the assistant decides "you seem sensitive to
  minerals", do not.
- Rate limit it: at most 5 per conversation, so a long chat cannot fill the table.
- When it stores something, say so in the reply, in one short line: "I'll
  remember that magnesium citrate doesn't agree with you." People should never
  discover silently that an app has been building a profile of them.

---

# 5. The user has to be able to see and delete it

A section in **You** — "What Pepstack remembers". A list of the summaries, each
with the date and a swipe or button to remove it, which sets `dismissed_at`.

This is not optional politeness. You are storing model-interpreted health notes
about an identified person: they need to be able to read what you hold, correct
it when the interpretation is wrong, and delete it. It is also the only way you
find out that the model misread someone, which is the failure mode that matters
most here.

`delete_account` already cascades, but add `user_facts` to that function's test.

**And update the App Privacy declaration.** This is a new data type — free-text
health notes, linked to identity. It has to appear in App Store Connect and in
the privacy policy before it ships.

---

# 6. The onboarding field itself

Keep the chips as the primary answer; they are what drives rules. The free-text
field stays secondary, below them, with placeholder copy that sets the
expectation honestly:

> Anything else that hasn't agreed with you? We'll remember it.

Not "tell us everything" — a big open box early in onboarding gets abandoned.
One line, optional, skippable.

---

# Before you say it is done

1. A note saying "iron makes me feel sick" resolves to tag `iron-gi` and
   ingredient key `iron`, and the recommender prefers bisglycinate.
2. A note naming something not in the catalogue stores raw text with no
   ingredient keys, and nothing breaks.
3. A note describing a prescription medication or pregnancy stores as `other`
   with no ingredient keys, and the recommender ignores it.
4. Deliberately return confidence 0.4 and confirm tags and keys are blanked.
5. Return a fabricated ingredient name and confirm it is discarded, not stored.
6. The assistant references a stored fact in a later, separate conversation.
7. The assistant says out loud when it stores something new.
8. The user can see the list in You, delete an entry, and the assistant stops
   using it on the next message.
9. Onboarding is not slowed down — no model call happens during the flow.
10. `delete_account` removes the rows.

Then tell me: how many notes failed ingredient resolution in your tests, what the
interpretation call costs per user, and any case where the model's summary
changed the meaning of what the user typed.
