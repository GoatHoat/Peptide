import { supabase } from './supabaseClient';
import type { PlanId } from './billing';

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
    /* The system browser, not the WebView: a payment form inside an app's own
       WebView is what people are told to be suspicious of, and Stripe's own
       guidance is to leave the app for it. */
    window.open(url, '_blank', 'noopener,noreferrer');
    return { ok: true };
  } catch (err) {
    console.error('could not start checkout', err);
    return { ok: false, message: 'Card payment is not switched on yet.' };
  }
}
