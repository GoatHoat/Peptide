import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';
import { markCheckoutOpened } from './checkoutReturn';
import { CARD_CHECKOUT_ENABLED, type PlanId } from './billing';

/**
 * Whether to show a card route at all.
 *
 * Two conditions, and the native one is not negotiable: Apple requires
 * StoreKit for digital subscriptions, so a Stripe button inside the shipped
 * iOS app is a rejection no build flag should be able to cause by accident.
 * The flag alone governs the web build.
 */
export function cardCheckoutAvailable(): boolean {
  return CARD_CHECKOUT_ENABLED && !Capacitor.isNativePlatform();
}

/**
 * Stripe Checkout, opened in the system browser.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS DOES NOT GRANT ANYTHING. It returns a URL and opens it. The tier is set
 * by `supabase/functions/stripe-webhook` when Stripe reports the payment — a
 * client returning from Checkout saying "I paid" is not evidence, and the URL
 * it comes back to can be typed by hand.
 *
 * Also: on iOS this is guideline 3.1.1 territory. Apple requires StoreKit for
 * digital subscriptions, and the External Purchase Link entitlement is what
 * makes a link out permissible — US storefront only. `purchase()` above is the
 * StoreKit path and stays the one the App Store build should use.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function startCardCheckout(planId: PlanId): Promise<
  { ok: true } | { ok: false; message: string }
> {
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { plan: planId },
    });
    if (error) throw error;
    const url = (data as { url?: string } | null)?.url;
    if (!url) return { ok: false, message: 'Card payment is not switched on yet.' };
    /* Arm the return listener before anything can come back. */
    markCheckoutOpened();

    if (Capacitor.isNativePlatform()) {
      /* SFSafariViewController, which `window.open` was not: that opened
         Checkout inside the app's own WebView, and `success_url` is a page on
         the site, so paying left somebody stranded on a website with no way
         back to the app. This one is dismissible, shows the real URL and
         certificate, and the page it lands on bounces to `pepstack://`. */
      await Browser.open({ url, presentationStyle: 'popover' });
      return { ok: true };
    }

    /* Web keeps a plain new tab. There is no app to return to, and the tier is
       picked up by the foreground refresh when this tab is looked at again. */
    window.open(url, '_blank', 'noopener,noreferrer');
    return { ok: true };
  } catch (err) {
    console.error('could not start checkout', err);
    return { ok: false, message: 'Card payment is not switched on yet.' };
  }
}
