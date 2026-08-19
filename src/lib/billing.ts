import { purchasePlan, purchasesAvailable, restore } from './revenuecat';

/* Re-exported so a screen can tell "this build cannot charge" apart from "the
   purchase did not complete". Both come back from purchase() as false, and
   saying the wrong one is either a lie or an accusation. */
export { purchasesAvailable };

export type PlanId = 'monthly' | 'annual';

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  note: string;
  badge?: string;
}

/**
 * The two prices, in cents, and the one place they are written down.
 *
 * Everything else — the strings, the per-month figure, the badge — is derived.
 * The badge used to be the literal 'Save 50%' sitting beside two prices it had
 * no relationship to, so the moment either moved it became a false claim on the
 * one screen where a false claim is a Guideline 2.3.1 problem.
 */
/**
 * What paying by card saves against paying through the App Store.
 *
 * Apple takes 15% under the Small Business Program, so 5% back to the customer
 * is comfortably inside what the card route recovers — this is a real
 * difference, not a marketing number. Written once and rendered from here so
 * the pill and any copy about it cannot disagree.
 */
export const CARD_DISCOUNT_PCT = 5;

export const ANNUAL_CENTS = 4999;
export const MONTHLY_CENTS = 499;

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/**
 * What the annual actually saves against paying monthly for a year.
 *
 * $49.99 against 12 x $4.99 = $59.88 is 16%. Floored, not rounded: rounding a
 * saving up is the direction that overstates it.
 */
export const ANNUAL_SAVING_PCT = Math.floor(
  (1 - ANNUAL_CENTS / (MONTHLY_CENTS * 12)) * 100,
);

export const PLANS: Plan[] = [
  {
    id: 'annual',
    name: 'Annual',
    price: usd(ANNUAL_CENTS),
    period: '/year',
    note: `${usd(Math.round(ANNUAL_CENTS / 12))}/mo, billed yearly`,
    badge: `Save ${ANNUAL_SAVING_PCT}%`,
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: usd(MONTHLY_CENTS),
    period: '/month',
    note: 'Billed every month',
  },
];

/**
 * Buy a plan.
 *
 * This must not become a web checkout. Apple requires StoreKit for digital
 * subscriptions (Guideline 3.1.1) and shipping a Stripe or other web paywall
 * inside the app is an automatic rejection. `lib/revenuecat.ts` is the
 * StoreKit path and it is wired below — but it is inert until a key exists, so
 * **this still charges nobody**, and `SKIP_PAYWALL` still defaults to `'true'`.
 * Both stay that way until there is an Apple Developer account, products in
 * App Store Connect and a RevenueCat key to point at them.
 */
export async function purchase(planId: PlanId): Promise<boolean> {
  /* The real path when a key is configured, and today's stub when it is not —
     which is every build until somebody sets REVENUECAT_IOS_KEY on the device.
     The signature is unchanged so no caller moves; see lib/revenuecat.ts for
     what has and has not been tested. */
  if (purchasesAvailable()) return purchasePlan(planId);

  /* NOT AVAILABLE MEANS NOT PURCHASED. This used to wait 900ms and return
     `true`, which was safe only while `SKIP_PAYWALL` defaulted to true and hid
     the paywall entirely. The moment that flag is flipped, a `true` here is a
     paywall that grants Pro and charges nobody: guideline 3.1.1 and 2.1 at
     once, and the fastest rejection this app can earn. It is reachable in a
     shipped build too, because a missing config.js, a web build, and the
     Test-Store-key guard in revenuecat.ts all land on this line.

     Failing closed costs somebody who cannot buy an honest "not available".
     Failing open gives the product away. */
  void planId;
  return false;
}

/**
 * Restore a previous purchase. Not optional — a missing restore path is the
 * most common rejection reason for subscription apps. Same shape as `purchase`:
 * real when a key is configured, today's stub when it is not.
 */
export async function restorePurchases(): Promise<boolean> {
  if (purchasesAvailable()) return restore();
  await new Promise((r) => setTimeout(r, 700));
  return false;
}

/**
 * Whether to skip the paywall screen entirely.
 *
 * DEFAULTS TO FALSE as of the commit that wired RevenueCat end to end. Before
 * that it defaulted to true, because `purchase` above returned `true` without
 * charging: a reviewer taps Subscribe, is granted the tier, and never sees a
 * payment sheet. That is Guideline 3.1.1 (digital subscriptions must use in-app
 * purchase) and 2.1 (a purchase control that does not purchase) at once, and
 * the fastest possible rejection this app can earn.
 *
 * Two things had to be true before flipping it, and both were checked against a
 * real TestFlight purchase rather than reasoned about:
 *
 *   1. `purchase` fails closed. With no store configured it returns false, so
 *      no build can grant the tier without a transaction — a missing config.js,
 *      a web build and the Test-Store-key guard all land there.
 *   2. A purchase reaches `profiles.subscription_tier` through the RevenueCat
 *      webhook with `subscription_source = "apple"`, and the client picks it up
 *      without a restart.
 *
 * If either stops being true this goes back to true in the same commit.
 * Shipping with no paywall is fine. Shipping a paywall that does not charge is
 * not.
 *
 * The tests set VITE_SKIP_PAYWALL explicitly, so they are unaffected either way.
 */
/* `?.` so this module can be imported in Node, where `import.meta.env` does not
   exist — the prices and the computed badge are worth unit testing and nothing
   else in the file needs a browser. */
export const SKIP_PAYWALL = (import.meta.env?.VITE_SKIP_PAYWALL ?? 'false') === 'true';

/**
 * Whether the Stripe route may be offered at all in this build.
 *
 * The audit assumed this flag already existed. It did not — the Stripe button
 * was rendered unconditionally, including in a native build, which is exactly
 * the Guideline 3.1.1 problem it was supposed to prevent: Apple requires
 * StoreKit for digital subscriptions and an external checkout inside a
 * submitted iOS binary is an automatic rejection.
 *
 * ON by default. Defaulting it off was wrong: it silently removed a working
 * Stripe button from every build that did not set the variable, which is every
 * build. The Apple concern is native-only, and `cardCheckoutAvailable()`
 * refuses on native whatever this says — that check is the guarantee, not this
 * flag. This exists only to turn the route off deliberately
 * (`VITE_CARD_CHECKOUT=false`), never to be the reason it is missing.
 */
export const CARD_CHECKOUT_ENABLED =
  (import.meta.env?.VITE_CARD_CHECKOUT ?? 'true') !== 'false';
