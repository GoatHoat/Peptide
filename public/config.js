/**
 * RevenueCat's public SDK key, read by `src/lib/revenuecat.ts` before the
 * bundle runs.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COMMITTED ON PURPOSE, AND THIS IS THE ONE KEY THAT MAY BE.
 *
 * An `appl_` key is a publishable identifier: it ships inside every copy of the
 * app, anybody can pull it out of the binary, and it can neither spend money nor
 * read a single row of anyone's data. It says which app is calling RevenueCat
 * and nothing else.
 *
 * It was gitignored, and that cost three separate bugs — every build made on a
 * machine other than mine had an empty key, so `purchasesAvailable()` was false,
 * so the paywall said "in-app payment is not switched on yet", so onboarding
 * skipped the paywall entirely, so `free-pick` appeared on its own telling
 * people they had chosen Free when they were never offered anything. One
 * missing file, three symptoms, two wasted builds.
 *
 * NOTHING ELSE GOES IN THIS FILE. `sk_live_`, `sb_secret_`, the service role
 * key, the Anthropic key and the Stripe webhook secret are all secrets in the
 * real sense and belong in `supabase secrets set`, never in the repo and never
 * behind a `VITE_` prefix.
 *
 * A `test_` key must never ship: `purchasesAvailable()` refuses one in a
 * production build, because a Test Store key in the App Store would let anyone
 * grant themselves Pro by tapping "success".
 * ─────────────────────────────────────────────────────────────────────────────
 */
window.__PEPSTACK_RC_KEY__ = 'appl_pMiIsDlvxadbHlDYWyEwCLQDcuP';
