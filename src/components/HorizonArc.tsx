import { useEffect, useMemo, useRef, useState } from 'react';
import type { Block } from '../data/schedule';

/* ────────────────────────────────────────────────────────────────
   Geometry — reference viewport 402 × 874.

   Centre sits at y = 770 (not 690): the arc is a pinned layer whose
   ends deliberately pass behind the floating tab bar. Radius, stroke,
   sweep and cap are unchanged.
   ──────────────────────────────────────────────────────────────── */
export const VW = 402;
export const VH = 874;
const CX = 201;
const CY = 770;
const R = 175; // 0.435 × viewport width
const W = 42; // 0.24 × radius — chunky on purpose; a thin arc reads as a bent progress bar
const RO = R + W / 2; // 196
const RI = R - W / 2; // 154
const CAP = W / 2; // 21
const ARC_LEN = Math.PI * R; // 549.78 — real arc length, all maths in these units

/** Visible gap we want to see between two round-capped segments. */
const GAP_VISIBLE = 10;
/**
 * stroke-linecap:round extends every segment by strokeWidth/2 at each end, so a
 * geometric gap of G renders as G − strokeWidth. To see 10pt we must cut 52pt.
 * Skip this and the caps overlap and the arc looks unbroken.
 */
const GAP_HALF = GAP_VISIBLE / 2 + CAP; // 26  → full cut 52

const rad = (deg: number) => (deg * Math.PI) / 180;
const degAt = (s: number) => 180 + (s / ARC_LEN) * 180;
const pt = (deg: number, r: number): [number, number] => [
  CX + r * Math.cos(rad(deg)),
  CY + r * Math.sin(rad(deg)),
];

/** Centre-line path for a stroked segment. */
function strokePath(s1: number, s2: number): string {
  const [x1, y1] = pt(degAt(s1), R);
  const [x2, y2] = pt(degAt(s2), R);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * The same segment as a *filled outline* — outer arc, round cap, inner arc back,
 * round cap. clip-path works on fill geometry, never on strokes, and this is
 * what lets a real backdrop-filter live inside the band.
 */
function outlinePath(s1: number, s2: number, capStart = true, capEnd = true): string {
  const a1 = degAt(s1);
  const a2 = degAt(s2);
  const [x1o, y1o] = pt(a1, RO);
  const [x2o, y2o] = pt(a2, RO);
  const [x2i, y2i] = pt(a2, RI);
  const [x1i, y1i] = pt(a1, RI);
  const f = (n: number) => n.toFixed(2);
  // A round cap belongs at a true segment end. The advancing edge of the copper
  // fill is not one — it gets a flat radial cut, or a 9pt sliver of fill
  // balloons into a 50pt lozenge.
  const end = capEnd ? `A${CAP} ${CAP} 0 1 1 ${f(x2i)} ${f(y2i)}` : `L${f(x2i)} ${f(y2i)}`;
  const start = capStart ? `A${CAP} ${CAP} 0 1 1 ${f(x1o)} ${f(y1o)}` : `L${f(x1o)} ${f(y1o)}`;
  return (
    `M${f(x1o)} ${f(y1o)}` +
    `A${RO} ${RO} 0 0 1 ${f(x2o)} ${f(y2o)}` +
    end +
    `A${RI} ${RI} 0 0 0 ${f(x1i)} ${f(y1i)}` +
    start +
    'Z'
  );
}

/* ────────────────────────────────────────────────────────────────
   The day → the arc
   ──────────────────────────────────────────────────────────────── */

function parseTime(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 12;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return h + Number(m[2]) / 60;
}

export type GapState = 'closed' | 'missed' | 'due';

export interface Gap {
  id: string;
  /** position along the arc, in path-length units */
  pos: number;
  state: GapState;
}

/** anglePerMinute = 180 / minutesBetween(wake, bed) */
export function buildGaps(
  blocks: Block[],
  wake: number,
  bed: number,
  taken: Record<string, boolean>,
): Gap[] {
  const minutes = Math.max(1, (bed - wake) * 60);
  const anglePerMinute = 180 / minutes;
  return blocks.map((b) => {
    const t = parseTime(b.time);
    const deg = Math.max(0, Math.min(180, (t - wake) * 60 * anglePerMinute));
    const complete = b.items.every((i) => taken[i.id]);
    return {
      id: b.id,
      pos: (deg / 180) * ARC_LEN,
      state: complete ? 'closed' : b.past ? 'missed' : 'due',
    };
  });
}

/* ────────────────────────────────────────────────────────────────
   Animation
   ──────────────────────────────────────────────────────────────── */

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

interface Props {
  blocks: Block[];
  totalDoses: number;
  takenCount: number;
  taken: Record<string, boolean>;
  wake: number;
  bed: number;
  overCeiling: boolean;
  /** block id whose row is being pressed — its caps anticipate */
  pressed: string | null;
  reducedMotion: boolean;
}

export function HorizonArc({
  blocks,
  totalDoses,
  takenCount,
  taken,
  wake,
  bed,
  overCeiling,
  pressed,
  reducedMotion,
}: Props) {
  const gaps = useMemo(() => buildGaps(blocks, wake, bed, taken), [blocks, wake, bed, taken]);

  const fill = totalDoses > 0 ? takenCount / totalDoses : 0;

  // closure 0 = fully open gap, 1 = sealed. Animated, never derived directly.
  const closure = useRef<Record<string, number>>({});
  const flash = useRef<Record<string, number>>({});
  const [, tick] = useState(0);
  const draw = useRef(reducedMotion ? 1 : 0);
  const started = useRef(false);

  // Seed on first mount so a cold load is correct before any animation runs.
  if (!started.current) {
    started.current = true;
    for (const g of gaps) closure.current[g.id] = g.state === 'closed' ? 1 : 0;
  }

  const targets = useMemo(() => {
    const t: Record<string, number> = {};
    for (const g of gaps) t[g.id] = g.state === 'closed' ? 1 : 0;
    return t;
  }, [gaps]);

  useEffect(() => {
    let raf = 0;
    const from: Record<string, number> = {};
    const start: Record<string, number> = {};
    const t0 = performance.now();
    const DUR = reducedMotion ? 150 : 520;
    let active = false;

    for (const id of Object.keys(targets)) {
      const cur = closure.current[id] ?? 0;
      if (Math.abs(cur - targets[id]) > 0.001) {
        from[id] = cur;
        start[id] = t0;
        active = true;
      }
    }
    const drawing = draw.current < 1;
    if (!active && !drawing) return;

    const loop = (now: number) => {
      let running = false;

      if (draw.current < 1) {
        // glass draws left→right over 700ms; copper follows over 500ms
        draw.current = Math.min(1, (now - t0) / 700);
        if (draw.current < 1) running = true;
      }

      for (const id of Object.keys(from)) {
        const p = Math.min(1, (now - start[id]) / DUR);
        const e = reducedMotion ? p : easeOutBack(p);
        const next = from[id] + (targets[id] - from[id]) * e;
        closure.current[id] = next;
        if (p < 1) running = true;
        else if (targets[id] === 1 && flash.current[id] === undefined) {
          flash.current[id] = now; // seam flash fires once, on seal
        }
      }

      for (const id of Object.keys(flash.current)) {
        if (now - flash.current[id] < 180) running = true;
      }

      tick((n) => n + 1);
      if (running) raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [targets, reducedMotion]);

  // Copper trails the glass draw-on by 700ms, over 500ms.
  const copperDraw = reducedMotion ? 1 : easeOut(Math.max(0, Math.min(1, (draw.current - 0.999) * 1000 + 1)));
  const drawLen = ARC_LEN * (reducedMotion ? 1 : easeOut(draw.current));

  /* ── solid spans = the whole arc minus every still-open gap ── */
  const cuts: [number, number][] = [];
  for (const g of gaps) {
    const c = Math.min(1, closure.current[g.id] ?? 0);
    const half = GAP_HALF * (1 - c);
    if (half > 0.5) cuts.push([Math.max(0, g.pos - half), Math.min(ARC_LEN, g.pos + half)]);
  }
  cuts.sort((a, b) => a[0] - b[0]);

  const spans: [number, number][] = [];
  let cursor = 0;
  for (const [a, b] of cuts) {
    if (a > cursor) spans.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < ARC_LEN) spans.push([cursor, ARC_LEN]);

  const fillLen = ARC_LEN * fill * copperDraw;

  // Glass covers every solid span in full; copper paints on top of it up to the
  // fill front. No seam to manage between the two layers.
  const glassParts: string[] = [];
  const copperParts: string[] = [];
  for (const [a, b] of spans) {
    const visibleEnd = Math.min(b, drawLen);
    if (visibleEnd - a < 0.6) continue;
    glassParts.push(outlinePath(a, visibleEnd));
    const cEnd = Math.min(visibleEnd, fillLen);
    if (cEnd - a > 0.6) copperParts.push(outlinePath(a, cEnd, true, cEnd >= visibleEnd - 0.01));
  }

  const glassClip = glassParts.join(' ');
  const copperClip = copperParts.join(' ');

  const copperTop = overCeiling ? '#F2E9E1' : '#E3B08D';

  /* ── the caps facing each open gap ── */
  const capMarks = gaps
    .filter((g) => (closure.current[g.id] ?? 0) < 0.999)
    .flatMap((g) => {
      const half = GAP_HALF * (1 - (closure.current[g.id] ?? 0));
      return [-1, 1].map((side) => {
        const s = g.pos + side * half;
        const [x, y] = pt(degAt(s), R);
        return { key: g.id + side, x, y, state: g.state, id: g.id };
      });
    });

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        zIndex: 2,
        width: VW,
        height: VH,
        left: '50%',
        marginLeft: -VW / 2,
        bottom: 'env(safe-area-inset-bottom)',
      }}
      aria-hidden
    >
      {/* Empty segments — real frosted glass. The band is a clip region, so the
          backdrop-filter samples whatever content is scrolling underneath. */}
      {glassClip && (
        <div
          className="absolute inset-0"
          style={{
            clipPath: `path('${glassClip}')`,
            WebkitClipPath: `path('${glassClip}')`,
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            background: 'rgba(255,255,255,0.055)',
          }}
        />
      )}

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          {/* across the stroke: cool shadow inside → lit rose outside */}
          <radialGradient id="cuAcross" gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={RO}>
            <stop offset="0" stopColor="#4A4238" />
            <stop offset={RI / RO} stopColor="#4A4238" />
            <stop offset="0.815" stopColor="#6E3D25" />
            <stop offset="0.87" stopColor="#B8784F" />
            {/* the body holds copper across most of the band — a wide light
                ramp is what makes metal read as pale plastic */}
            <stop offset="0.955" stopColor="#B8784F" />
            <stop offset="0.985" stopColor={copperTop} />
            <stop offset="1" stopColor="#F5E6DA" />
          </radialGradient>

          {/* along the arc: brightest at 10 o'clock, falling off toward both ends */}
          <linearGradient id="cuAlong" gradientUnits="userSpaceOnUse" x1="120" y1="600" x2="300" y2="800">
            <stop offset="0" stopColor="#F5E6DA" stopOpacity="0.20" />
            <stop offset="0.18" stopColor="#F5E6DA" stopOpacity="0.08" />
            <stop offset="0.42" stopColor="#F5E6DA" stopOpacity="0" />
            <stop offset="1" stopColor="#4A4238" stopOpacity="0.5" />
          </linearGradient>

          {/* specular that rides the outer curve only */}
          <linearGradient id="cuSpec" gradientUnits="userSpaceOnUse" x1="40" y1="620" x2="360" y2="790">
            <stop offset="0" stopColor="#F5E6DA" stopOpacity="0" />
            <stop offset="0.22" stopColor="#F5E6DA" stopOpacity="0.5" />
            <stop offset="0.55" stopColor="#F5E6DA" stopOpacity="0.14" />
            <stop offset="1" stopColor="#F5E6DA" stopOpacity="0" />
          </linearGradient>

          <clipPath id="cuClip" clipPathUnits="userSpaceOnUse">
            {copperClip ? <path d={copperClip} /> : <path d="M0 0Z" />}
          </clipPath>
          <clipPath id="glClip" clipPathUnits="userSpaceOnUse">
            {glassClip ? <path d={glassClip} /> : <path d="M0 0Z" />}
          </clipPath>
        </defs>

        {/* copper: two crossed gradients, never a flat fill */}
        <g clipPath="url(#cuClip)">
          <rect x="0" y="0" width={VW} height={VH} fill="url(#cuAcross)" />
          <rect x="0" y="0" width={VW} height={VH} fill="url(#cuAlong)" />
        </g>

        {/* glass specular — outer curve only */}
        <g clipPath="url(#glClip)">
          <path
            d={strokePath(0, ARC_LEN)}
            stroke="url(#cuSpec)"
            strokeWidth="1.5"
            fill="none"
            style={{ transform: `scale(${(RO - 0.9) / R})`, transformOrigin: `${CX}px ${CY}px` }}
          />
        </g>

        {/* facing caps: missed dim to 30%, due breathe */}
        {capMarks.map((c) => (
          <circle
            key={c.key}
            cx={c.x}
            cy={c.y}
            r={CAP - 1}
            fill="#F5E6DA"
            className={c.state === 'due' && !reducedMotion ? 'cap-breathe' : undefined}
            style={{
              opacity: c.state === 'missed' ? 0.03 : c.state === 'due' ? 0.055 : 0,
              transformOrigin: `${c.x}px ${c.y}px`,
              transform: pressed === c.id ? 'scale(1.12)' : 'scale(1)',
              transition: reducedMotion ? 'none' : 'transform 60ms ease-out',
            }}
          />
        ))}

        {/* the seam flashes once, where the gap sealed */}
        {gaps.map((g) => {
          const t = flash.current[g.id];
          if (t === undefined) return null;
          const age = performance.now() - t;
          if (age > 180) return null;
          const [x, y] = pt(degAt(g.pos), R);
          return (
            <circle key={'f' + g.id} cx={x} cy={y} r={CAP} fill="#F2E9E1" opacity={(1 - age / 180) * 0.9} />
          );
        })}
      </svg>

      {/* Inside the dome: the numeral and its label. Nothing else. */}
      <div className="absolute inset-x-0 text-center" style={{ top: 656 }}>
        <div className="card-hero" style={{ fontSize: 44 }}>
          {takenCount}
        </div>
        <div className="label mt-2 text-t2">of {totalDoses} taken</div>
      </div>
    </div>
  );
}
