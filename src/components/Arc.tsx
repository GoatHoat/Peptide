import { useEffect, useState } from 'react';

/**
 * The day as one stroked path, cut into a segment per dose.
 *
 * Geometry is measured off the exported artwork: chord 368, sagitta 60.8,
 * therefore R = 308.7 across a 73.2° sweep.
 */
const R = 308.7;
const SWEEP = 73.2;
const HALF = SWEEP / 2;
const STROKE = 9;

const W = 368;
const CX = W / 2;
const CY = R + STROKE / 2;
const H = Math.ceil(R * (1 - Math.cos((HALF * Math.PI) / 180)) + STROKE);

/** Round caps add STROKE/2 at each end, so cut 20° of arc to see about 11px. */
const GAP_DEG = 3.7;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const pt = (deg: number) => {
  const r = (deg * Math.PI) / 180;
  return [CX + R * Math.sin(r), CY - R * Math.cos(r)] as const;
};

const arcPath = (a: number, b: number) => {
  const [x1, y1] = pt(a);
  const [x2, y2] = pt(b);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

const fmtHour = (h: number) => {
  const hh = Math.floor(((h % 24) + 24) % 24);
  const mm = Math.round((h - Math.floor(h)) * 60);
  const period = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
};

export interface ArcDose {
  id: string;
  hour: number;
  taken: boolean;
}

interface Props {
  doses: ArcDose[];
  leftToday: number;
  /** the waking day, in hours. Ends at the user's bedtime. */
  dayStart?: number;
  dayEnd?: number;
}

/**
 * One segment per dose, so the dividers only appear once there is something to
 * divide: a single dose draws one unbroken line, two draw one gap, three draw
 * two. The dividers sit at the times of the second dose onward, which puts a
 * 10pm dose's divider over on the right where 10pm falls.
 *
 * Doses sharing a time share a segment — three things taken at 8am is one
 * boundary, not three.
 */
function buildSegments(doses: ArcDose[], dayStart: number, dayEnd: number) {
  const span = Math.max(0.01, dayEnd - dayStart);
  const toDeg = (hour: number) => -HALF + ((clamp(hour, dayStart, dayEnd) - dayStart) / span) * SWEEP;

  // group by time so simultaneous doses are one boundary and one segment
  const byTime = new Map<number, ArcDose[]>();
  for (const d of doses) {
    const key = Math.round(clamp(d.hour, dayStart, dayEnd) * 60) / 60;
    (byTime.get(key) ?? byTime.set(key, []).get(key)!).push(d);
  }
  const times = [...byTime.keys()].sort((a, b) => a - b);

  if (times.length === 0) {
    return [{ key: 'empty', a: -HALF, b: HALF, taken: false }];
  }

  // boundaries at the 2nd..Nth time — N times produce N-1 dividers
  const bounds = [-HALF, ...times.slice(1).map(toDeg), HALF];

  return times.map((t, i) => {
    const group = byTime.get(t)!;
    const rawA = bounds[i];
    const rawB = bounds[i + 1];
    // half a gap is trimmed from each interior edge; the outer ends stay put
    const a = i === 0 ? rawA : rawA + GAP_DEG / 2;
    const b = i === times.length - 1 ? rawB : rawB - GAP_DEG / 2;
    return {
      key: group.map((d) => d.id).join('+'),
      a,
      b: Math.max(a + 0.4, b),
      taken: group.every((d) => d.taken),
    };
  });
}

/**
 * Draws its segment twice — the unfilled track, and the purple on top revealed
 * by a dash offset so it wipes on from the left. pathLength normalises the
 * dash to 0..1 so it works whatever the segment's real length is.
 */
function Segment({ d, taken }: { d: string; taken: boolean }) {
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (!taken) {
      setFilled(false);
      return;
    }
    // one frame unfilled so the transition has somewhere to travel from
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, [taken]);

  return (
    <>
      <path d={d} stroke="var(--track)" strokeWidth={STROKE} strokeLinecap="round" fill="none" />
      <path
        className="arc-fill"
        d={d}
        stroke="var(--purple)"
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={filled ? 0 : 1}
        opacity={taken ? 1 : 0}
      />
    </>
  );
}

export function Arc({ doses, leftToday, dayStart = 7, dayEnd = 23 }: Props) {
  const segments = buildSegments(doses, dayStart, dayEnd);

  return (
    <div className="arc-wrap">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden>
        {segments.map((s) => (
          <Segment key={s.key} d={arcPath(s.a, s.b)} taken={s.taken} />
        ))}
      </svg>

      <div className="arc-centre">
        <div className="arc-count">{leftToday}</div>
        <div className="arc-left">left today</div>
      </div>

      <div className="arc-ends">
        <span>{fmtHour(dayStart)}</span>
        <span>{fmtHour(dayEnd)}</span>
      </div>
    </div>
  );
}
