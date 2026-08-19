import { requestNotificationPermission } from '../../lib/notifications';
import { useState } from 'react';
import { Cta, OnboardIllustration, Screen, Sub, Title } from '../chrome';
import { CARD_DISCOUNT_PCT, PLANS, purchase, purchasesAvailable, restorePurchases, type PlanId } from '../../lib/billing';
import { cardCheckoutAvailable, startCardCheckout } from '../../lib/checkout';
import { externalLink, PRIVACY_URL, TERMS_URL } from '../../lib/legal';

/* ── notifications ───────────────────────────────────────────────────── */

/**
 * iOS gives exactly one chance at the system prompt. Tap Don't Allow and it is
 * Settings-only forever, so the ask is explained here first and
 * requestPermission is only reached from the accent button — never on mount.
 */
export function Notifications({
  onDone,
}: {
  onDone: (granted: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  /* Goes through lib/notifications so the native permission is the one asked
     for. This called the web `Notification` API directly, which inside the iOS
     WebView is a different permission from the one LocalNotifications.schedule
     needs — somebody could accept the prompt here and still never get a
     reminder. The screen above it is the priming iOS's one-shot prompt
     requires. */
  const ask = async () => {
    setBusy(true);
    try {
      onDone(await requestNotificationPermission());
    } catch {
      onDone(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      center
      footer={
        <>
          <Cta onClick={ask} disabled={busy}>
            {busy ? 'Asking…' : 'Turn on reminders'}
          </Cta>
          <button className="ob-cta ob-cta-ghost" onClick={() => onDone(false)}>
            Not now
          </button>
        </>
      }
    >
      <OnboardIllustration name="bell" />
      <div style={{ marginTop: 30 }}>
        <Title>Reminders at the right times</Title>
        <Sub>
          One notification per time block — around three a day. Nothing else, ever: no streak guilt,
          no marketing.
        </Sub>
      </div>
    </Screen>
  );
}

/* ── paywall ─────────────────────────────────────────────────────────── */

const VALUE = [
  'Your whole stack in one schedule, built around your day',
  'A warning when two supplements shouldn’t share a slot',
  'The research behind every suggestion, linked',
];

export function Paywall({ onDone }: { onDone: (subscribed: boolean) => void }) {
  const [plan, setPlan] = useState<PlanId>('annual');
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const [note, setNote] = useState<string | null>(null);

  /**
   * The card route, on the builds that have one.
   *
   * Deliberately does NOT call `onDone(true)`. Coming back from Checkout is
   * not evidence of payment — the webhook is, and it may not have landed yet.
   * Onboarding continues on Free and the tier arrives on its own through
   * CheckoutReturnWatcher, which is the only honest thing to do with a
   * redirect the person could have typed themselves.
   */
  const buyByCard = async () => {
    setBusy('buy');
    setNote(null);
    const r = await startCardCheckout(plan);
    setBusy(null);
    setNote(r.ok ? 'Finish in the browser — this unlocks on its own.' : r.message);
  };

  /**
   * StoreKit. Only reachable when RevenueCat is configured, because
   * `purchase()` resolves true without charging when it is not, and a
   * Subscribe button that grants the tier without a payment sheet is
   * Guideline 3.1.1 and the fastest rejection there is.
   */
  const buy = async () => {
    setBusy('buy');
    setNote(null);
    try {
      const bought = await purchase(plan);
      if (bought) {
        onDone(true);
        return;
      }
      /* False means either "nothing here can charge" or "they backed out",
         and those are not the same sentence. Onboarding stays where it is
         either way — advancing would skip the free-pick step for somebody who
         has not paid. */
      setNote(
        purchasesAvailable() ? null : "In-app payments don't work on this device.",
      );
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    setNote(null);
    try {
      const ok = await restorePurchases();
      if (ok) onDone(true);
      else setNote('No previous purchase found on this account.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen
      scroll
      footer={
        <>
          {/* The same two routes, named the same way, as the Pro sheet.
              This offered whichever one the build could charge through, as a
              single "Start with Pepstack" — so the two paywalls disagreed
              about what the choice even was, and the App Store route was
              invisible here while being one of two buttons there. Same
              classes as ProSheet, so they cannot drift apart visually either.

              The screen does not render at all when neither route can charge
              — see lib/paywallGate.ts — so there is never a button here that
              takes no money. */}
          <p className="pro-pay-q t-body-m">Payment method</p>
          <div className="pro-pay">
            {cardCheckoutAvailable() && (
              <button
                type="button"
                className="pro-pay-btn pro-pay-card pressable"
                disabled={busy !== null}
                onClick={buyByCard}
              >
                {busy === 'buy' ? 'One moment…' : 'Stripe'}
                <span className="pro-pay-off t-label" aria-label="5 percent off">
                  {CARD_DISCOUNT_PCT}% off
                </span>
              </button>
            )}
            <button
              type="button"
              className="pro-pay-btn pro-pay-iap pressable"
              disabled={busy !== null}
              onClick={buy}
            >
              In-app payment
            </button>
          </div>
          {/* Visible, full width, in the footer beside the buy button — not
              hidden, not greyed, not six-point type in a corner. Somebody who
              is not going to subscribe today should not have to hunt for the
              way past, and a paywall you cannot see the exit from is the shape
              guideline 3.1.2 and every one-star review are about. */}
          <button className="ob-free-out" onClick={() => onDone(false)} disabled={busy !== null}>
            Continue with Free
          </button>
          <div className="ob-legal-row">
            {/* Not optional — a missing restore path is the most common
                rejection reason for subscription apps. */}
            <button onClick={restore} disabled={busy !== null}>
              {busy === 'restore' ? 'Checking…' : 'Restore Purchases'}
            </button>
            <a href={TERMS_URL} {...externalLink}>Terms</a>
            <a href={PRIVACY_URL} {...externalLink}>Privacy</a>
          </div>
        </>
      }
    >
      <Title>Everything, in one place</Title>

      <div style={{ marginTop: 22 }}>
        {VALUE.map((v) => (
          <div className="ob-value" key={v}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--accent)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: 2 }} aria-hidden>
              <path d="M3.5 9.5 7 13l7.5-8" />
            </svg>
            {v}
          </div>
        ))}
      </div>

      <div className="ob-plans" role="radiogroup" aria-label="Plan">
        {PLANS.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={plan === p.id}
            className={`ob-plan${plan === p.id ? ' on' : ''}`}
            onClick={() => setPlan(p.id)}
          >
            <span>
              <span className="ob-card-title">
                {p.name}
                {p.badge && <span className="ob-badge">{p.badge}</span>}
              </span>
              <span className="ob-caption" style={{ display: 'block', marginTop: 4 }}>
                {p.note}
              </span>
            </span>
            <span style={{ textAlign: 'right', flex: 'none' }}>
              <span className="ob-card-title">{p.price}</span>
              <span className="ob-caption" style={{ display: 'block' }}>
                {p.period}
              </span>
            </span>
          </button>
        ))}
      </div>

      {note && (
        <p className="ob-caption" style={{ marginTop: 12 }} role="status">
          {note}
        </p>
      )}
    </Screen>
  );
}
