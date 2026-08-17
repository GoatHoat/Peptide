import { useState } from 'react';
import { Cta, Screen, Sub, Title } from '../chrome';
import { LIMITS } from '../../lib/entitlements';
import type { Recommendation } from './Results';

/**
 * "You picked six. Free covers one — which one?"
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE LINE THIS SCREEN MUST NOT CROSS. Everything they chose stays on screen.
 * The five they cannot track are shown, readable, labelled as Pro — never
 * removed, never blurred, never quietly dropped between screens.
 *
 * The reason is not only decency. They were shown a personalised list and asked
 * to choose from it; taking five of those away without saying so is
 * misrepresenting what the free tier includes, which is what guideline 2.3.1
 * covers. The paywall before this names the limit *before* they choose, so
 * nothing here is news.
 *
 * And it converts better honestly. Somebody who has seen six things they want
 * and been told plainly that one is free has a reason to upgrade. Somebody who
 * feels tricked writes a review saying so.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * No countdown, no scarcity, no expiring offer. Nothing here is time-limited
 * and pretending otherwise would be the same lie in a different place.
 */
export function FreePick({
  picks,
  onDone,
}: {
  picks: Recommendation[];
  /** the single product to schedule; the rest stay in Discover */
  onDone: (chosenId: string) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(picks[0]?.id ?? null);
  const limit = LIMITS.free.stackItems;

  return (
    <Screen
      scroll
      footer={
        <Cta onClick={() => chosen && onDone(chosen)} disabled={!chosen}>
          Build my schedule
        </Cta>
      }
    >
      <Title>Free covers one product</Title>
      <Sub>
        You picked {picks.length}. Choose the one to track — you can change it any time, and Pro
        removes the limit.
      </Sub>

      <div className="ob-recs">
        {picks.map((r) => {
          const on = chosen === r.id;
          return (
            <button
              key={r.id}
              className={`ob-rec${on ? ' on' : ''}`}
              aria-pressed={on}
              onClick={() => setChosen(r.id)}
            >
              <span className="ob-rec-main">
                <span className="ob-card-title">{r.name}</span>
                {r.why && <span className="ob-rec-why">{r.why}</span>}
                {/* Not "locked". They keep it — it is in Discover, with its
                    research, and it goes into the schedule the moment they
                    upgrade. Saying "locked" about something they can still read
                    would be the overstatement this screen exists to avoid. */}
                {!on && <span className="ob-rec-pro">Tracked on Pro</span>}
              </span>
              <span className={`ob-tick${on ? ' on' : ''}`}>
                {on && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2 6.5 4.5 9 10 3" />
                  </svg>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className="ob-disclaimer t-caption">
        {picks.length - limit} of these stay in Discover with their research, and go into your
        schedule if you upgrade. Nothing you picked is thrown away.
      </p>
    </Screen>
  );
}
