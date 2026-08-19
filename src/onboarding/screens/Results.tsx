import { NAME } from '../../lib/brand';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Cta, OnboardIllustration, Screen, Sub, Title } from '../chrome';
import { Skeleton } from '../../components/Skeleton';
import { GOAL_BY_ID, DEFAULT_GOAL_IDS } from '../goals';
import {
  getNutrientReference,
  listGlossary,
  type GlossaryEntry,
  type NutrientReference,
} from '../../lib/api';
import { checkPlacement, fromMinutes, toMinutes, type ScheduledItem } from '../../lib/conflicts';
import { solve } from '../../lib/schedule';
import { resolveIntake } from '../../lib/intake';
import { recommend } from '../../lib/recommend';
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
  /** the intake that applies to this person, where a single figure does */
  amount: string;
  /**
   * Iron, for someone we have not been told about: both figures rather than a
   * guess between them. Display only — `amount` stays empty, so the schedule
   * stores no number, the same as anything else with no single established
   * figure. See lib/intake.ts.
   */
  amountRange: { yes: string; no: string } | null;
  /** a reaction they told us about put this one on a full stomach */
  withFood: boolean;
  /**
   * A statement about total dietary intake, shown under the card as tertiary
   * text. Never folded into the figure above it — that is the whole point.
   */
  dietaryIntakeNote: string | null;
}

/**
 * The reference figure, as stored.
 *
 * This used to be `scaled(rda, factor)` — the ODS vegetarian multiplier applied
 * to the RDA and rounded. That misread the source. The 1.8x is about iron from
 * the whole diet, not about a supplement, so multiplying it out and printing
 * "32 mg" as a personal target stated something ODS does not say. The figure
 * shown is now the stored one and nothing is computed; the vegetarian note is
 * rendered separately, in words, saying what it actually applies to.
 */
const figureFor = (value: number, unit: string) => `${value} ${unit}`;

const doseLine = (r: Recommendation) =>
  [
    r.amountRange
      ? `${r.amountRange.yes} a day if you menstruate · ${r.amountRange.no} if you don’t · ${r.route}`
      : r.amount
        ? `${r.amount} a day · ${r.route}`
        : `${r.route} · you set the amount`,
    r.withFood ? 'with food' : null,
  ]
    .filter(Boolean)
    .join(' · ');

export function useRecommendations(
  goalIds: string[],
  currentStack: string[],
  diet: string[],
  reactions: string[],
  forms: string[],
  age?: number | null,
  sex?: 'm' | 'f' | 'na' | null,
) {
  const [entries, setEntries] = useState<GlossaryEntry[] | null>(null);
  const [refs, setRefs] = useState<Record<string, NutrientReference[]>>({});
  useEffect(() => {
    /* Both in one update, deliberately. `Recommendations` below snapshots the
       cards the first render this returns anything, so entries arriving a
       round trip ahead of the reference intakes meant every card was built
       with no figure and read "you set the amount" — the amounts were only
       ever going to lose that race against a real server. */
    listGlossary(200)
      .then(async (rows) => {
        const refs = await getNutrientReference(rows.map((r) => r.id));
        setRefs(refs);
        setEntries(rows);
      })
      .catch(() => setEntries([]));
  }, []);

  return useMemo(() => {
    if (!entries) return null;
    const ids = goalIds.length ? goalIds : DEFAULT_GOAL_IDS;
    const goalNames = ids.map((g) => GOAL_BY_ID[g]?.name ?? g);

    /* Everything the ordering knows is in lib/recommend.ts, including the
       sentence on each card. This screen picks how many to show and turns a
       reference intake into a string; it does not decide anything. */
    const result = recommend(entries, {
      goalTags: ids.flatMap((g) => GOAL_BY_ID[g]?.tags ?? []),
      goalLabel: goalNames.length > 1 ? 'your goals' : (goalNames[0]?.toLowerCase() ?? 'your goals'),
      currentStack,
      diet,
      reactions,
      forms,
    });

    return {
      picks: result.ranked.slice(0, 6).map((s, i) => {
        /* Onboarding never passes a menstrual status: it is not asked here,
           deliberately, so iron arrives as two figures and the question waits
           until the iron entry itself. */
        const intake = resolveIntake(s.entry, refs[s.entry.id], age, sex, null);
        const figure = (rda: number) => figureFor(rda, intake.unit);
        return {
          id: s.entry.id,
          name: s.entry.name,
          route: s.entry.route,
          amount: intake.rda != null && intake.rdaIfNot == null ? figure(intake.rda) : '',
          amountRange:
            intake.rda != null && intake.rdaIfNot != null
              ? { yes: figure(intake.rda), no: figure(intake.rdaIfNot) }
              : null,
          why: s.reason,
          dietaryIntakeNote: s.dietaryIntakeNote,
          withFood: s.timing === 'with_food',
          selected: i < 3,
        } satisfies Recommendation;
      }),
      leftOut: {
        alreadyTaking: result.alreadyTaking,
        swapped: result.swappedOut,
        noMatch: result.ranked.slice(6).map((s) => s.entry.name),
        goalNames,
      },
    };
  }, [entries, refs, goalIds, currentStack, diet, reactions, forms, age, sex]);
}

export function Recommendations({
  goalIds,
  currentStack,
  diet,
  reactions,
  forms,
  age,
  sex,
  onDone,
}: {
  goalIds: string[];
  currentStack: string[];
  diet: string[];
  reactions: string[];
  forms: string[];
  age?: number | null;
  sex?: 'm' | 'f' | 'na' | null;
  onDone: (picks: Recommendation[]) => void;
}) {
  const data = useRecommendations(goalIds, currentStack, diet, reactions, forms, age, sex);
  const [picks, setPicks] = useState<Recommendation[] | null>(null);

  useEffect(() => {
    if (data && !picks) setPicks(data.picks);
  }, [data, picks]);

  /**
   * The screen, with the list still on its way.
   *
   * This was one centred "Loading…" and then the whole screen at once — the
   * heaviest pop in the flow, arriving at the moment somebody is waiting to see
   * what they were matched to. The frame is the same either way: the title is
   * true before the rows land, the disclaimer is required next to the figures
   * and costs nothing to show early, and three card-height blocks hold the
   * space the cards will take.
   */
  if (!data || !picks) {
    return (
      <Screen
        scroll
        footer={
          <Cta onClick={() => {}} disabled>
            Create schedule
          </Cta>
        }
      >
        <Title>Vitamins and minerals for you</Title>
        <Sub>Matching the library against your answers.</Sub>
        <p className="ob-disclaimer t-caption">
          Daily targets are the published NIH Office of Dietary Supplements reference intakes for
          your age and sex, not a dose set by this app. {NAME} is not medical advice — talk to a
          healthcare professional before starting anything.
        </p>
        <Skeleton rows={3} height={92} gap={10} radius={22} label="Matching your answers" />
      </Screen>
    );
  }

  /**
   * The empty state.
   *
   * `recommend` drops anything already in the stack, so somebody who already
   * takes everything tagged for the goals they picked gets an empty list back.
   * Until now that rendered the title, the disclaimer, the "what was left out"
   * block and a permanently disabled "Create schedule" — no cards to tick,
   * nothing to untick, no skip, and no way out of onboarding. A dead end
   * before the app exists for them.
   *
   * The CTA keeps its label so the one path through this screen is the same
   * path in both states. It is honest: a schedule still gets built, it just
   * starts empty, and Discover is where anything else comes from.
   */
  if (picks.length === 0) {
    return (
      <Screen
        scroll
        footer={<Cta onClick={() => onDone([])}>Create schedule</Cta>}
      >
        <Title>Nothing left to suggest</Title>
        <Sub>
          Everything the library matches to your goals is already in your stack, so there is
          nothing to add here.
        </Sub>
        {data.leftOut.alreadyTaking.length > 0 && (
          <p className="ob-caption" style={{ marginTop: 16 }}>
            Already in your stack: {data.leftOut.alreadyTaking.join(', ')}.
          </p>
        )}
        <p className="ob-caption" style={{ marginTop: 16 }}>
          Your schedule starts empty. Add anything you want to track from Discover, and edit the
          times whenever you like.
        </p>
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
      <Title>Vitamins and minerals for you</Title>
      <Sub>
        Matched to {data.leftOut.goalNames.join(' and ').toLowerCase()}, then ordered by what you
        told us — what you don’t eat, what hasn’t agreed with you, and the strength of the
        evidence. Untick anything you don’t want.
      </Sub>
      {/* 1.4.2. Every card below carries a figure, and until now this screen
          said nothing about where those figures come from or what they are
          not. The defence for showing them at all is that they are published
          NIH reference intakes rather than anything this app decided — which
          only works if it is on the screen, next to the numbers, without
          scrolling. */}
      <p className="ob-disclaimer t-caption">
        Daily targets are the published NIH Office of Dietary Supplements reference intakes for
        your age and sex, not a dose set by this app. {NAME} is not medical advice — talk to a
        healthcare professional before starting anything.
      </p>

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
              <span className="ob-rec-dose">{doseLine(r)}</span>
              {/* No rule fired and no goal tag matched — a card with no
                  explanation beats a card with an invented one. */}
              {r.why && <span className="ob-rec-why">{r.why}</span>}
              {/* Tertiary, and deliberately separate from the figure above.
                  The ODS vegetarian multiplier is about the whole diet; it is
                  not a dose, and it must not read as one. */}
              {r.dietaryIntakeNote && (
                <span className="ob-rec-diet">{r.dietaryIntakeNote}</span>
              )}
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
        {/* A product swapped for another form of the same nutrient. Left
            silent this reads as the app ignoring an answer. */}
        {data.leftOut.swapped.length > 0 && (
          <p>
            <b>Swapped for another form:</b>{' '}
            {data.leftOut.swapped
              .slice(0, 4)
              .map((s) => `${s.name} — ${s.why}`)
              .join('. ')}
            .
          </p>
        )}
        {data.leftOut.noMatch.length > 0 && (
          <p>
            <b>Also matched, not selected:</b> {data.leftOut.noMatch.slice(0, 6).join(', ')}. Fewer of
            your goals matched, or something you told us moved another one above them.
          </p>
        )}
        <p>
          Everything else in the library is tagged for goals you did not pick. Nothing was excluded
          for being unpopular or unprofitable — the ranking is your goals, your answers and the
          strength of the evidence, and nothing else.
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
  const baseSlots = useMemo(() => buildSlots(meals, wake, sleep), [meals, wake, sleep]);
  /**
   * Times the user added here, before any of this is saved.
   *
   * Not written through AddSchedule: nothing on this screen exists as a
   * schedule_item yet — the rows are created after Start, in one place, by
   * Onboarding. Adding a time here adds a slot to drag into, and the existing
   * write path persists whatever ends up in it. That keeps one way to create a
   * schedule item rather than two.
   */
  const [ownTimes, setOwnTimes] = useState<string[]>([]);
  const [addingTime, setAddingTime] = useState(false);
  const [newTime, setNewTime] = useState('');

  /* The opening layout comes from the solver, not from `i % slots.length`.
     Round-robin put iron next to zinc as often as not and could not say why
     anything was where it was; this places against the ingredient panel and
     hands back a reason per item. Dragging afterwards still works and is still
     checked by conflicts.ts — the solver decides where things start. */
  const solution = useMemo(
    () =>
      solve(
        picks.map((p) => ({ id: p.id, name: p.name })),
        { wake, sleep, meals: meals.map((m) => ({ id: m.id, name: m.name, time: m.time })) },
      ),
    [picks, meals, wake, sleep],
  );
  const reasonById = useMemo(
    () => Object.fromEntries(solution.placements.map((pl) => [pl.itemId, pl])),
    [solution],
  );

  /**
   * The drag targets: the day's own times, plus anything the solver invented,
   * plus anything the user added.
   *
   * buildSlots built its list independently of the solver, so a block the
   * solver derived — the food-free gap — had no slot here at all. The fallback
   * below quietly reassigned those items to slots[0], which is Morning, so an
   * empty-stomach item was placed correctly by the solver and then shown next
   * to breakfast anyway, with the reason line for a block that was not on
   * screen. Merging by time rather than by id, because a derived gap can land
   * on a time the day already has.
   */
  const slots = useMemo(() => {
    const byTime = new Map(baseSlots.map((s) => [s.time, s]));
    for (const b of solution.blocks) {
      if (!byTime.has(b.time)) byTime.set(b.time, { id: b.id, name: b.name, time: b.time });
    }
    for (const t of ownTimes) {
      if (!byTime.has(t)) byTime.set(t, { id: `own-${t}`, name: 'Your own time', time: t });
    }
    return [...byTime.values()].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  }, [baseSlots, solution, ownTimes]);

  const [placed, setPlaced] = useState<Record<string, string>>(() => {
    const fromSolver = Object.fromEntries(solution.placements.map((pl) => [pl.itemId, pl.blockId]));
    // any block the solver named must exist in the drag target list
    const known = new Set(slots.map((s) => s.id));
    return Object.fromEntries(
      picks.map((p) => [p.id, known.has(fromSolver[p.id]) ? fromSolver[p.id] : slots[0].id]),
    );
  });
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<{ slot: string; bad: boolean } | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const hold = useRef<number | null>(null);

  const ctx = { mealTimes: meals.map((m) => m.time), sleepTime: sleep };
  const slotById = Object.fromEntries(slots.map((s) => [s.id, s]));

  const itemsIn = (slotId: string) => picks.filter((p) => placed[p.id] === slotId);
  /** why the solver put this here, shown under the name in the reveal */
  const reasonFor = (id: string) => reasonById[id]?.reason ?? null;
  const compromiseFor = (id: string) => reasonById[id]?.compromise ?? null;

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
      {/* The amounts on these cards came from the previous screen, so the same
          statement has to follow them here. */}
      <p className="ob-disclaimer t-caption">
        Amounts are the published NIH reference intakes, not a dose set by this app, and you can
        change any of them. Not medical advice.
      </p>

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
                    {/* Why the solver put it here. Without this the schedule is
                        the app moving things around for reasons the user cannot
                        see — which is indistinguishable from moving them at
                        random. Only shown while the item is where the solver
                        put it; once dragged, the reason no longer holds. */}
                    {placed[p.id] === reasonById[p.id]?.blockId && reasonFor(p.id) && (
                      <span className="ob-dose-reason">{reasonFor(p.id)}</span>
                    )}
                    {placed[p.id] === reasonById[p.id]?.blockId && compromiseFor(p.id) && (
                      <span className="ob-dose-compromise">{compromiseFor(p.id)}</span>
                    )}
                  </span>
                  <svg className="ob-dose-grip" width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M3 5.5h10M3 10.5h10" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Below the last block, and there whether or not anything is in them.
            The escape hatch for a schedule that is nearly right — the primary
            action is accepting what was built, which is the Start button.

            An inline time field rather than window.prompt: a browser dialog is
            a seam, and this is the same control the add-to-schedule sheet uses,
            so the interaction is one somebody has already met. */}
        {addingTime ? (
          <div className="ob-add-time-row">
            <input
              className="field-input"
              type="time"
              value={newTime}
              autoFocus
              onChange={(e) => setNewTime(e.target.value)}
              aria-label="New time"
            />
            <button
              type="button"
              className="ob-add-time-go"
              disabled={!newTime}
              onClick={() => {
                if (!newTime) return;
                setOwnTimes((prev) => (prev.includes(newTime) ? prev : [...prev, newTime]));
                setNewTime('');
                setAddingTime(false);
              }}
            >
              Add
            </button>
          </div>
        ) : (
          <button type="button" className="ob-add-time" onClick={() => setAddingTime(true)}>
            Add your own time
          </button>
        )}
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
