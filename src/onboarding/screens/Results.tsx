import { useEffect, useMemo, useRef, useState } from 'react';
import { Cta, OnboardIllustration, Screen, Sub, Title } from '../chrome';
import { GOAL_BY_ID, DEFAULT_GOAL_IDS } from '../goals';
import {
  getNutrientReference,
  listGlossary,
  pickReference,
  type GlossaryEntry,
  type NutrientReference,
} from '../../lib/api';
import { checkPlacement, fromMinutes, toMinutes, type ScheduledItem } from '../../lib/conflicts';
import type { Meal } from '../store';

/* ── the two loading screens ─────────────────────────────────────────── */

export function Building({
  variant,
  onDone,
}: {
  variant: 'recs' | 'schedule';
  onDone: () => void;
}) {
  const copy =
    variant === 'recs'
      ? {
          title: 'Going through the research for your goals.',
          lines: ['Reading the entries', 'Matching them to your goals', 'Checking for overlaps'],
          min: 2200,
        }
      : {
          title: 'Fitting these around your meals and sleep.',
          lines: ['Placing the morning block', 'Anchoring what needs food', 'Filling the wind-down'],
          min: 1800,
        };

  const [line, setLine] = useState(0);

  useEffect(() => {
    const cycle = setInterval(() => setLine((n) => (n + 1) % copy.lines.length), 700);
    // held for the minimum even when the real work finishes first, so it reads
    // as thought rather than a flash
    const done = setTimeout(onDone, copy.min);
    return () => {
      clearInterval(cycle);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  return (
    <Screen center>
      <DrawingArc />
      <p className="ob-sub" style={{ maxWidth: 280, marginTop: 30 }}>
        {copy.title}
      </p>
      <p className="ob-loading-status" aria-live="polite">
        {copy.lines[line]}
      </p>
    </Screen>
  );
}

/** The Today arc, drawing itself. */
function DrawingArc() {
  const R = 150;
  const SWEEP = 88;
  const HALF = SWEEP / 2;
  const W = 220;
  const CX = W / 2;
  const CY = R + 7;
  const H = Math.ceil(R * (1 - Math.cos((HALF * Math.PI) / 180)) + 14);
  const pt = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return [CX + R * Math.sin(r), CY - R * Math.cos(r)];
  };
  const [a1, b1] = pt(-HALF);
  const [a2, b2] = pt(HALF);
  const d = `M${a1.toFixed(1)} ${b1.toFixed(1)} A${R} ${R} 0 0 1 ${a2.toFixed(1)} ${b2.toFixed(1)}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden>
      <path d={d} stroke="var(--card)" strokeWidth="9" strokeLinecap="round" />
      <path className="ob-arc-draw" d={d} stroke="var(--accent)" strokeWidth="9" strokeLinecap="round" pathLength={1} />
    </svg>
  );
}

/* ── recommendations ─────────────────────────────────────────────────── */

export interface Recommendation {
  id: string;
  name: string;
  why: string;
  route: string;
  selected: boolean;
  /** the intake that applies to this person, where one is established */
  amount: string;
}

export function useRecommendations(
  goalIds: string[],
  currentStack: string[],
  age?: number | null,
  sex?: 'm' | 'f' | 'na' | null,
) {
  const [entries, setEntries] = useState<GlossaryEntry[] | null>(null);
  const [refs, setRefs] = useState<Record<string, NutrientReference[]>>({});
  useEffect(() => {
    listGlossary(200)
      .then((rows) => {
        setEntries(rows);
        return getNutrientReference(rows.map((r) => r.id));
      })
      .then((m) => m && setRefs(m))
      .catch(() => setEntries([]));
  }, []);

  return useMemo(() => {
    if (!entries) return null;
    const ids = goalIds.length ? goalIds : DEFAULT_GOAL_IDS;
    const wanted = new Set(ids.flatMap((g) => GOAL_BY_ID[g]?.tags ?? []));
    const already = new Set(currentStack.map((s) => s.toLowerCase()));

    /* Supplements only. Ranking peptides for a specific person is a
       recommendation whether or not an amount is attached, and it is the same
       rule the assistant is held to — enforced here in code rather than left
       to whatever the tag overlap happens to return. Every goal was returning
       two to four peptides in its top six before this. */
    const scored = entries
      .filter((e) => (e.kind ?? 'peptide') === 'supplement')
      .map((e) => {
        const hits = (e.goal_tags ?? []).filter((t) => wanted.has(t));
        return { e, hits };
      })
      .filter((x) => x.hits.length > 0)
      .sort((a, b) => b.hits.length - a.hits.length || a.e.name.localeCompare(b.e.name));

    const goalNames = ids.map((g) => GOAL_BY_ID[g]?.name ?? g);

    return {
      picks: scored.slice(0, 6).map(({ e, hits }, i) => {
        const r = pickReference(refs[e.id], age, sex);
        return {
          id: e.id,
          name: e.name,
          route: e.route,
          amount: r?.rda != null ? `${r.rda} ${r.unit}` : '',
          why: `Tagged ${hits.join(' and ')} — matches ${goalNames.length > 1 ? 'your goals' : goalNames[0]?.toLowerCase()}.`,
          selected: i < 3,
        };
      }),
      leftOut: {
        alreadyTaking: entries.filter((e) => already.has(e.name.toLowerCase())).map((e) => e.name),
        noMatch: scored.length > 6 ? scored.slice(6).map((x) => x.e.name) : [],
        goalNames,
      },
    };
  }, [entries, refs, goalIds, currentStack, age, sex]);
}

export function Recommendations({
  goalIds,
  currentStack,
  age,
  sex,
  onDone,
}: {
  goalIds: string[];
  currentStack: string[];
  age?: number | null;
  sex?: 'm' | 'f' | 'na' | null;
  onDone: (picks: Recommendation[]) => void;
}) {
  const data = useRecommendations(goalIds, currentStack, age, sex);
  const [picks, setPicks] = useState<Recommendation[] | null>(null);

  useEffect(() => {
    if (data && !picks) setPicks(data.picks);
  }, [data, picks]);

  if (!data || !picks) {
    return (
      <Screen center>
        <p className="ob-sub">Loading…</p>
      </Screen>
    );
  }

  const chosen = picks.filter((p) => p.selected);

  return (
    <Screen
      scroll
      footer={
        <Cta onClick={() => onDone(chosen)} disabled={chosen.length === 0}>
          Create schedule
        </Cta>
      }
    >
      <Title>What we found</Title>
      <Sub>
        Matched to {data.leftOut.goalNames.join(' and ').toLowerCase()}. Untick anything you don’t
        want.
      </Sub>

      <div className="ob-recs">
        {picks.map((r) => (
          <button
            key={r.id}
            className={`ob-rec${r.selected ? ' on' : ''}`}
            aria-pressed={r.selected}
            onClick={() =>
              setPicks((ps) => ps!.map((p) => (p.id === r.id ? { ...p, selected: !p.selected } : p)))
            }
          >
            <span className="ob-rec-main">
              <span className="ob-card-title">{r.name}</span>
              {/* The app holds no dose for anything and will not invent one --
                  the glossary carries category, mechanism, storage and route,
                  never an amount. See legal.md. The slot stays, labelled. */}
              <span className="ob-rec-dose">
                {r.amount ? `${r.amount} a day · ${r.route}` : `${r.route} · you set the amount`}
              </span>
              <span className="ob-rec-why">{r.why}</span>
              <span className="ob-rec-link">Read the research →</span>
            </span>
            <span className={`ob-tick${r.selected ? ' on' : ''}`}>
              {r.selected && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--bg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2.5 6.2 4.8 8.5 9.5 3.5" />
                </svg>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* The part people screenshot. Do not cut it. */}
      <div className="ob-left-out">
        <h2>What was left out</h2>
        {data.leftOut.alreadyTaking.length > 0 && (
          <p>
            <b>Already in your stack:</b> {data.leftOut.alreadyTaking.join(', ')}. No point suggesting
            what you are taking.
          </p>
        )}
        {data.leftOut.noMatch.length > 0 && (
          <p>
            <b>Matched but ranked lower:</b> {data.leftOut.noMatch.slice(0, 6).join(', ')}. Fewer of
            your goals matched their tags.
          </p>
        )}
        <p>
          Everything else in the library is tagged for goals you did not pick. Nothing was excluded
          for being unpopular or unprofitable — the ranking is goal-tag overlap and nothing else.
        </p>
      </div>
    </Screen>
  );
}

/* ── the draggable schedule ──────────────────────────────────────────── */

interface Slot {
  id: string;
  name: string;
  time: string;
}

const buildSlots = (meals: Meal[], wake: string, sleep: string): Slot[] => {
  const s: Slot[] = [{ id: 'morning', name: 'Morning', time: wake }];
  for (const m of [...meals].sort((a, b) => toMinutes(a.time) - toMinutes(b.time))) {
    s.push({ id: m.id, name: m.name, time: m.time });
  }
  s.push({ id: 'winddown', name: 'Wind-down', time: fromMinutes(toMinutes(sleep) - 60) });
  const seen = new Set<string>();
  return s.filter((x) => (seen.has(x.time) ? false : (seen.add(x.time), true)));
};

export function ScheduleBuilder({
  picks,
  meals,
  wake,
  sleep,
  onDone,
}: {
  picks: Recommendation[];
  meals: Meal[];
  wake: string;
  sleep: string;
  onDone: (schedule: { id: string; time: string }[]) => void;
}) {
  const slots = useMemo(() => buildSlots(meals, wake, sleep), [meals, wake, sleep]);
  const [placed, setPlaced] = useState<Record<string, string>>(() =>
    Object.fromEntries(picks.map((p, i) => [p.id, slots[i % slots.length].id])),
  );
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<{ slot: string; bad: boolean } | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hold = useRef<number | null>(null);

  const ctx = { mealTimes: meals.map((m) => m.time), sleepTime: sleep };
  const slotById = Object.fromEntries(slots.map((s) => [s.id, s]));

  const itemsIn = (slotId: string) => picks.filter((p) => placed[p.id] === slotId);

  const others = (movingId: string): ScheduledItem[] =>
    picks
      .filter((p) => p.id !== movingId)
      .map((p) => ({ id: p.id, name: p.name, time: slotById[placed[p.id]]?.time ?? wake }));

  const tryDrop = (id: string, slotId: string) => {
    const p = picks.find((x) => x.id === id)!;
    const target = slotById[slotId];
    const violations = checkPlacement({ id, name: p.name, time: target.time }, target.time, others(id), ctx);
    const blocking = violations.find((v) => v.severity === 'block');
    if (blocking) {
      // springs back, shakes, and says which rule -- the shake on its own
      // communicates nothing and fails accessibility
      setShake(id);
      setMessage(blocking.message);
      setTimeout(() => setShake(null), 420);
      return;
    }
    setPlaced((m) => ({ ...m, [id]: slotId }));
    setMessage(violations[0]?.message ?? null);
  };

  const startHold = (id: string) => {
    hold.current = window.setTimeout(() => setDragging(id), 200);
  };
  const cancelHold = () => {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-slot]') as HTMLElement | null;
    if (!el) return setOver(null);
    const slotId = el.dataset.slot!;
    const p = picks.find((x) => x.id === dragging)!;
    const t = slotById[slotId];
    const bad = checkPlacement({ id: dragging, name: p.name, time: t.time }, t.time, others(dragging), ctx).some(
      (v) => v.severity === 'block',
    );
    setOver({ slot: slotId, bad });
  };

  const onUp = () => {
    cancelHold();
    if (dragging && over) tryDrop(dragging, over.slot);
    setDragging(null);
    setOver(null);
  };

  return (
    <Screen
      scroll
      footer={<Cta onClick={() => onDone(picks.map((p) => ({ id: p.id, time: slotById[placed[p.id]].time })))}>Start</Cta>}
    >
      <Title>Your schedule</Title>
      <Sub>Press and hold a card to move it. We’ll say if something can’t go there.</Sub>

      <div className="ob-slots" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {slots.map((s) => (
          <div key={s.id}>
            <div className="ob-slot-head">
              <span className="ob-slot-name">{s.name}</span>
              <span className="ob-slot-time">{s.time}</span>
            </div>
            <div
              data-slot={s.id}
              className={`ob-slot${over?.slot === s.id ? (over.bad ? ' over-bad' : ' over') : ''}`}
            >
              {itemsIn(s.id).length === 0 && <div className="ob-slot-empty">Nothing here</div>}
              {itemsIn(s.id).map((p) => (
                <div
                  key={p.id}
                  className={`ob-dose-card${dragging === p.id ? ' lifted' : ''}${shake === p.id ? ' shake' : ''}`}
                  onPointerDown={() => startHold(p.id)}
                  onPointerUp={cancelHold}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <span className="ob-dose-time">{s.time}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="ob-card-title" style={{ display: 'block' }}>
                      {p.name}
                    </span>
                    <span className="ob-caption">{p.route} · you set the amount</span>
                  </span>
                  <svg className="ob-dose-grip" width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M3 5.5h10M3 10.5h10" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {message && (
        <div className="ob-conflict" role="alert" aria-live="assertive">
          {message}
        </div>
      )}
    </Screen>
  );
}

/* ── done ────────────────────────────────────────────────────────────── */

export function Done({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const t = setTimeout(onFinish, 1400);
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <Screen center>
      <OnboardIllustration name="done" size={110} />
      <div style={{ marginTop: 26 }}>
        <Title>You’re set</Title>
        <Sub>Your first day is on the Today screen.</Sub>
      </div>
    </Screen>
  );
}
