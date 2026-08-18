import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

/**
 * Getting somebody back into the app after they have paid.
 *
 * Stripe will not accept a custom scheme as `success_url` — it must be https —
 * so coming home is two hops: Stripe redirects to a page on the site, and that
 * page redirects to `pepstack://checkout/...`, which iOS hands to the app. The
 * pages are `public/pro-success.html` and `public/pro-cancel.html`.
 *
 * NOTHING HERE GRANTS ANYTHING. It is a signal to go and re-read the tier. The
 * only thing that can make somebody Pro is the webhook, because a client
 * arriving on a URL and claiming it paid is not evidence and that URL can be
 * typed by hand.
 */
export type CheckoutOutcome =
  /** Stripe reported success. The webhook may not have landed yet. */
  | 'done'
  /** They backed out of the payment form. Nothing was charged. */
  | 'cancelled'
  /** They closed the browser themselves rather than waiting for the redirect. */
  | 'dismissed';

type Listener = (outcome: CheckoutOutcome) => void;
const listeners = new Set<Listener>();

export function onCheckoutReturn(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Set when we open Checkout, cleared by whichever return signal arrives first.
 *
 * Both signals can fire for one payment — the deep link closes the browser,
 * which then reports `browserFinished` — and `dismissed` after `done` would
 * start a second poll for a tier that is already resolved. It also stops an
 * unrelated in-app browser (a privacy policy link) from being read as a
 * payment coming back.
 */
let pending = false;

export function markCheckoutOpened(): void {
  pending = true;
}

function finish(outcome: CheckoutOutcome): void {
  if (!pending) return;
  pending = false;
  for (const fn of listeners) fn(outcome);
}

let started = false;

/**
 * Registered once, at app start, from `main.tsx`.
 *
 * Not from a component: a listener added in one that unmounts is a listener
 * that is missing exactly when it is needed, and the app returning from the
 * browser is the moment most likely to remount things.
 */
export function startCheckoutReturnListener(): void {
  if (started || !Capacitor.isNativePlatform()) return;
  started = true;

  void App.addListener('appUrlOpen', ({ url }) => {
    if (!url.startsWith('pepstack://checkout')) return;
    /* Close the payment sheet ourselves. Left open, the app is visible behind
       a browser showing a page whose only job was to redirect. */
    void Browser.close().catch(() => {});
    finish(url.includes('cancelled') ? 'cancelled' : 'done');
  });

  /* Tapping Done rather than waiting for the redirect is common — the success
     page is only on screen for an instant and it looks like something to
     dismiss. That person has still paid, so it has to refresh too. */
  void Browser.addListener('browserFinished', () => finish('dismissed'));
}
