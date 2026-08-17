# Apple's rules, mapped to this app

## Where the primary sources are

Most of Apple's rules are web pages, not PDFs. Only two of the things you need
exist as a downloadable file.

| Document | Format | Where |
|---|---|---|
| App Review Guidelines | **PDF** | `developer.apple.com/support/downloads/terms/app-review-guidelines/App-Review-Guidelines-English-UK.pdf` |
| App Review Guidelines | web | `developer.apple.com/app-store/review/guidelines/` |
| Apple Developer Program License Agreement | **PDF** | App Store Connect → Business → Agreements |
| Human Interface Guidelines | web | `developer.apple.com/design/human-interface-guidelines/` |
| App Privacy details (nutrition labels) | web | `developer.apple.com/app-store/app-privacy-details/` |
| Privacy manifests & required-reason APIs | web | `developer.apple.com/documentation/bundleresources/privacy-manifest-files` |
| Subscriptions & IAP reference | web | `developer.apple.com/app-store/subscriptions/` |

**How to give these to Claude Code.** Do not paste 60 pages into a prompt — it
will read the headline rules and lose the specifics. Either point it at the URLs
and let it fetch what it needs, or download the Review Guidelines PDF into
`docs/` in the repo. Then hand it this file, which is the part that actually
matters: which rules apply here and what to check.

---

## The guidelines that apply to this app

Numbers are Apple's. The "check" column is what to verify in this codebase.

### 1.2 — User-generated content

The Ask AI tab produces content inside your app, which puts you here whether or
not users post to each other.

- A way to report an answer. **`AskAI.tsx` already has the report sheet** —
  verify it actually writes to `ask_reports` and that you can see the rows.
- A published contact method. Currently `{{CONTACT_EMAIL}}` was filled — confirm
  the address exists and someone reads it.
- A stated way to act on reports. One line in Terms is enough at this size.

### 1.4.1 — Physical harm

The single most likely reason this app gets a second look.

- The app now shows a target amount, an upper limit and a serving size on every
  supplement. Each of those surfaces needs the disclaimer visible **without
  scrolling** — not only on the detail sheet but wherever an amount appears.
- Never exceed a stored upper limit in any recommendation, including once
  amounts are summed across a stack.
- Nothing in copy should read as treating, diagnosing or preventing a condition.
  Grep for "treats", "cures", "prevents", "fixes".

### 1.4.2 — Drug dosage

Apple restricts drug-dosage calculators to approved entities — manufacturers,
hospitals, universities, insurers, pharmacies.

**Your position, and it needs to be legible in thirty seconds to a reviewer who
has never met the product:** these are over-the-counter dietary supplements, not
drugs. The numbers are published NIH Office of Dietary Supplements reference
intakes, cited on screen, not computed. The app does not calculate a dose from
patient parameters.

What makes that defensible in the UI:

- Say where the number came from, next to the number. "Reference intakes are the
  published NIH figures for your age and sex, not a recommendation" — that line
  already exists; make sure it is on every surface showing a figure.
- **No dose, no timing, no ranking for peptides, anywhere.** Migration `0031`
  enforces this in the schema and the Edge Function refuses it. Keep both.
- No prescription medication anywhere in the catalogue.

### 2.1 — App completeness

- **Provide a demo account** in App Store Connect. Reviewers will not sign up.
  Create one with onboarding already completed, a stack, a schedule and some
  history, and put the credentials in the review notes. Apps get rejected for
  this more than for anything interesting.
- Every backend must be live during review. Your Supabase project **pauses after
  a week of inactivity on the free tier** — if it pauses mid-review the app is
  broken and you get rejected. Watch it, or upgrade before you submit.
- No stub that looks functional. `purchase()` currently returns `true` without
  charging; with `SKIP_PAYWALL` on, the screen never renders, which is fine.
  Shipping it visible would be 2.1 *and* 3.1.1.
- No placeholder text, no dead links, no "coming soon".

### 3.1.1 / 3.1.2 — In-app purchase and subscriptions

Only relevant once you charge. When you do:

- StoreKit only. A web checkout inside the app is an automatic rejection.
- The paywall must show, on the screen itself: title, length, price per period,
  an explicit auto-renew statement, and links to Terms and Privacy.
- **Restore Purchases**, visible, not buried.
- Subscription must deliver ongoing value and last at least seven days.

### 4.8 — Login services

You removed Google and Apple sign-in, so this no longer applies. **Verify no
third-party login remains** — if any comes back, Sign in with Apple becomes
mandatory alongside it.

### 5.1.1 — Data collection and storage

- Privacy policy live and linked in-app *and* in App Store Connect. Both exist.
- **In-app account deletion.** Wired to `delete_account`. Test it end to end and
  confirm it also clears local state.
- Permission strings in `Info.plist` must say why, specifically. "We need
  notifications" is not a reason.
- Ask for permission at the point of use, not at launch.

### 5.1.2 — Data use and sharing

- Do not use anything collected here for advertising.
- If you add PostHog or Sentry, they are data collection and must appear in the
  App Privacy labels and the privacy policy before you ship them.

### 5.2 — Intellectual property

Worth a thought, since the catalogue is 304 named commercial products.

- Naming brands factually in a reference catalogue is normal and fine. **Do not
  use brand logos, and do not imply endorsement or partnership.**
- The DSLD and PubMed data are US government works and free to use.
- If you later store third-party AI summaries of papers, check that provider's
  terms for commercial redistribution.

---

## The App Privacy questionnaire

You will be asked to declare every data type collected. For this app that is at
least:

- Contact info: email address
- Health & fitness: supplements taken, adherence, skip reasons, goals
- Sensitive info: age, sex — and diet, which Apple treats as health-adjacent
- Identifiers: user ID
- Usage data: only if you add analytics

For each: whether it is linked to identity (yes, it is), and whether it is used
for tracking (no). Under-declaring is a rejection; over-declaring costs you
nothing but a scarier label.

Cross-check this against `PrivacyInfo.xcprivacy`, which already exists in
`ios/App/App/`. The two must agree.

---

## What to have Claude Code do with this

Give it this file plus the Review Guidelines URL and ask for one thing:

> Go through `APPLE_COMPLIANCE.md` guideline by guideline. For each, tell me
> where in this codebase it is satisfied, where it is not, and what the exact
> fix is. Do not fix anything yet — produce the list first.

A list you can read beats a commit you have to audit. Then decide what it
changes.
