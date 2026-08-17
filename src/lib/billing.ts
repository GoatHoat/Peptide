import { purchasePlan, purchasesAvailable, restore } from './revenuecat';

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
  await new Promise((r) => setTimeout(r, 900));
  void planId;
  return true;
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
 * DEFAULTS TO TRUE, INCLUDING IN PRODUCTION, and must stay that way until
 * `purchase` above is a real StoreKit call. It previously defaulted to false
 * outside dev, which shipped a screen quoting real prices against a
 * function that waits 900ms and returns true. A reviewer taps Subscribe, is
 * granted the tier, and is never shown a payment sheet — that is Guideline
 * 3.1.1 (digital subscriptions must use in-app purchase) and Guideline 2.1
 * (a purchase control that does not purchase), and it is the fastest possible
 * rejection in this app.
 *
 * Shipping with no paywall is fine. Shipping a paywall that does not charge is
 * not. Flip the default back in the same commit that wires RevenueCat, not
 * before.
 *
 * The tests set VITE_SKIP_PAYWALL=false explicitly so the screen itself stays
 * covered.
 */
/* `?.` so this module can be imported in Node, where `import.meta.env` does
   not exist — the prices and the computed badge are worth unit testing and
   nothing else in the file needs a browser. The default is unchanged in both
   environments: absent still means 'true'. */
export const SKIP_PAYWALL = (import.meta.env?.VITE_SKIP_PAYWALL ?? 'true') === 'true';
