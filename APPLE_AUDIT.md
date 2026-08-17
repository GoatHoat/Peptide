# App Store Review Guidelines — every numbered guideline

Fetched from developer.apple.com/app-store/review/guidelines on 17 August 2026
and worked through in full, including the sections whose headings sound
irrelevant. Two of the three findings below came from exactly those.

**Applies** — yes / no / partly, with the reason.
**Status** — pass / fail / at risk / cannot verify.
**Evidence** — a file and line, or a named screen. "Looks fine" is not evidence
and is not used anywhere in this file.

---

## The five things to fix before uploading

Everything else in this document is green or does not apply. These are not.

| # | Guideline | What |
|---|---|---|
| 1 | **2.1(a)** | `SKIP_PAYWALL` defaults to `'true'`, so a review build walks past the purchase entirely. Set `VITE_SKIP_PAYWALL=false` in the production build or the reviewer never sees the paywall and IAP appears non-functional. |
| 2 | **2.1(b)** | `purchase()` is a 900 ms stub that returns true. **No StoreKit product exists.** The app cannot ship with a subscription tier until this is real. |
| 3 | **5.1.1(i)** | The privacy policy is reachable but every one of its 10 placeholders is unfilled — entity, country, retention, contact. A policy that says `[LEGAL ENTITY]` is not a policy. |
| 4 | **1.5** | No support URL or contact email exists anywhere. Required in App Store Connect and required to be accurate. |
| 5 | **2.3** | Metadata does not exist yet — no screenshots, description or keywords have been written, and 2.3.3 forbids screenshots that are just a splash or login screen. |

---

## 1. Safety

| Guideline | Applies | Status | Evidence / what to fix |
|---|---|---|---|
| 1.1 | No — no UGC, no social surface | pass | Only user-authored text is a private progress note and the reactions note; neither is shown to anyone else. `supabase/migrations/0038_user_facts.sql:50` RLS restricts to `auth.uid()`. |
| 1.1.1 | No — no user-to-user content | pass | As 1.1. |
| 1.1.2 | No — no violence | pass | — |
| 1.1.3 | No — no weapons | pass | — |
| 1.1.4 | No — no sexual content | pass | — |
| 1.1.5 | No — no religious content | pass | — |
| 1.1.6 | **Partly** — no false information | **pass** | The app must not state figures it invented. `src/lib/recommend.ts:199-222` removed the `amountFactor` that multiplied the ODS iron RDA; `src/onboarding/screens/Results.tsx:117-127` renders the stored figure and nothing computed. Asserted in `tests/e2e/support/app.ts` ("18 mg a day if you menstruate · 8 mg if you don't"). |
| 1.1.7 | No — not event-driven | pass | — |
| 1.2 | **Yes** — the assistant produces content | **pass** | Report control on every answer: `src/screens/AskAI.tsx` writes to `ask_reports` (migration `0027`), storing question and answer. Server-side refusal for peptides and pregnancy before the model sees the question: `supabase/functions/ask/index.ts` step 4, `classifyScope` in `lib.ts`. No user-to-user content, so blocking and filtering do not arise. |
| 1.2.1(a) | No — not a creator platform | pass | — |
| 1.3 | No — not Kids Category | pass | Age rating is not 4+; the flow asks age. |
| 1.4 | **Yes** — supplements and timing | **pass** | No dose is ever originated by the app. Every figure shown is a stored NIH ODS reference intake or a number the user typed. `legal.md:5` is the record of why. |
| **1.4.1** | **Yes** — health data shown | **pass** | The app claims no measurement from a sensor and takes no reading. It displays published reference intakes with provenance next to them: `Results.tsx` disclaimer names ODS by name and states it is "not a dose set by this app". |
| **1.4.2** | **Yes** — a calculator exists | **at risk** | `src/screens/ReconCalculator.tsx` converts three numbers the user supplies into a volume. It is not tied to any product, has no defaults, suggests no amount and stores nothing — `src/lib/recon.ts` header states the line and `tests/e2e/appstore.spec.ts` asserts every field starts empty and no substance is named. **This is a judgement call and it went the other way once before** (`legal.md:5`). If review objects, the whole screen removes cleanly: delete the case in `Today.tsx` and the two files. |
| 1.4.3 | No — no tobacco/drugs/alcohol | pass | — |
| 1.4.4 | No | pass | — |
| 1.4.5 | No — no challenges | pass | — |
| **1.5** | **Yes** | **fail** | No support URL, no contact email, no developer contact anywhere in the app or the repo. `website/privacy.html` has `[CONTACT EMAIL]` unfilled. **You must supply one.** |
| 1.6 | **Yes** | **pass** | RLS on every user table; the edge function runs on the caller's JWT and the anon key, never `service_role` (`supabase/functions/ask/index.ts:24-27`); no secret in `dist/` (grep for `sk-ant`, `service_role`, `ANTHROPIC_API_KEY` all return 0). |
| 1.7 | No | pass | — |

## 2. Performance

| Guideline | Applies | Status | Evidence / what to fix |
|---|---|---|---|
| **2.1(a)** | **Yes** | **fail** | `src/lib/billing.ts:64` — `SKIP_PAYWALL` defaults `'true'`. A build made without `VITE_SKIP_PAYWALL=false` skips the paywall step entirely (`flow.ts` `isSkipped`), so a reviewer never reaches the purchase and reports it missing. Also: no demo account has been created. **Both are yours to do.** |
| **2.1(b)** | **Yes** | **fail** | `src/lib/billing.ts:30` — `purchase()` waits 900 ms and returns `true`. There is no StoreKit configuration and no product in App Store Connect. The tier cannot ship until this is real. `ProSheet` is honest about it in-app ("Subscriptions are not switched on yet"), which prevents a false claim but does not make the IAP functional. |
| 2.2 | No — not a beta | pass | — |
| **2.3** | **Yes** | **cannot verify** | No App Store Connect metadata has been written. What the app must match: one product tracked free, 30 of each kind in Discover, three assistant messages — enforced at `src/lib/entitlements.tsx:22-25` and named on the paywall at `Commit.tsx`. If the listing claims more, that is 2.3.1. |
| 2.3.1(a) | Yes | pass | No hidden or dormant feature. `SKIP_PAYWALL` is a build flag, not a hidden feature, but **must be off in the submitted build** — see 2.1(a). |
| 2.3.1(b) | Yes | pass | — |
| 2.3.2 | Yes | **cannot verify** | Metadata not written. The listing must say which items need a purchase. |
| 2.3.3 | Yes | **cannot verify** | No screenshots exist. They must show the app in use — Today with a schedule, Discover with results — not the splash or the auth screen. |
| 2.3.4 | No — no preview video | pass | — |
| 2.3.5 | Yes | **cannot verify** | Category not chosen. Health & Fitness is the honest one; Medical would invite 1.4.1 scrutiny the app does not need. |
| 2.3.6 | Yes | **cannot verify** | Age rating not answered. The app has no objectionable content; 12+ or 17+ is likely driven by the "unrestricted web access" answer, which is **no** — every external link opens Safari. |
| 2.3.7 | Yes | pass | `src/lib/brand.ts` — `NAME` is "Pepstack", 8 characters, no trademarked term. |
| 2.3.8 | Yes | pass | Nothing in the app is above 4+ in content terms. |
| 2.3.9 | Yes | pass | Illustrations are original renders (`design/`, `public/art/`); the catalogue is NIH DSLD label filings and PubMed citations, both public data with provenance stored per row. |
| 2.3.10 | Yes | pass | No mention of Android or other platforms anywhere in `src/`. |
| 2.3.11 | No — not a pre-order | pass | — |
| 2.3.12 | Yes | **cannot verify** | First submission; no "What's New" yet. |
| 2.3.13 | No — no in-app events | pass | — |
| 2.4.1 | **Yes** | **at risk** | The layout is phone-first and is only tested at 375–440 px (`tests/e2e/widths.spec.ts`). It will run on iPad letterboxed. Nothing breaks, but it will not look designed for it. Declaring iPhone-only in App Store Connect is the conservative answer and costs nothing. |
| 2.4.2 | Yes | pass | No background work beyond `LocalNotifications`; no timers left running; no crypto. |
| 2.4.3 | No — not tvOS | pass | — |
| 2.4.4 | Yes | pass | Nothing asks for a restart or a settings change. The notification priming screen explains and then calls the API — `src/lib/notifications.ts:requestNotificationPermission`. |
| 2.4.5 (i–ix) | No — not Mac App Store | pass | Capacitor iOS only. |
| 2.5.1 | Yes | pass | Capacitor 8.5 on public APIs only; no private API use. |
| 2.5.2 | **Yes** | **pass** | Self-contained. The app downloads no code. **Note the risk that is not here**: it is a WebView loading a *bundled* build (`ios/App/App/public/`), not a remote URL — a remotely-hosted web app would fail this. `npx cap copy ios` is what keeps the bundle current, and it had been missed. |
| 2.5.3 | Yes | pass | — |
| 2.5.4 | Yes | pass | Only the notifications background mode, used for what it says. |
| 2.5.5 | **Yes** | **cannot verify** | Everything goes over HTTPS to Supabase and api.anthropic.com via the edge function, both of which are IPv6-capable, but this has not been tested on an IPv6-only network. Apple tests it. |
| 2.5.6 | No — not a browser | pass | External links open in Safari via `externalLink` (`src/lib/legal.ts`). |
| 2.5.8 | No | pass | — |
| 2.5.9 | Yes | pass | No standard switch is altered. The tab bar is custom but does not replace a system control. |
| 2.5.11 (i–iii) | No — no SiriKit | pass | — |
| 2.5.12 | No — no call blocking | pass | — |
| 2.5.13 | No — no facial recognition | pass | — |
| 2.5.14 | No — no recording | pass | The only capture is a progress photo, user-initiated per photo. |
| 2.5.15 | Yes | pass | Export writes via `@capacitor/share`; no file browser is presented. |
| 2.5.16(a) | Yes | pass | No widget, no App Clip. Notifications relate to the user's own schedule — `src/lib/notificationCopy.ts`. |
| 2.5.17 | No — no Matter | pass | — |
| **2.5.18** | **Yes** | **pass** | **No advertising of any kind in the app.** This is the guideline that would otherwise bite hardest — 2.5.18 forbids targeted advertising based on health data, and this app holds exactly that. There is no ad SDK in `package.json`. |

## 3. Business

| Guideline | Applies | Status | Evidence / what to fix |
|---|---|---|---|
| **3.1.1** | **Yes** | **fail** | Pro unlocks features, so it must be IAP. There is no IAP — see 2.1(b). No license keys, no QR codes, no crypto, no external purchase path exists, so nothing here is *wrong*; it is simply absent. |
| 3.1.1(a) | No — no external purchase link | pass | — |
| **3.1.2** | **Yes** | **at risk** | `src/lib/billing.ts` `PLANS` offers monthly and annual, both ≥ 7 days. The subscription must work across the user's devices — the tier is on `profiles.subscription_tier` (migration `0037`), which is account-scoped and therefore does, **once StoreKit writes to it**. Nothing writes to it today. |
| 3.1.2(a) | Yes | pass | Ongoing value is defensible: a schedule that is maintained, an assistant with a monthly allowance, the full catalogue. It removes no previously-paid functionality. |
| 3.1.2(b) | Yes | **cannot verify** | Upgrade/downgrade between monthly and annual is StoreKit's job and StoreKit is not wired. |
| **3.1.2(c)** | **Yes** | **pass** | The paywall describes what is received before asking: `src/onboarding/screens/Commit.tsx` renders `VALUE` and, since this run, an explicit "Free includes" block naming all three limits. `tests/e2e/freetier.spec.ts` asserts it is present and that the screen contains no countdown or expiry language. |
| 3.1.3 (all) | No — none of the categories | pass | Not a reader app, not multiplatform-purchased, not enterprise, not person-to-person, not physical goods, not a companion to a paid web tool, not ad management. |
| 3.1.4 | No — no hardware | pass | — |
| 3.1.5 (i–v) | No — no crypto | pass | — |
| 3.2.1(i) | No — does not sell other apps | pass | — |
| 3.2.1(ii) | No | pass | — |
| 3.2.1(iii) | No — nothing expires | pass | — |
| 3.2.1(iv) | No — no Wallet passes | pass | — |
| 3.2.1(v) | No — not insurance | pass | — |
| 3.2.1(vi) | No — no fundraising | pass | — |
| 3.2.1(vii) | No — no gifting | pass | — |
| 3.2.1(viii) | No — not financial | pass | — |
| 3.2.2(i) | No | pass | — |
| 3.2.2(iii) | Yes | pass | No ads at all. |
| 3.2.2(iv) | No — no charity | pass | — |
| 3.2.2(v) | Yes | pass | No geographic or carrier restriction. |
| 3.2.2(vii) | No | pass | — |
| 3.2.2(viii) | No | pass | — |
| 3.2.2(ix) | No — no lending | pass | — |
| **3.2.2(x)** | **Yes** | **pass** | Nothing gates functionality behind a rating prompt, a share, or a download. There is no rating prompt in the app at all — grep for `SKStoreReviewController` and `requestReview` returns nothing. |

## 4. Design

| Guideline | Applies | Status | Evidence / what to fix |
|---|---|---|---|
| 4.1 (a–c) | Yes | pass | Original. No third-party icon or brand is used; product names in the catalogue are factual references to real products with label URLs. |
| **4.2** | **Yes** | **pass** | Not a repackaged website. Native-shell specifics that only exist in the app: local notifications with lock-screen actions (`src/lib/notificationRouter.ts`), a photo-backed progress log, offline reads from a device cache (`src/lib/storage.ts` `pepstack.today.v1`), and a schedule solver that runs on device (`src/lib/schedule.ts`). The lasting utility is a daily schedule, not a one-time lookup. |
| 4.2.1 | No — no ARKit | pass | — |
| 4.2.2 | Yes | pass | Not marketing material, not a link aggregator. The catalogue is structured data with a solver over it. |
| 4.2.3(i) | Yes | pass | Works alone; requires no companion app. |
| 4.2.3(ii) | Yes | pass | Everything is in the bundle; nothing is downloaded at first launch. |
| 4.2.6 | No — not from a template | pass | — |
| 4.2.7 (a–e) | No — not remote desktop | pass | — |
| 4.3(a) | Yes | pass | One bundle id — `src/lib/brand.ts` `BUNDLE_ID`. |
| 4.3(b) | Yes | pass | Not a flashlight/timer/fortune-teller class app. |
| 4.4 | No — no extensions | pass | — |
| 4.4.1 | No — no keyboard | pass | — |
| 4.4.2 | No — no Safari extension | pass | — |
| 4.5.1 | No — no Apple feeds | pass | — |
| 4.5.2 (i–iii) | No — no MusicKit | pass | — |
| 4.5.3 | No — no Game Center | pass | — |
| **4.5.4** | **Yes** | **pass** | Notifications are not required to use the app — the priming screen's "Not now" continues the flow (`src/onboarding/screens/Commit.tsx`), and `syncScheduleNotifications` returns early without permission. They carry no promotion: every one is the user's own schedule. Opt-in is explicit. |
| 4.5.5 | No | pass | — |
| 4.5.6 | Yes | pass | No Apple emoji is embedded in the binary. |
| 4.7 / 4.7.1–4.7.5 | No — no mini apps or emulation | pass | The assistant is a server-side model call, not downloadable software. |
| **4.8** | **Yes if a third-party login is added; No today** | **pass** | The app offers only its own email/password auth (`src/screens/Auth.tsx`). 4.8 is triggered by offering a *third-party or social* login — since none is offered, Sign in with Apple is not required. **If you add Google or Facebook sign-in, Sign in with Apple becomes mandatory in the same release.** |
| 4.9 | No — no Apple Pay | pass | — |
| 4.10 | Yes | pass | Nothing monetises a hardware capability or an Apple service. |

## 5. Legal

| Guideline | Applies | Status | Evidence / what to fix |
|---|---|---|---|
| 5.1 | Yes | partly | See the sub-items. |
| **5.1.1(i)** | **Yes** | **fail** | The link exists and resolves — `src/lib/legal.ts` `PRIVACY_URL`, linked from You and from both onboarding consent lines. The document is written and covers collection, use, third parties, retention and revocation. **But 10 placeholders are unfilled**: legal entity, country, contact email (×2), Supabase region, transfer safeguard, whether RevenueCat is a sub-processor, retention period, supervisory authority, minimum age. A policy reading `[LEGAL ENTITY]` fails this outright. |
| **5.1.1(ii)** | **Yes** | **at risk** | Consent is taken at signup with the Terms and Privacy line (`Intro.tsx`, `Commit.tsx`). Withdrawal is account deletion. **Health data is Article 9 special-category under UK/EU GDPR**, and the consent taken is a general one rather than an explicit health-data consent. That is a legal question for your reviewer, not a code change. |
| 5.1.1(iii) | Yes | pass | Only data with a use is requested. Age and sex drive reference intakes; diet and reactions drive ordering; times drive the schedule. |
| 5.1.1(iv) | Yes | pass | Declining notifications is a first-class path and produces a working app. Nothing nags or re-prompts — iOS shows that prompt once and the app knows it. |
| **5.1.1(v)** | **Yes** | **pass** | Account deletion is in-app: You → Delete Account, guarded by typing the word, calling a `SECURITY DEFINER` function that takes no arguments and reads `auth.uid()` (`supabase/migrations/0026_delete_account.sql`). It deletes the rows and then the auth record. Export Data is offered first. No social credentials are stored. |
| 5.1.1(vi) | Yes | pass | — |
| 5.1.1(vii) | No — no SafariViewController | pass | Links open in Safari proper. |
| 5.1.1(viii) | Yes | pass | No data is compiled from any source other than the user. |
| **5.1.1(ix)** | **Yes — health is a regulated field** | **at risk** | Apple expects a **legal entity**, not an individual, to submit in health. The developer account holder must match the entity named in the privacy policy — which is one of the unfilled placeholders. Resolve both together. |
| 5.1.1(x) | Yes | pass | Display name is optional; nothing is conditional on it. |
| **5.1.2(i)** | **Yes** | **pass** | No tracking, no ATT prompt needed, no ad SDK, no analytics SDK — `package.json` has none. **Third-party AI must be disclosed**: the assistant sends the question and profile context to Anthropic. This is stated in the privacy policy and in the app at `AskAI.tsx`'s disclaimer. |
| 5.1.2(ii) | Yes | pass | `user_facts` is used only for what it was collected for, and `supabase/functions/ask/memory.ts` states the boundary. |
| 5.1.2(iii) | Yes | pass | No profiling beyond what the user entered about themselves. |
| 5.1.2(iv) | Yes | pass | Contacts and Photos are never read for a database. The only photo access is a user-chosen progress photo. |
| 5.1.2(v) | Yes | pass | The app sends no messages. |
| 5.1.2(vi) | **Yes** | **pass** | HealthKit is **not** used — no `HealthKit` entitlement, no import. Nothing is shared with third parties for marketing or data mining. |
| 5.1.2(vii) | No — no Apple Pay | pass | — |
| **5.1.3(i)** | **Yes** | **pass** | Health data is not disclosed to any third party for advertising, marketing or data mining. It goes to Anthropic solely to answer the user's own question, which is a direct benefit to that user, and it is disclosed. |
| 5.1.3(ii) | No — HealthKit not used | pass | Nothing is written to HealthKit. Health information is not stored in iCloud — it is in Supabase under RLS. |
| 5.1.3(iii) | No — not a research app | pass | — |
| 5.1.3(iv) | No — not a research app | pass | — |
| 5.1.4(a) | Yes | pass | Not directed at children; no third-party analytics or advertising exists to remove. |
| **5.1.4(b)** | **Yes** | **at risk** | The privacy policy's minimum-age placeholder is unfilled. Pick one (13 is the usual floor, 16 in parts of the EU) and state it in both documents and in the age rating. |
| 5.1.5 | No — no Location Services | pass | No location API is used anywhere. |
| 5.2.1 | Yes | pass | Product names and label URLs are factual references to real filings; PubMed citations carry their identifiers. |
| **5.2.2** | **Yes** | **at risk** | The catalogue is derived from the NIH DSLD API and PubMed E-utilities. Both are US-government public-domain data and permit this use, but **NCBI's E-utilities policy asks for attribution and rate-limit compliance**. The app attributes ODS by name on the results screen; confirm the DSLD attribution wording before submitting. |
| 5.2.3 | No — no media downloading | pass | — |
| 5.2.4(a) | Yes | pass | Nothing suggests Apple endorsement. |
| 5.2.4(b) | No | pass | — |
| 5.2.5 | Yes | pass | Not confusingly similar to an Apple app. No Activity-ring lookalike: the You calendar is a month grid, not concentric rings. No Apple emoji embedded. |
| 5.3.1–5.3.4 | No — no contests or gambling | pass | — |
| **5.4** | **Yes** | **pass** | Account deletion within the app is required and present — see 5.1.1(v). Contact transparency is the 1.5 failure above. |

---

## What I could not verify, and why

| Item | Why |
|---|---|
| 2.3, 2.3.2, 2.3.3, 2.3.5, 2.3.6, 2.3.12 | App Store Connect metadata does not exist yet. Nothing in the repo can establish it. |
| 2.5.5 (IPv6) | Needs an IPv6-only network. No device or simulator available on this machine. |
| 3.1.2(b) | Upgrade/downgrade is StoreKit behaviour and StoreKit is not wired. |
| Everything requiring a device | This is a Windows machine with no Xcode. Nothing in this audit was observed on hardware; every green row above cites a file, a migration or a test that runs in Chromium. |

## The privacy nutrition label you will have to fill in

`ios/App/App/PrivacyInfo.xcprivacy` exists and declares 19 collected data types.
It must agree with the App Store Connect answers and with the privacy policy —
three places, one truth. The app collects: email, name (optional), age, sex,
diet, adverse reactions, free text about reactions, wake/sleep/meal times,
products taken, adherence history, progress notes and photos, and assistant
conversations. **Health & Fitness and Sensitive Info are both "collected, linked
to the user, not used for tracking".**
