import { useState } from 'react';
import { Cta, OnboardIllustration, Screen, Sub, Title } from '../chrome';
import { PLANS, purchase, restorePurchases, type PlanId } from '../../lib/billing';
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

  const ask = async () => {
    setBusy(true);
    try {
      if (typeof Notification === 'undefined') {
        onDone(false);
        return;
      }
      const res = await Notification.requestPermission();
      onDone(res === 'granted');
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

  const buy = async () => {
    setBusy('buy');
    setNote(null);
    try {
      onDone(await purchase(plan));
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
          <Cta onClick={buy} disabled={busy !== null}>
            {busy === 'buy' ? 'One moment…' : 'Start with Pepstack'}
          </Cta>
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
