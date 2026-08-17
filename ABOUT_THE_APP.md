# What this app is and what it holds

A factual reference for drafting the Terms of Use and Privacy Policy. Everything
below was read out of the schema, the client and the Edge Function — not from
memory. Where something is a decision rather than a fact, it is marked
**[DECIDE]** and must not be invented.

---

## 1. What the product does

A supplement timing and scheduling app for iOS, built with React, Vite and
Capacitor, with Supabase for authentication and data.

The user answers a short onboarding questionnaire, picks from seven goals, and
receives a list of over-the-counter supplement products drawn from a fixed
catalogue. Those products are placed into a daily schedule around the user's own
wake time, sleep time and meal times, respecting documented absorption
interactions between ingredients. The user marks doses as taken, and the app
tracks adherence over time.

It also carries a reference library of research citations and an AI assistant
that answers questions using only that library.

### What it explicitly does not do

- It does not diagnose, treat, cure or prevent any condition.
- It does not provide medical advice, and says so in the interface.
- It does not calculate a dose. Every figure shown is read from a stored
  published value (NIH Office of Dietary Supplements reference intakes) or from
  a product's filed label panel. Nothing is computed from user parameters.
- It does not recommend, rank, dose or schedule **peptides**. Peptides appear as
  a reference library only — description and research links, no amounts, no
  timing. This is enforced in the database schema, in the Edge Function, and in
  the UI.
- It contains no prescription medications.
- It shows no advertising and performs no cross-app or cross-site tracking.
- It does not sell, rent or share personal data with third parties for their own
  purposes.

---

## 2. Who can use it

**[DECIDE] Minimum age.** This has real consequences and needs an explicit
answer before launch:

- Under 13 in the US triggers COPPA and effectively means verifiable parental
  consent, which this app is not built for.
- Under 16 in much of the EU/UK raises the same problem for consent to process
  data.
- The app asks for age during onboarding and stores it, and the reference
  intakes it displays include a `14-18` age band, which implies teenagers are
  expected users.

The safest position for a solo-operated app is **13+ or 16+ with a stated
minimum**, and the App Store age rating must agree with whatever is chosen.

---

## 3. Accounts and authentication

- Email and password only, via Supabase Auth. There is no Google or Apple
  sign-in, and no anonymous mode past the first onboarding screens.
- Onboarding begins before an account exists; answers given anonymously are
  migrated onto the account at sign-up.
- **In-app account deletion exists** and is wired to a server-side
  `delete_account` function that removes the auth record and cascades to every
  table below. Local device state is cleared at the same time.

---

## 4. Every piece of personal data the app holds

Grouped by sensitivity, because several categories are **special-category health
data** under UK and EU GDPR (Article 9) and require explicit consent, not just
legitimate interest.

### Identity and account

| Field | Table |
|---|---|
| Email address | Supabase `auth.users` |
| Display name | `profiles.display_name` |
| Account created / last opened | `profiles.created_at`, `last_opened_at` |
| Subscription tier | `profiles.subscription_tier` |

### Personal characteristics — sensitive

| Field | Table | Note |
|---|---|---|
| Age | `profiles.age` | drives reference intakes |
| Sex | `profiles.sex` | `m` / `f` / `na`, drives reference intakes |
| Menstrual status | `profiles.menstruates` | optional, nullable, **special category** |
| Dietary restrictions | `profiles.diet` | vegetarian, vegan, dairy-free etc. |

### Health and behaviour — special category

| Field | Table | Note |
|---|---|---|
| Supplements the user takes | `stacks`, `stack_items` | |
| Daily schedule and times | `schedule_items` | reveals wake, sleep, meal times |
| Wake and sleep times | `profiles.wake_time`, `sleep_time` | |
| Every dose and whether it was taken | `doses` | timestamped adherence history |
| Reasons for skipped doses | `dose_skips.reason`, `.note` | free text |
| Adverse reactions to supplements | `profiles.reactions`, `reactions_note` | free text |
| Health goals | onboarding answers | skin, sleep, energy, focus, training, immunity, growth |

### Progress notes and photos — the most sensitive thing here

`progress_notes` stores free-text notes, numeric body measurements, and a path
into a **private Supabase Storage bucket (`progress-photos`)**, one folder per
user, access-controlled so only that user can read their own.

These are user-supplied photographs, potentially of their own body. Any privacy
policy must name this explicitly — it is the single most sensitive category the
app touches and it cannot be covered by a generic "we store your content" line.

### AI assistant

| Field | Table | Note |
|---|---|---|
| Message count and timestamps | `ask_usage` | rate limiting only |
| Reported answers | `ask_reports.question`, `.answer` | stored only when a user reports an answer |
| Conversation thread | device `localStorage`, keyed per user | see §6 |
| Remembered notes | `user_facts.raw_text` | the "Something else" free text from the reactions question, kept verbatim and never overwritten |
| The model's reading of those notes | `user_facts.summary`, `.tags`, `.ingredient_keys`, `.confidence` | written lazily on a later assistant turn, never during onboarding. Tags are checked against a fixed enum and ingredient keys against the catalogue; anything unresolvable is discarded. Visible and deletable under You |

### What is **not** collected

No location, no contacts, no camera or microphone access beyond a
user-initiated photo, no advertising identifier, no device fingerprint, no
analytics SDK, no crash reporting SDK. `package.json` carries no analytics or
attribution dependency of any kind.

---

## 5. Where it lives, and for how long

- All data is in **Supabase** (hosted Postgres plus Storage). **[DECIDE] Which
  region the project is in** — this determines whether EU/UK user data leaves
  the region and whether transfer safeguards need describing.
- Row-level security is enabled on every user table, with policies restricting
  access to `auth.uid() = user_id`.
- **[DECIDE] Retention.** Nothing currently expires. Rows persist until the user
  deletes their account. `ask_usage` in particular grows indefinitely and is only
  read for the last 24 hours.
- Deletion is immediate and cascading on account deletion.

---

## 6. Data that leaves the device

Three destinations, and only three.

**Supabase** — everything in §4. This is the primary processor.

**Anthropic** — when a user sends a message to the AI assistant. The request goes
from the app to a Supabase Edge Function, which adds context and calls the
Anthropic API. The API key never reaches the device.

What is sent to Anthropic with each message: the user's question, the recent
conversation, and context loaded server-side — age, sex, dietary restrictions,
reactions, goals, current stack, schedule and adherence. Since the memory work
it also includes up to ten undismissed `user_facts` rows — the user's own note
text and the model's stored summary of it — and, on the turn a note is first
interpreted, that note is sent to a forced `interpret_note` tool call. **No email
address, no name, and no user id are sent.** The privacy policy should say what
is sent and that it is used to answer that request rather than to train a model.

**Apple** — subscription purchases are handled by StoreKit and Apple's own
receipt infrastructure. **[DECIDE]** whether RevenueCat is used as an
intermediary; if so it becomes a further sub-processor and must be listed.

Conversation history is also cached in device `localStorage`, namespaced per
user account and cleared on sign-out and on account deletion.

---

## 7. The AI assistant, in detail

Relevant because it needs its own section in both documents.

- It answers **only from the app's own research library** — a fixed catalogue of
  products and citations. If nothing relevant exists it says so rather than
  answering from general knowledge.
- Every citation it returns is validated against the database before display, so
  it cannot invent a paper.
- It may recommend and rank **vitamins, minerals and other over-the-counter
  supplements**. It will not rank, dose or advise on peptides, and refuses to,
  enforced server-side.
- It declines to give amounts where a user mentions pregnancy, breastfeeding, a
  diagnosed condition or prescription medication, and redirects to a clinician.
- It carries a persistent "General information, not medical advice" line.
- Users can report any answer; the reported question and answer are stored.
- Rate limited per user: 20 messages an hour, 200 a day, and **[DECIDE]** a
  lifetime cap of 3 messages on the free tier.

**Terms should state plainly** that the assistant is automated, that its output
may be wrong, that it is not a healthcare professional, and that the user is
responsible for what they choose to take.

---

## 8. Subscriptions

- **[DECIDE — currently not implemented.]** Payments are stubbed and the paywall
  is disabled; the app as it stands is free and cannot charge.
- The intended plans are **$29.99 per year** and **$4.99 per month**,
  auto-renewing, purchased through Apple's in-app purchase.
- A free tier is planned: one product in the stack, a limited view of the
  catalogue, three AI messages in total.
- Restore Purchases exists.
- Apple handles all billing, renewal and refunds. Terms must say cancellation is
  managed in the user's Apple account settings, not by the developer, and that
  refunds are Apple's to grant.

---

## 9. Content, sources and intellectual property

- **Product data** comes from the NIH **Dietary Supplement Label Database
  (DSLD)** — brand, product name, form, and the full ingredient panel, with a
  link to the original filing. US government work, free to use.
- **Reference intakes** come from the NIH **Office of Dietary Supplements** fact
  sheets. Same status.
- **Research citations** come from **PubMed** via the NCBI E-utilities API.
  Titles, journals, years and links only.
- The catalogue names roughly 304 commercial products by brand. This is factual
  nominative use in a reference catalogue. **No brand logos are used and no
  endorsement, affiliation or partnership is implied**, and the documents should
  say so.
- All app copy, design, illustration and code is the developer's own.

---

## 10. Operational facts a policy needs

- **[DECIDE] Legal entity** — sole trader or company, and the registered name.
- **[DECIDE] Country of establishment**, which sets governing law and the
  relevant data protection regime.
- **[DECIDE] Contact address** for privacy requests. A working, monitored email
  is required by both Apple and GDPR.
- **[DECIDE] Data Protection Officer** — almost certainly not required at this
  scale, but the policy should still name a contact point.
- No employees, no third-party access to the database beyond the developer.

---

## 11. Things the documents must not claim

Worth stating, because generic templates get these wrong:

- Do not claim the app is HIPAA compliant. It is not a covered entity and HIPAA
  does not apply, but claiming compliance is a misrepresentation.
- Do not claim medical accuracy, clinical validation, or that a healthcare
  professional reviewed the content.
- Do not describe the app as providing personalised medical advice.
- Do not promise data is "100% secure" or "fully encrypted" beyond what is true:
  transport encryption and encryption at rest as provided by Supabase.
- Do not state a retention period the app does not enforce.
