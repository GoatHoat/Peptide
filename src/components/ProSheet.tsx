import { PRO_NAME } from '../lib/brand';
import { useState } from 'react';
import { Sheet } from './Sheet';
import { PLANS, purchase, restorePurchases, type PlanId } from '../lib/billing';
import { externalLink, PRIVACY_URL, TERMS_URL } from '../lib/legal';
import { useEntitlement } from '../lib/entitlements';

/**
 * The one paywall, opened from every gate.
 *
 * A sheet rather than a full screen: the person was in the middle of something,
 * and a takeover loses their place. Dismissing returns them to exactly where
 * they were with whatever they had typed still there.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT DOES NOT CHARGE, AND MUST NOT UNTIL StoreKit IS REAL. `purchase()` still
 * waits 900ms and returns true. A paywall that grants the tier with no payment
 * sheet is Guideline 3.1.1 and 2.1 at the same time and is the fastest
 * rejection available — so the button below is wired to the stub deliberately,
 * and `SKIP_PAYWALL` still defaults to 'true' so this never gates onboarding.
 * Flip both in the same commit that wires RevenueCat.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type ProReason = 'stack-limit' | 'locked-product' | 'ask-limit' | 'goals';

/** The headline names what they just hit, rather than selling in the abstract. */
function headlineFor(reason: ProReason, lockedTotal: number): string {
  switch (reason) {
    case 'stack-limit':
      return 'You can hold one product on Free.';
    case 'locked-product':
      return lockedTotal > 0
        ? `${lockedTotal} products are locked on Free.`
        : 'That product is locked on Free.';
    case 'ask-limit':
      return "You've used your three free assistant messages.";
    default:
      return 'Pro removes the limits.';
  }
}

export function ProSheet({
  open,
  reason,
  onClose,
}: {
  open: boolean;
  reason: ProReason;
  onClose: () => void;
}) {
  const { catalogueTotal, lockedTotal } = useEntitlement();
  /* Annual by default: it is the better value and preselecting the cheaper
     monthly would make the saving badge decoration rather than a reason. */
  const [plan, setPlan] = useState<PlanId>('annual');
  const [busy, setBusy] = useState<PlanId | 'restore' | null>(null);
  const [note, setNote] = useState<string | null>(null);

  /* `my_entitlement()` is absent until 0037 is applied, and then catalogueTotal
     is 0. This used to fall back to a hardcoded 304 — a number nobody had
     checked against the catalogue, quoted on the one screen somebody is being
     asked to pay from. PROMPT_TIERS said read the count from the database, so
     when the database has not answered, say the thing that is true either way
     rather than a figure that might not be. */
  const total = catalogueTotal > 0 ? `${catalogueTotal} ` : '';

  return (
    <Sheet open={open} onClose={onClose} title={PRO_NAME}>
      <p className="pro-headline t-body-m">{headlineFor(reason, lockedTotal)}</p>

      {/* Four lines, no ticks and no icons — a list of what changes, not a
          brochure. CLAUDE.md: this reads expensive through restraint. */}
      <ul className="pro-list">
        <li>An unlimited stack</li>
        <li>All {total} products</li>
        <li>20 assistant messages an hour</li>
        <li>Full history and export</li>
      </ul>

      <div className="pro-plans" role="radiogroup" aria-label="Plan">
        {PLANS.map((p) => (
          <button
            key={p.id}
            className={`pro-plan pressable${plan === p.id ? ' on' : ''}`}
            role="radio"
            aria-checked={plan === p.id}
            disabled={busy !== null}
            /* Tap selects. It used to purchase on the first tap of either row,
               so there was no way to look at both prices without committing to
               one. The single button below is what commits. */
            onClick={() => setPlan(p.id)}
          >
            <span className="pro-plan-main">
              <span className="pro-plan-name t-body-m">
                {p.name}
                {p.badge && <span className="pro-badge t-label">{p.badge}</span>}
              </span>
              <span className="pro-plan-note t-caption">{p.note}</span>
            </span>
            <span className="pro-plan-price">
              <span className="pro-plan-amount t-body-m">{p.price}</span>
              <span className="pro-plan-period t-caption">{p.period}</span>
            </span>
          </button>
        ))}
      </div>

      <button
        className="pro-buy pressable"
        disabled={busy !== null}
        onClick={async () => {
          setBusy(plan);
          setNote(null);
          try {
            await purchase(plan);
            /* Deliberately says nothing about having upgraded. purchase() is a
               stub and claiming success would be a lie the user could act on. */
            setNote('Subscriptions are not switched on yet.');
          } finally {
            setBusy(null);
          }
        }}
      >
        {busy === plan ? 'One moment…' : `Continue with ${PLANS.find((p) => p.id === plan)?.name}`}
      </button>

      {/* Reserved, so selecting a plan or pressing the button cannot move the
          rows above it. */}
      <p className="pro-note t-caption" role="status">
        {note ?? ' '}
      </p>

      {/* Never behind a link. A missing restore path is the most common
          rejection reason for subscription apps. */}
      <button
        className="pro-restore pressable"
        disabled={busy !== null}
        onClick={async () => {
          setBusy('restore');
          setNote(null);
          try {
            const ok = await restorePurchases();
            setNote(ok ? 'Purchase restored.' : 'No previous purchase found on this account.');
          } finally {
            setBusy(null);
          }
        }}
      >
        {busy === 'restore' ? 'Checking…' : 'Restore Purchases'}
      </button>

      <p className="pro-legal t-caption">
        <a href={TERMS_URL} {...externalLink}>
          Terms
        </a>
        {' · '}
        <a href={PRIVACY_URL} {...externalLink}>
          Privacy
        </a>
      </p>
    </Sheet>
  );
}
