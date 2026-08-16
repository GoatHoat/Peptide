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
 * $4.99 against $29.99 reads as half price. $3/month against $30/year is a 17%
 * saving and people do that arithmetic in their heads.
 */
export const PLANS: Plan[] = [
  { id: 'annual', name: 'Annual', price: '$29.99', period: '/year', note: '$2.50/mo, billed yearly', badge: 'Save 50%' },
  { id: 'monthly', name: 'Monthly', price: '$4.99', period: '/month', note: 'Billed every month' },
];

/**
 * TODO: wire to StoreKit via RevenueCat when the app is wrapped for iOS.
 *
 * This must not become a web checkout. Apple requires StoreKit for digital
 * subscriptions (App Store Review Guideline 3.1.1) and shipping a Stripe or
 * other web paywall inside the app is an automatic rejection. The Capacitor
 * wrapper is already in package.json, so the RevenueCat plugin is the
 * intended path — this function keeps every caller unchanged when it lands.
 */
export async function purchase(planId: PlanId): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 900));
  void planId;
  return true;
}

/**
 * TODO: RevenueCat restorePurchases(). Also not optional — a missing restore
 * path is the most common rejection reason for subscription apps.
 */
export async function restorePurchases(): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 700));
  return false;
}

/**
 * Whether to skip the paywall screen entirely.
 *
 * DEFAULTS TO TRUE, INCLUDING IN PRODUCTION, and must stay that way until
 * `purchase` above is a real StoreKit call. It previously defaulted to false
 * outside dev, which shipped a screen quoting $4.99 and $29.99 against a
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
export const SKIP_PAYWALL = (import.meta.env.VITE_SKIP_PAYWALL ?? 'true') === 'true';
