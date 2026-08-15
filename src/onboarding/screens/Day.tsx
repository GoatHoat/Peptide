import { useEffect, useRef, useState } from 'react';
import { Cta, Screen, Sub, Title } from '../chrome';
import type { Meal } from '../store';
import { listGlossary, type GlossaryEntry } from '../../lib/api';

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};
const fmt = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${period}`;
};

/* ── sleep ───────────────────────────────────────────────────────────── */

const DIAL = 236;
const DIAL_R = 94;
const DIAL_STROKE = 18;
const HANDLE_R = 13;
/** minutes the handles snap to */
const SNAP = 5;

const angleOf = (t: string) => (toMin(t) / 1440) * 360;
const onRing = (deg: number, r = DIAL_R) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [DIAL / 2 + r * Math.cos(rad), DIAL / 2 + r * Math.sin(rad)] as const;
};
const timeOf = (deg: number) => {
  const mins = Math.round((((deg % 360) + 360) % 360 / 360) * 1440 / SNAP) * SNAP;
  const m = mins % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export function Sleep({
  wake,
  sleep,
  onChange,
  onNext,
}: {
  wake: string;
  sleep: string;
  onChange: (p: { wake: string; sleep: string }) => void;
  onNext: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<'wake' | 'sleep' | null>(null);

  // hours in bed, wrapping past midnight
  const mins = (toMin(wake) - toMin(sleep) + 1440) % 1440;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;

  const c = DIAL / 2;
  const circumference = 2 * Math.PI * DIAL_R;
  const startDeg = angleOf(sleep);
  const [wx, wy] = onRing(angleOf(wake));
  const [sx, sy] = onRing(startDeg);

  /** Angle is invariant to how the SVG is scaled, so the centre is enough. */
  const degFromPointer = (e: { clientX: number; clientY: number }) => {
    const box = svgRef.current!.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height / 2);
    return (Math.atan2(dx, -dy) * 180) / Math.PI;
  };

  const move = (e: React.PointerEvent) => {
    const which = dragging.current;
    if (!which) return;
    const t = timeOf(degFromPointer(e));
    onChange(which === 'wake' ? { wake: t, sleep } : { wake, sleep: t });
  };

  const grab = (which: 'wake' | 'sleep') => (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = which;
    (e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId);
  };
  const release = () => {
    dragging.current = null;
  };

  const nudge = (which: 'wake' | 'sleep', delta: number) => {
    const cur = which === 'wake' ? wake : sleep;
    const t = timeOf(((toMin(cur) + delta + 1440) % 1440 / 1440) * 360);
    onChange(which === 'wake' ? { wake: t, sleep } : { wake, sleep: t });
  };

  return (
    <Screen scroll footer={<Cta onClick={onNext}>Continue</Cta>}>
      <Title>Your day, part one</Title>
      <Sub>Drag either end of the ring. We schedule around the window, not the minute.</Sub>

      <div className="ob-dial-wrap">
        <svg
          ref={svgRef}
          className="ob-dial"
          width={DIAL}
          height={DIAL}
          viewBox={`0 0 ${DIAL} ${DIAL}`}
          onPointerMove={move}
          onPointerUp={release}
          onPointerCancel={release}
        >
          <circle cx={c} cy={c} r={DIAL_R} fill="none" stroke="var(--card)" strokeWidth={DIAL_STROKE} />
          <circle
            cx={c}
            cy={c}
            r={DIAL_R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={DIAL_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${circumference * (mins / 1440)} ${circumference}`}
            transform={`rotate(${startDeg - 90} ${c} ${c})`}
          />

          {/* twelve ticks, so the ring reads as a clock rather than a gauge */}
          {Array.from({ length: 12 }, (_, i) => {
            const [x1, y1] = onRing(i * 30, DIAL_R - DIAL_STROKE / 2 - 7);
            const [x2, y2] = onRing(i * 30, DIAL_R - DIAL_STROKE / 2 - (i % 3 === 0 ? 13 : 10));
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--t4)" strokeWidth="2" strokeLinecap="round" />;
          })}

          <Handle
            x={sx}
            y={sy}
            label="Go to sleep"
            value={sleep}
            onGrab={grab('sleep')}
            onNudge={(d) => nudge('sleep', d)}
          />
          <Handle
            x={wx}
            y={wy}
            label="Wake up"
            value={wake}
            onGrab={grab('wake')}
            onNudge={(d) => nudge('wake', d)}
          />
        </svg>

        <div className="ob-dial-centre">
          <div className="ob-dial-hours">
            {hours}h{rest ? ` ${rest}m` : ''}
          </div>
          <div className="ob-dial-label">In bed</div>
        </div>
      </div>

      <div className="ob-time-row">
        <div className="ob-time-card">
          <label htmlFor="ob-sleep">Go to sleep</label>
          <input
            id="ob-sleep"
            type="time"
            value={sleep}
            onChange={(e) => onChange({ wake, sleep: e.target.value || '23:00' })}
          />
        </div>
        <div className="ob-time-card">
          <label htmlFor="ob-wake">Wake up</label>
          <input
            id="ob-wake"
            type="time"
            value={wake}
            onChange={(e) => onChange({ wake: e.target.value || '07:00', sleep })}
          />
        </div>
      </div>
    </Screen>
  );
}

/** A grab point on the ring. The visible dot is 13px; the target is 22. */
function Handle({
  x,
  y,
  label,
  value,
  onGrab,
  onNudge,
}: {
  x: number;
  y: number;
  label: string;
  value: string;
  onGrab: (e: React.PointerEvent) => void;
  onNudge: (deltaMinutes: number) => void;
}) {
  return (
    <g
      className="ob-dial-handle"
      onPointerDown={onGrab}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuetext={`${label} ${fmt(value)}`}
      aria-valuenow={toMin(value)}
      aria-valuemin={0}
      aria-valuemax={1439}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onNudge(-15);
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onNudge(15);
      }}
    >
      <circle cx={x} cy={y} r={22} fill="transparent" />
      <circle cx={x} cy={y} r={HANDLE_R} fill="var(--bg)" stroke="var(--accent)" strokeWidth="3.5" />
      <circle cx={x} cy={y} r={4} fill="var(--accent-light)" />
    </g>
  );
}

/* ── meals ───────────────────────────────────────────────────────────── */

export function Meals({
  meals,
  onChange,
  onNext,
}: {
  meals: Meal[];
  onChange: (m: Meal[]) => void;
  onNext: () => void;
}) {
  const [leaving, setLeaving] = useState<string | null>(null);

  const remove = (id: string) => {
    setLeaving(id);
    // let the card collapse before it leaves the list
    setTimeout(() => {
      onChange(meals.filter((m) => m.id !== id));
      setLeaving(null);
    }, 200);
  };

  const add = () => {
    const last = meals.length ? toMin(meals[meals.length - 1].time) : 8 * 60;
    const t = Math.min(23 * 60 + 30, last + 240);
    onChange([
      ...meals,
      {
        id: `meal-${Date.now()}`,
        name: 'Meal',
        time: `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`,
      },
    ]);
  };

  const patch = (id: string, p: Partial<Meal>) =>
    onChange(meals.map((m) => (m.id === id ? { ...m, ...p } : m)));

  return (
    <Screen scroll footer={<Cta onClick={onNext}>Continue</Cta>}>
      <Title>Your day, part two</Title>
      <Sub>Anything that needs food gets scheduled near one of these.</Sub>

      <div className="ob-meals">
        {[...meals]
          .sort((a, b) => toMin(a.time) - toMin(b.time))
          .map((m) => (
            <div key={m.id} className={`ob-meal${leaving === m.id ? ' leaving' : ''}`}>
              <div className="ob-meal-main">
                <input
                  className="ob-meal-name"
                  value={m.name}
                  onChange={(e) => patch(m.id, { name: e.target.value })}
                  aria-label="Meal name"
                />
                <input
                  type="time"
                  value={m.time}
                  onChange={(e) => patch(m.id, { time: e.target.value })}
                  aria-label={`${m.name} time`}
                />
              </div>
              <button className="ob-meal-del" onClick={() => remove(m.id)} aria-label={`Remove ${m.name}`}>
                <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                  <path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5.5 5.5 6.3 16a1 1 0 0 0 1 .9h5.4a1 1 0 0 0 1-.9l.8-10.5" />
                </svg>
              </button>
            </div>
          ))}
      </div>

      {meals.length === 0 && (
        <p className="ob-caption" style={{ marginTop: 16 }}>
          No meals set — doses that would have been anchored to one get spread evenly across your day
          instead.
        </p>
      )}

      <button className="ob-add" onClick={add}>
        <svg width="15" height="15" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" fill="none" aria-hidden>
          <path d="M8 3.5v9M3.5 8h9" />
        </svg>
        Add meal
      </button>
    </Screen>
  );
}

/* ── current stack ───────────────────────────────────────────────────── */

export function CurrentStack({
  picked,
  onChange,
  onNext,
}: {
  picked: string[];
  onChange: (v: string[]) => void;
  onNext: () => void;
}) {
  const [q, setQ] = useState('');
  const [all, setAll] = useState<GlossaryEntry[]>([]);

  useEffect(() => {
    listGlossary(200)
      .then(setAll)
      .catch(() => setAll([]));
  }, []);

  const results = q.trim()
    ? all.filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase()) && !picked.includes(e.name)).slice(0, 8)
    : [];

  const add = (name: string) => {
    onChange([...picked, name]);
    setQ('');
  };

  return (
    <Screen
      scroll
      footer={
        <>
          <Cta onClick={onNext}>Continue</Cta>
          {picked.length === 0 && (
            <button className="ob-textlink" onClick={onNext} style={{ marginTop: 10 }}>
              Nothing yet
            </button>
          )}
        </>
      }
    >
      <Title>What are you already taking?</Title>
      {/* This is what makes the double-up check possible at all. */}
      <Sub>So we can spot anything you would end up taking twice.</Sub>

      <input
        className="ob-input"
        style={{ marginTop: 22 }}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name"
        aria-label="Search supplements"
      />

      {results.length > 0 && (
        <div className="ob-results">
          {results.map((r) => (
            <button key={r.id} className="ob-result" onClick={() => add(r.name)}>
              {r.name}
              <span className="ob-caption">{r.category}</span>
            </button>
          ))}
        </div>
      )}

      {q.trim() && results.length === 0 && (
        <button className="ob-result" style={{ marginTop: 14 }} onClick={() => add(q.trim())}>
          Add “{q.trim()}”
          <span className="ob-caption">not in our list</span>
        </button>
      )}

      {picked.length > 0 && (
        <div className="ob-chips">
          {picked.map((name) => (
            <span className="ob-chip" key={name}>
              {name}
              <button onClick={() => onChange(picked.filter((p) => p !== name))} aria-label={`Remove ${name}`}>
                <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                  <path d="M3 3l6 6M9 3l-6 6" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </Screen>
  );
}

export { fmt as formatClock, toMin as clockToMinutes };

/** Keeps the meal-name input from being restyled by the generic input rules. */
export function useNoop() {
  const r = useRef(null);
  return r;
}
