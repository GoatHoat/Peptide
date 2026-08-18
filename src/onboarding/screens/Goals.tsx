import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { Cta, Screen } from '../chrome';
import { GOALS } from '../goals';
import { withMotion } from '../../lib/motion';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 30, mass: 0.9 };
/** commit to the drag inside this many px */
const THRESHOLD = 8;
const RUBBER = 0.35;
/**
 * How far a flick carries, in seconds of projected travel. The Action Button
 * picker lets a hard swipe run several items rather than always landing on the
 * neighbour, so the release is projected well past the finger and only then
 * rounded — 0.2s stopped at the next card no matter how hard you threw it.
 */
const FLICK_PROJECTION = 0.75;
/** a slow drag still needs a small nudge to count */
const MIN_FLICK = 0.35;
/** px of travel per card, so neighbours sit just off-centre */
const SPREAD = 250;

/**
 * The Action Button picker.
 *
 * One goal fills the screen; the icon, the name, the copy and the dots are all
 * pure functions of a single continuous `pos` value, so a half-finished drag
 * shows a half-finished transition rather than snapping at the end. Tap the
 * glyph to select, drag or swipe to page.
 */
export function Goals({
  selected,
  onChange,
  onNext,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
  onNext: () => void;
}) {
  const [index, setIndex] = useState(0);
  const pos = useMotionValue(0);
  const width = useRef(320);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => hostRef.current && (width.current = hostRef.current.clientWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const drag = useRef({ active: false, axis: null as null | 'x' | 'y', x: 0, y: 0, start: 0, vel: 0, t: 0 });

  const goTo = (i: number, velocity = 0) => {
    const t = Math.max(0, Math.min(GOALS.length - 1, i));
    setIndex(t);
    animate(pos, t, withMotion({ ...SPRING, velocity }));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pos.stop();
    drag.current = { active: true, axis: null, x: e.clientX, y: e.clientY, start: pos.get(), vel: 0, t: performance.now() };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (d.axis === null) {
      if (Math.abs(dx) > THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        d.axis = 'x';
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } else if (Math.abs(dy) > THRESHOLD) {
        d.active = false;
        return;
      } else return;
    }
    const now = performance.now();
    const dt = now - d.t;
    const raw = d.start - dx / width.current;
    const max = GOALS.length - 1;
    const p = raw < 0 ? raw * RUBBER : raw > max ? max + (raw - max) * RUBBER : raw;
    if (dt > 0) {
      d.vel = d.vel * 0.7 + ((p - pos.get()) / dt) * 1000 * 0.3;
      d.t = now;
    }
    pos.set(p);
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (d.axis !== 'x') return;
    const v = d.vel;
    const projected = pos.get() + v * FLICK_PROJECTION;
    // a deliberate flick always moves at least one card
    const target =
      Math.abs(v) > MIN_FLICK
        ? v > 0
          ? Math.max(Math.ceil(pos.get() + 0.001), Math.round(projected))
          : Math.min(Math.floor(pos.get() - 0.001), Math.round(projected))
        : Math.round(projected);
    goTo(target, v);
  };

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  const count = selected.length;

  return (
    <Screen
      footer={
        <Cta onClick={onNext} disabled={count === 0}>
          {count === 0 ? 'Pick at least one' : `Continue (${count} selected)`}
        </Cta>
      }
    >
      <div
        className="ob-goals"
        ref={hostRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="ob-goal-stage">
          {GOALS.map((g, i) => (
            <GoalCard
              key={g.id}
              goal={g}
              i={i}
              pos={pos}
              on={selected.includes(g.id)}
              onTap={() => (i === index ? toggle(g.id) : goTo(i))}
            />
          ))}
        </div>

        <div className="ob-dots" role="tablist" aria-label="Goals">
          {GOALS.map((g, i) => (
            <button
              key={g.id}
              role="tab"
              aria-selected={i === index}
              aria-label={g.name}
              className={`ob-dot${i === index ? ' on' : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        <GoalText pos={pos} selected={selected} />
        <p className="ob-goal-hint">Swipe to browse · tap the glyph to select</p>
      </div>
    </Screen>
  );
}

function GoalCard({
  goal,
  i,
  pos,
  on,
  onTap,
}: {
  goal: (typeof GOALS)[number];
  i: number;
  pos: ReturnType<typeof useMotionValue<number>>;
  on: boolean;
  onTap: () => void;
}) {
  const dist = useTransform(pos, (p) => Math.abs(p - i));
  /* Neighbours stay on screen, smaller and dimmer, so the row reads as a reel
     rather than one card appearing from nowhere. Everything is a function of
     the same continuous value. */
  const scale = useTransform(dist, (d) => 1 - 0.3 * Math.min(1.4, d));
  const opacity = useTransform(dist, (d) => (d >= 2 ? 0 : Math.max(0, 1 - d * 0.62)));
  const x = useTransform(pos, (p) => (i - p) * SPREAD);
  const pointerEvents = useTransform(dist, (d) => (d < 0.5 ? 'auto' : 'none')) as unknown as never;
  const zIndex = useTransform(dist, (d) => Math.round(100 - d * 10));

  return (
    <motion.button
      className={`ob-goal-icon${on ? ' on' : ''}`}
      style={{ x, scale, opacity, pointerEvents, zIndex }}
      onClick={onTap}
      aria-pressed={on}
      aria-label={`${goal.name}${on ? ', selected' : ''}`}
    >
      <img className="ob-goal-art" src={goal.img} alt="" draggable={false} />
    </motion.button>
  );
}

/** Name and copy cross-fade with the same value that moves the glyphs. */
function GoalText({ pos, selected }: { pos: ReturnType<typeof useMotionValue<number>>; selected: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => pos.on('change', (p) => setI(Math.max(0, Math.min(GOALS.length - 1, Math.round(p))))), [pos]);
  const g = GOALS[i];
  const on = selected.includes(g.id);
  return (
    <>
      <div className={`ob-goal-name${on ? ' on' : ''}`}>{g.name}</div>
      <p className="ob-goal-copy">{g.copy}</p>
    </>
  );
}
