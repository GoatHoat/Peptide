import { useMemo, useState } from 'react';
import { Cta, Screen, Sub, Title } from '../chrome';
import { GOAL_BY_ID } from '../goals';
import { checkPlacement, type ScheduledItem } from '../../lib/conflicts';

/**
 * The six screens added to take the flow from 20 to 27.
 *
 * The rule every one of them is held to: a screen either collects an answer
 * that changes the result, or shows something built from answers already given.
 * A screen that only tells you something is padding, and padding is where
 * people quit. What each one earns is written above it.
 */

/* ── sex, on its own ─────────────────────────────────────────────────── */

/**
 * Earns its place: it moves the iron figure between 18 mg and 8 mg, which is
 * the largest single change any answer in the flow makes to what is shown.
 *
 * Split off `profile` because the age ruler is the first thing that feels like
 * an interaction rather than a form, and pairing it with a sensitive question
 * made both heavier.
 */
export function Sex({
  value,
  onDone,
}: {
  value: 'm' | 'f' | 'na' | null;
  onDone: (sex: 'm' | 'f' | 'na' | null) => void;
}) {
  const [sex, setSex] = useState(value);
  const options: { id: 'f' | 'm' | 'na'; label: string }[] = [
    { id: 'f', label: 'Female' },
    { id: 'm', label: 'Male' },
    { id: 'na', label: 'Prefer not to say' },
  ];
  return (
    <Screen footer={<Cta onClick={() => onDone(sex)}>Continue</Cta>}>
      <Title>And your sex</Title>
      <Sub>
        Only because the published reference intakes differ — iron most of all. Prefer not to say is
        a real answer; you will see both figures where they differ.
      </Sub>
      <div className="ob-options">
        {options.map((o) => (
          <button
            key={o.id}
            className={`ob-option${sex === o.id ? ' on' : ''}`}
            aria-pressed={sex === o.id}
            onClick={() => setSex(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Screen>
  );
}

/* ── how many, before which ──────────────────────────────────────────── */

const COUNTS = [
  { id: 0, label: 'Nothing yet' },
  { id: 2, label: 'One or two' },
  { id: 5, label: 'Three to five' },
  { id: 9, label: 'Six or more' },
];

/**
 * Earns its place: a number is easy and a list is work, so asking the easy one
 * first makes the list read as a continuation rather than a wall. The answer
 * sizes the input on the next screen, so it is used rather than only collected.
 */
export function StackCount({
  value,
  onDone,
}: {
  value: number | null;
  onDone: (count: number | null) => void;
}) {
  const [count, setCount] = useState(value);
  return (
    <Screen footer={<Cta onClick={() => onDone(count)}>Continue</Cta>}>
      <Title>How many things are you taking at the moment?</Title>
      <Sub>Roughly is fine. You will list them on the next screen.</Sub>
      <div className="ob-options">
        {COUNTS.map((c) => (
          <button
            key={c.id}
            className={`ob-option${count === c.id ? ' on' : ''}`}
            aria-pressed={count === c.id}
            onClick={() => setCount(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </Screen>
  );
}

/* ── what we already know ────────────────────────────────────────────── */

/**
 * Earns its place: it is the first moment the app knows something the person
 * does not, and it is built entirely from what they just typed.
 *
 * Never a blank screen and never a generic reassurance — if nothing conflicts
 * it says what it actually checked. The finding comes from `lib/conflicts.ts`,
 * the same rules the schedule solver uses, so this cannot promise something the
 * schedule then fails to do.
 */
export function StackInsight({
  currentStack,
  mealTimes,
  sleepTime,
  onDone,
}: {
  currentStack: string[];
  mealTimes: string[];
  sleepTime: string;
  onDone: () => void;
}) {
  const finding = useMemo(() => {
    if (currentStack.length < 2) return null;
    /* All at one nominal time, because the question being asked is exactly
       "does anything here fight anything else if taken together". The rules are
       the same ones the schedule solver uses, so this screen cannot promise
       something the schedule then fails to do. */
    const items: ScheduledItem[] = currentStack.map((name, i) => ({
      id: String(i),
      name,
      time: '08:00',
    }));
    const ctx = { mealTimes, sleepTime };
    for (let i = 0; i < items.length; i++) {
      const others = items.filter((_, j) => j !== i);
      const violations = checkPlacement(items[i], '08:00', others, ctx);
      const worst = violations.find((v) => v.severity === 'block') ?? violations[0];
      if (worst) return worst.message;
    }
    return null;
  }, [currentStack, mealTimes, sleepTime]);

  return (
    <Screen footer={<Cta onClick={onDone}>Continue</Cta>}>
      <Title>{finding ? 'One thing worth knowing' : 'Nothing here fights anything else'}</Title>
      <Sub>
        {finding ??
          (currentStack.length === 0
            ? 'You are starting from nothing, which is the easiest place to build a schedule from. We will place everything around your meals and sleep.'
            : `We checked what you listed against each other for timing and absorption. Nothing in it needs separating, and we will keep it that way as you add more.`)}
      </Sub>
      {finding && (
        <p className="ob-disclaimer t-caption">
          We will place them apart when we build your schedule. You do not have to do anything.
        </p>
      )}
    </Screen>
  );
}

/* ── which goal matters most ─────────────────────────────────────────── */

/**
 * Earns its place: it feeds the ordering in `recommend.ts`, so the list on the
 * recommendations screen is visibly different depending on the answer.
 *
 * Skipped entirely when one goal was picked — see `isSkipped`.
 */
export function GoalPriority({
  goals,
  value,
  onDone,
}: {
  goals: string[];
  value: string[];
  onDone: (order: string[]) => void;
}) {
  const [first, setFirst] = useState<string | null>(value[0] ?? null);
  return (
    <Screen
      footer={
        <Cta onClick={() => onDone(first ? [first, ...goals.filter((g) => g !== first)] : [])}>
          Continue
        </Cta>
      }
    >
      <Title>Which of those matters most?</Title>
      <Sub>It goes first when two suggestions are otherwise equally good.</Sub>
      <div className="ob-options">
        {goals.map((id) => (
          <button
            key={id}
            className={`ob-option${first === id ? ' on' : ''}`}
            aria-pressed={first === id}
            onClick={() => setFirst(id)}
          >
            {GOAL_BY_ID[id]?.name ?? id}
          </button>
        ))}
      </div>
    </Screen>
  );
}

/* ── the number they chose ───────────────────────────────────────────── */

/**
 * Earns its place: it is stored as the target the adherence view measures
 * against, so it changes what You shows rather than only being collected.
 *
 * People follow through on numbers they picked themselves, and a target you
 * miss twice in the first week is a target you stop looking at — so the
 * default is five rather than seven.
 */
export function Commitment({
  value,
  onDone,
}: {
  value: number;
  onDone: (days: number) => void;
}) {
  const [days, setDays] = useState(value);
  return (
    <Screen footer={<Cta onClick={() => onDone(days)}>Continue</Cta>}>
      <Title>How many days a week do you want to hit?</Title>
      <Sub>
        Your streak counts against this rather than against seven. Pick something you would be
        annoyed to miss, not something you would be proud to hit.
      </Sub>
      <div className="ob-days">
        {[3, 4, 5, 6, 7].map((n) => (
          <button
            key={n}
            className={`ob-day${days === n ? ' on' : ''}`}
            aria-pressed={days === n}
            onClick={() => setDays(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="ob-disclaimer t-caption">
        {days === 7
          ? 'Every day. Nothing wrong with it, but most people do better with a target they can miss once.'
          : `${7 - days} day${7 - days === 1 ? '' : 's'} a week off, and the streak survives.`}
      </p>
    </Screen>
  );
}

/* ── their own answers, back ─────────────────────────────────────────── */

/**
 * Earns its place: it is the last screen before money is mentioned and every
 * word on it came from them. Nothing here is new information — that is the
 * point. It is the moment the flow's investment is visible.
 */
export function PlanPreview({
  goals,
  productCount,
  commitmentDays,
  onDone,
}: {
  goals: string[];
  productCount: number;
  commitmentDays: number;
  onDone: () => void;
}) {
  const names = goals.map((g) => GOAL_BY_ID[g]?.name ?? g);
  const goalLine =
    names.length === 0
      ? 'a general routine'
      : names.length === 1
        ? names[0].toLowerCase()
        : `${names.slice(0, -1).join(', ').toLowerCase()} and ${names[names.length - 1].toLowerCase()}`;

  /* Two of these used to be wrong, and this screen's own subtitle says nothing
     on it is a guess.

     "Products found" was `picks.length` — the ones ticked, not the ones found.
     The screen before it had just shown six and this said three, which is a
     screen contradicting the one before it.

     "Blocks in your day" was derived from whether each pick wanted food, which
     is not what a block is; the solver decides that, and it has not run yet at
     this point in the flow. A number nobody can stand behind is worse than a
     row that is not there, so it is gone. */
  const rows = [
    { label: 'Matched to', value: goalLine },
    { label: 'Products you picked', value: `${productCount}` },
    { label: 'Days a week', value: `${commitmentDays}` },
  ];

  return (
    <Screen scroll footer={<Cta onClick={onDone}>See what it costs</Cta>}>
      <Title>Here is your plan</Title>
      <Sub>All of this came from what you told us. Nothing below is a guess.</Sub>
      <div className="ob-preview">
        {rows.map((r) => (
          <div className="ob-preview-row" key={r.label}>
            <span className="ob-preview-label">{r.label}</span>
            <span className="ob-preview-value">{r.value}</span>
          </div>
        ))}
      </div>
    </Screen>
  );
}
