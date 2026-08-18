import { cardCheckoutAvailable } from './checkout';
import { purchasesAvailable } from './revenuecat';
import { SKIP_PAYWALL } from './billing';

/**
 * Whether this build can actually take money from somebody.
 *
 * This is the question `SKIP_PAYWALL` was standing in for. That flag was
 * added when nothing could charge at all — `purchase()` waits and returns
 * true, so showing the screen would have granted Pro to anyone who tapped
 * Subscribe, which is the fastest rejection in the app. It defaults to on,
 * which is why the onboarding paywall has never appeared in any deployed
 * build, and why `subscribed` was never set, and therefore why the free-pick
 * screen — whose whole skip rule is "not if they subscribed" — showed up on
 * its own with no paywall in front of it.
 *
 * Asking whether a real payment path exists enforces the same rule the flag
 * was there to enforce, but by checking the thing itself rather than a
 * default somebody has to remember to flip. Both sources are real: Stripe on
 * the web build, StoreKit through RevenueCat once a key exists.
 *
 * `SKIP_PAYWALL` is still honoured as an explicit override so a test run can
 * force the screen off, but it is no longer the reason the screen is hidden.
 */
export function canCharge(): boolean {
  if (import.meta.env?.VITE_SKIP_PAYWALL === 'true') return false;
  return cardCheckoutAvailable() || purchasesAvailable();
}

/** Kept so the override's origin is greppable from here. */
export const PAYWALL_FORCED_OFF = SKIP_PAYWALL;
