/**
 * The signature element. A stroked path with round caps — not a ring segment,
 * not a border-radius trick.
 *
 * BUILD.md estimates "roughly 94° on a 220 radius, about 322 wide". Fitting a
 * circle to the exported artwork gives a flatter, wider curve: chord 368,
 * sagitta 60.8, therefore R = 308.7 and a 73.2° sweep. §3 makes the screens the
 * source of truth and the brief's own numbers are hedged, so these are measured.
 */
const R = 308.7;
const SWEEP = 73.2;
const HALF = SWEEP / 2;
const STROKE = 9;

const W = 368;
const CX = W / 2;
const CY = R + STROKE / 2;
/** apex sits at STROKE/2; the ends fall to the sagitta below it */
const H = Math.ceil(R * (1 - Math.cos((HALF * Math.PI) / 180)) + STROKE);

/** Round caps add STROKE/2 at each end, so cut 20 to see about 11. */
const GAP_DEG = 3.7;

/** The visual day window the arc spans — an axis, not app-sourced schedule data. */
const DAY_START = 6.88;
const DAY_END = 22.8;

const toDeg = (hour: number) => -HALF + ((hour - DAY_START) / (DAY_END - DAY_START)) * SWEEP;
const clampHour = (h: number) => Math.min(DAY_END, Math.max(DAY_START, h));

const pt = (deg: number) => {
  const r = (deg * Math.PI) / 180;
  return [CX + R * Math.sin(r), CY - R * Math.cos(r)] as const;
};

const arcPath = (a: number, b: number) => {
  const [x1, y1] = pt(a);
  const [x2, y2] = pt(b);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

export interface ArcDose {
  id: string;
  hour: number;
  taken: boolean;
}

interface Props {
  doses: ArcDose[];
  leftToday: number;
}

export function Arc({ doses, leftToday }: Props) {
  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const sorted = [...doses].sort((a, b) => a.hour - b.hour);

  // the gaps are where the doses fall, cutting the day into segments
  const bounds = [-HALF, ...sorted.map((d) => toDeg(clampHour(d.hour))), HALF];

  const segments: { a: number; b: number; spent: boolean }[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = i === 0 ? bounds[0] : bounds[i] + GAP_DEG / 2;
    const b = i === bounds.length - 2 ? bounds[i + 1] : bounds[i + 1] - GAP_DEG / 2;
    if (b <= a) continue;
    const endHour = i === bounds.length - 2 ? DAY_END : sorted[i].hour;
    segments.push({ a, b, spent: endHour <= nowHour });
  }

  return (
    <div className="arc-wrap">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden>
        {segments.map((s, i) => (
          <path
            key={i}
            d={arcPath(s.a, s.b)}
            stroke={s.spent ? 'var(--purple)' : 'var(--track)'}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
        ))}
      </svg>

      <div className="arc-centre">
        <div className="arc-count">{leftToday}</div>
        <div className="arc-left">left today</div>
      </div>

      <div className="arc-ends">
        <span>7:30 AM</span>
        <span>10:00 PM</span>
      </div>
    </div>
  );
}
