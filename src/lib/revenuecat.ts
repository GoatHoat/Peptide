import { Capacitor } from '@capacitor/core';
import type { PlanId } from './billing';
import { resolveStorefront } from './storefront';

/**
 * The real purchase path, behind the interface `billing.ts` already exports.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOTHING IN HERE HAS EVER RUN. There is no Apple Developer account, no App
 * Store Connect products and no RevenueCat key, so none of this has been tested
 * against a transaction and it must not be described as working. What it is
 * for is that switching it on later is configuration rather than a rewrite:
 * `billing.ts` keeps its exported signatures byte-identical, so no caller
 * changes.
 *
 * THE KEY IS READ AT RUNTIME AND IS ABSENT BY DESIGN. It has no `VITE_` prefix
 * on purpose — `VITE_`-prefixed variables are inlined into the client bundle at
 * build time and are public. A RevenueCat *public* SDK key is not a secret in
 * the way a service role key is, but it still does not belong in a committed
 * bundle, and the prefix rule in CLAUDE.md is absolute.
 *
 * With no key configured every function here returns exactly what the stub in
 * `billing.ts` returned, and `SKIP_PAYWALL` keeps its `'true'` default. That is
 * the shipping state today.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * The two StoreKit product identifiers, in one place so they can be pasted into
 * App Store Connect without reading the code.
 *
 * Reverse-DNS on the bundle id, which is what App Store Connect expects and
 * what RevenueCat's dashboard sorts by.
 */
export const PRODUCT_IDS: Record<PlanId, string> = {
  annual: 'app.pepstack.ios.pro.annual',
  monthly: 'app.pepstack.ios.pro.monthly',
};

/**
 * The RevenueCat entitlement every product grants. One entitlement, both
 * products — that is what makes "is this account Pro" a single check rather
 * than a list of product ids to keep in step.
 */
export const ENTITLEMENT_ID = 'pro';

/**
 * Absent until the native shell provides it. That is the point.
 *
 * NOT from `import.meta.env`. Vite only exposes `VITE_`-prefixed variables to
 * client code, and `VITE_` variables are inlined into the bundle at build time
 * and are public — so "read it from the environment" and "do not give it a
 * VITE_ prefix" cannot both be satisfied through `import.meta.env`: a
 * non-prefixed variable is simply never there.
 *
 * So it comes from a global the native layer sets before the WebView loads the
 * bundle, which is the standard Capacitor shape for exactly this. Nothing is
 * committed, nothing is inlined, and a browser build has no key at all.
 *
 * To provide it: set `window.__PEPSTACK_RC_KEY__` from a small script tag
 * injected by the iOS shell, or from a `config.js` that is copied into
 * `ios/App/App/public/` at build time and is gitignored.
 */
const apiKey = (): string | undefined => {
  const g = globalThis as { __PEPSTACK_RC_KEY__?: string };
  return typeof g.__PEPSTACK_RC_KEY__ === 'string' && g.__PEPSTACK_RC_KEY__
    ? g.__PEPSTACK_RC_KEY__
    : undefined;
};

/** Whether a real purchase is possible at all right now. */
export function purchasesAvailable(): boolean {
  const key = apiKey();
  if (!key) return false;
  /* A `test_` key is RevenueCat's Test Store, where a purchase is a modal with
     a "success" button. Shipping one would let anybody grant themselves Pro, so
     a production build refuses it outright rather than trusting whoever built
     it to have swapped the file. Fails safe: no purchases, not free ones. */
  if (import.meta.env.PROD && key.startsWith('test_')) {
    console.error('RevenueCat: refusing a Test Store key in a production build');
    return false;
  }
  return Capacitor.isNativePlatform();
}

let configured = false;

/**
 * The account purchases are attributed to. Set by `AuthProvider`.
 *
 * Without it `Purchases.configure` creates an anonymous user
 * (`$RCAnonymousID:…`), the webhook receives that instead of a Supabase id,
 * and a completed purchase can never be mapped back to an account — the client
 * unlocks and the server never learns of it. It is also what makes a
 * subscription follow somebody onto a second device.
 */
let currentUserId: string | null = null;

/**
 * Identify, or forget, the signed-in account.
 *
 * Called on every auth state change rather than at each call site, so
 * `billing.ts` keeps its exported signatures byte-identical and no caller moves.
 */
export async function setPurchasesUser(userId: string | null): Promise<void> {
  currentUserId = userId;
  if (!purchasesAvailable()) return;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    if (!userId) {
      /* Without this a second account on the same device inherits the first
         one's subscription — the same class of fault as a localStorage key
         with no account in it. */
      if (configured) await Purchases.logOut();
      return;
    }
    if (!configured) {
      await ensureConfigured();
      return;
    }
    await Purchases.logIn({ appUserID: userId });
  } catch (err) {
    console.error('RevenueCat could not identify the user', err);
  }
}

async function ensureConfigured(): Promise<boolean> {
  if (!purchasesAvailable()) return false;
  if (configured) return true;
  /* Configuring before the Supabase session resolves is exactly what produces
     an anonymous user, so this declines rather than configuring without one.
     `setPurchasesUser` runs it again the moment auth lands. */
  if (!currentUserId) return false;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.configure({ apiKey: apiKey() as string, appUserID: currentUserId });
    configured = true;
    /* Only answerable once configure has run, and the paywall needs it to know
       whether the card route is allowed here. Not awaited — a slow StoreKit
       reply must not hold up a purchase. */
    void resolveStorefront();
    return true;
  } catch (err) {
    /* A missing plugin, an unconfigurable key, a simulator without StoreKit.
       Falling back to "not available" keeps the paywall honest rather than
       throwing inside a tap handler. */
    console.error('RevenueCat could not be configured', err);
    return false;
  }
}

/**
 * Buy one of the two plans.
 *
 * Returns false rather than throwing when purchases are not available, which
 * is the same shape the stub had — the caller's job is to say "not switched on
 * yet" rather than to distinguish reasons.
 */
export async function purchasePlan(planId: PlanId): Promise<boolean> {
  if (!(await ensureConfigured())) return false;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    /* RevenueCat's own package types rather than an App Store product id
       string. The Test Store names its products independently, so matching on
       the identifier finds nothing there — and this way the same build works
       against the Test Store now and the App Store later with no code change.
       The identifier match stays as a fallback for a custom-named package. */
    const wanted =
      (planId === 'annual' ? current?.annual : current?.monthly) ??
      (current?.availablePackages ?? []).find(
        (p) => p.product.identifier === PRODUCT_IDS[planId],
      );
    if (!wanted) {
      console.error(`no RevenueCat package for ${PRODUCT_IDS[planId]}`);
      return false;
    }
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: wanted });
    return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  } catch (err) {
    /* A user cancelling is not an error worth surfacing as one, and RevenueCat
       reports it through the same channel as a real failure. Neither grants
       the tier, so both return false. */
    console.error('purchase did not complete', err);
    return false;
  }
}

/**
 * Restore a purchase made on another device or before a reinstall.
 *
 * Not optional — a missing restore path is the most common rejection reason for
 * subscription apps.
 */
export async function restore(): Promise<boolean> {
  if (!(await ensureConfigured())) return false;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.restorePurchases();
    return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  } catch (err) {
    console.error('restore did not complete', err);
    return false;
  }
}
