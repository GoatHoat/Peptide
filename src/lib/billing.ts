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

/** Lets the rest of the flow be tested without stubbing a purchase every run. */
export const SKIP_PAYWALL =
  (import.meta.env.VITE_SKIP_PAYWALL ?? (import.meta.env.DEV ? 'true' : 'false')) === 'true';
