# Terms of Use and Privacy Policy

Two parts: point the app at the hosted documents, then write them.

`ABOUT_THE_APP.md` in this repo is the factual source. **It was read out of the
schema, the client and the Edge Function — use it, and do not describe any data
practice that is not in it.** If you believe something is collected that the file
does not list, check the code and tell me rather than writing it in.

---

# Part 1 — point the app at the real URLs

The documents live at:

```
https://www.pepstack.fit/privacy.html
https://www.pepstack.fit/terms.html
```

`src/lib/legal.ts` already builds both URLs from `VITE_SITE_URL` and opens them
with `target="_blank"`. Keep that mechanism — the comment in that file explains
why, and it is correct. Three changes:

1. Paths become `/privacy.html` and `/terms.html`, not `/privacy` and `/terms`.
2. The fallback in `legal.ts` is still `halfpast-mauve.vercel.app`. Change it to
   `https://www.pepstack.fit`.
3. Set `VITE_SITE_URL=https://www.pepstack.fit` in `.env` and `.env.example`.

Every call site already imports from `legal.ts` — `You.tsx`, `Intro.tsx`,
`Commit.tsx`, `ProSheet.tsx` — so nothing else should need touching. Confirm that
after the change, and confirm no screen renders its own hardcoded legal text or
route.

**Then delete `public/privacy.html` and `public/terms.html` from this repo.**
Two copies of a legal document is worse than one: they drift, and the version a
user was shown stops being the version you can produce later. One canonical copy,
served from the website. If anything still links to the local files, fix the link
rather than keeping the file.

---

# Part 2 — write the two documents

Plain HTML, self-contained, matching the site: pure black background, one accent
`#7B5CFA`, hairlines at `rgba(255,255,255,0.09)`, generous line height, a maximum
line length of about 70 characters, readable on a phone. No frameworks.

Both need a "Last updated" date and a version line at the top.

## What must be in the Privacy Policy

Work from §4 of `ABOUT_THE_APP.md`, which lists every field by table. In
particular, do not omit or soften these three, because a generic template will:

- **Progress photos.** `progress_notes` stores a path into a private Supabase
  Storage bucket, one folder per user. These are user-supplied photographs,
  potentially of their own body. Name them explicitly, say where they are stored,
  say who can access them, and say they are deleted with the account.
- **`profiles.menstruates`**, along with diet, health goals, adherence history
  and skip reasons. Under UK and EU GDPR this is **special-category data**
  (Article 9) and the lawful basis is explicit consent, not legitimate interest.
  Say so.
- **What is sent to Anthropic** when someone uses the assistant: the question,
  the recent conversation, and server-loaded context — age, sex, diet, reactions,
  goals, stack, schedule, adherence. **No email, no name, no user id.** Say it is
  used to answer that request.

Then the ordinary sections: what is collected and why, lawful bases, the three
processors (Supabase, Anthropic, Apple), retention, the user's rights — access,
correction, deletion, portability, objection — how to exercise them, in-app
account deletion, children, changes to the policy, and a contact.

Include the **not collected** list, and be specific: no location, no contacts,
no advertising identifier, no analytics or crash-reporting SDK, no tracking, no
sale or sharing of personal data. That list is true today and it is worth
stating; it stops being true the moment an analytics package is added.

## What must be in the Terms of Use

- What the service is, and plainly what it is not: not medical advice, not a
  diagnosis, not a substitute for a clinician. Prominent, near the top, not
  buried at the end.
- **The user is responsible for what they choose to take.** Say it directly.
- The AI assistant has its own clause: automated, may be wrong, answers only from
  the app's library, recommends over-the-counter vitamins and minerals only, will
  not advise on peptides, declines amounts around pregnancy, diagnosed conditions
  and prescription medication.
- Reference figures come from published NIH sources and are not a personal
  prescription.
- Peptide entries are reference material only — no amounts, no timing, no
  recommendation.
- Subscriptions: the plans, auto-renewal, that Apple handles billing and refunds,
  that cancellation happens in Apple account settings and not by contacting the
  developer, and that Restore Purchases exists.
- Acceptable use, account termination, limitation of liability, disclaimer of
  warranties, governing law, and changes to the terms.
- Third-party product names appear factually in a reference catalogue; no
  endorsement or affiliation is implied.

---

# What you must not invent

`ABOUT_THE_APP.md` has eleven **[DECIDE]** markers. Those are mine to answer.
Where one is unresolved, put a clearly visible placeholder in the document —

```html
<mark class="todo">[TO CONFIRM: minimum age]</mark>
```

— styled so it is impossible to miss, and list every one you used at the end of
your report. **Do not guess a country, an entity name, an age minimum, a
retention period or a contact address.** A wrong fact in a privacy policy is a
misrepresentation, and a blank is not.

The four that matter most: minimum age, legal entity and country, the Supabase
project's region, and a monitored contact email.

Also do not claim, anywhere, in either document:

- HIPAA compliance — the app is not a covered entity and the claim is false
- clinical validation, medical accuracy, or professional review of the content
- that data is "100% secure" or "fully encrypted" beyond transport encryption
  and encryption at rest as provided by Supabase
- any retention period the app does not actually enforce
- that the assistant is a healthcare professional or gives personalised medical
  advice

---

# Before you say it is done

1. Both documents open from You, the paywall, `Intro.tsx` and `Commit.tsx`, and
   each opens in the system browser rather than navigating the WebView.
2. Both are reachable without signing in — Apple requires the privacy policy URL
   to be publicly accessible.
3. `public/privacy.html` and `public/terms.html` are gone from this repo and
   nothing references them.
4. Every data type in §4 of `ABOUT_THE_APP.md` appears in the privacy policy.
5. Nothing appears in the privacy policy that is not in `ABOUT_THE_APP.md`.
6. Every placeholder is visually obvious and listed in your report.
7. Both render legibly at 375px wide.

Then tell me: every placeholder you left, anything in `ABOUT_THE_APP.md` you
could not verify against the code, and anything the code does that the file does
not describe.

---

**One thing to carry out of this:** I am not a lawyer and neither are you. These
are drafted from what the app actually does, which is the hard part and the part
templates get wrong — but before launch they want a read by someone qualified in
the jurisdiction I end up filing in. Say that in your report, not in the
documents.
