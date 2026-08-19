import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Which App Store storefront this device buys from.
 *
 * WHY THIS EXISTS. After the Epic injunction, guideline 3.1.1(a) says there is
 * "no prohibition on an app including buttons, external links, or other calls
 * to action, and no entitlement is required to do so" — on the United States
 * storefront only. The same button in the UK, Canada, Japan or the EU is still
 * a 3.1.1 violation, so the card route has to be decided at runtime by where
 * the account actually buys from, not by a build flag.
 *
 * NOT the device locale, NOT the timezone, NOT the currency. Somebody in London
 * with a US App Store account buys through the US storefront, and somebody in
 * New York with a UK account does not. Only StoreKit knows, and RevenueCat
 * surfaces it.
 *
 * UNKNOWN MEANS NO. Until it resolves, and forever if it never does, this
 * reports not-US. Hiding the button from an American costs a discount; showing
 * it to a Brit is the rejection.
 */
let country: string | null = null;
const listeners = new Set<() => void>();

/** USA from StoreKit 2, US from some paths. Accept both, trust neither blindly. */
function isUS(c: string | null): boolean {
  if (!c) return false;
  const u = c.toUpperCase();
  return u === 'USA' || u === 'US';
}

/** Synchronous, for render. False until `resolveStorefront` has answered. */
export function storefrontIsUS(): boolean {
  return isUS(country);
}

let started = false;

/**
 * Ask once, after RevenueCat is configured — it cannot answer before that.
 *
 * Failure is not retried and not surfaced: an unresolved storefront is a
 * missing discount, not a broken app.
 */
export async function resolveStorefront(): Promise<void> {
  if (started || !Capacitor.isNativePlatform()) return;
  started = true;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const sf = (await Purchases.getStorefront()) as { countryCode?: string } | null;
    country = sf?.countryCode ?? null;
    for (const fn of listeners) fn();
  } catch (err) {
    /* Not configured yet, no store account, a simulator without one. All of
       them mean the same thing here. */
    console.warn('storefront could not be read; treating as non-US', err);
  }
}

/**
 * Re-render when the answer lands.
 *
 * Deliberately returns nothing. The rule about who may see a card button lives
 * in `cardCheckoutAvailable()` and must live in exactly one place — a hook that
 * returned its own verdict would be a second copy, and the first version of
 * this hid the button on the web build, where there is no storefront to read
 * and no Apple rule to obey.
 *
 * The paywall can open before StoreKit replies, so this exists only to make the
 * component ask again once it has.
 */
export function useStorefrontTick(): void {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    void resolveStorefront();
    return () => {
      listeners.delete(fn);
    };
  }, []);
}
