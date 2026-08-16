import { useEffect, useState } from 'react';

/**
 * The day as one stroked path, cut into a segment per dose.
 *
 * The radius is derived from the box rather than measured off the artwork. A
 * hardcoded R = 308.7 put the endpoints at x = -0.05 and 368.05, and a round
 * cap adds another STROKE/2 past each one, so both caps sat outside a 368-wide
 * viewBox and were sliced flat. Solving for R instead keeps the chord plus one
 * cap at each end inside W exactly: endpoints at 4.5 and 363.5, caps at 0 and
 * 368. Costs 1.4px of sagitta, which nobody can see.
 */
const SWEEP = 73.2;
const HALF = SWEEP / 2;
const STROKE = 9;
/** how far a round cap paints past the endpoint it sits on */
const CAP = STROKE / 2;

const RAD = Math.PI / 180;
const W = 368;
const R = (W / 2 - CAP) / Math.sin(HALF * RAD);
const CX = W / 2;
const CY = R + CAP;
/** sagitta plus a cap above the apex and below the ends */
const H = Math.ceil(R * (1 - Math.cos(HALF * RAD)) + STROKE);

/**
 * 3.7° is about 19px of arc at this radius, and the round cap on each side of
 * the gap paints 4.5px back into it, so what shows is about 11px.
 */
const GAP_DEG = 3.7;

/** the viewBox, and what the stroke actually paints inside it, caps included */
export const ARC_BOX = { w: W, h: H };
export const ARC_PAINTED = {
  left: CX - R * Math.sin(HALF * RAD) - CAP,
  right: CX + R * Math.sin(HALF * RAD) + CAP,
  top: CY - R - CAP,
  bottom: CY - R * Math.cos(HALF * RAD) + CAP,
};

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

export interface ArcWindow {
  /** hours, the left-hand end of the arc */
  start: number;
  /** hours, the right-hand end */
  end: number;
}

/**
 * What the arc spans: the waking day, widened to hold anything outside it.
 *
 * It used to clamp instead, which drew a 6am dose on top of the 7am one and
 * labelled the end 7am — a dose shown at a time it is not, on the one screen
 * read every morning. Widening moves the label with the dose.
 *
 * A bedtime past midnight is the same defect with a worse symptom: `dayEnd` of
 * 00:30 is a smaller number than a `dayStart` of 07:00, so the span went
 * negative and every dose of the day clamped onto a single point and drew as
 * one segment. The arc holds one calendar day — the list underneath it sorts
 * by the clock, so midnight is the end of the day and not a point midway
 * along it — so a day that runs past midnight is drawn as ending there.
 *
 * `end` is therefore always greater than `start`: an unwrapped `dayEnd` is
 * greater by definition, a wrapped one becomes 24, and no clock hour reaches
 * either.
 */
export function windowFor(doses: ArcDose[], dayStart: number, dayEnd: number): ArcWindow {
  const hours = doses.map((d) => d.hour).filter((h) => Number.isFinite(h));
  return {
    start: Math.min(dayStart, ...hours),
    end: Math.max(dayEnd <= dayStart ? 24 : dayEnd, ...hours),
  };
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
function buildSegments(doses: ArcDose[], win: ArcWindow) {
  const span = Math.max(0.01, win.end - win.start);
  // the window already covers every dose; this only keeps a NaN off the path
  const toDeg = (hour: number) => -HALF + ((clamp(hour, win.start, win.end) - win.start) / span) * SWEEP;

  // group by time so simultaneous doses are one boundary and one segment
  const byTime = new Map<number, ArcDose[]>();
  for (const d of doses) {
    const key = Math.round(clamp(d.hour, win.start, win.end) * 60) / 60;
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
  const win = windowFor(doses, dayStart, dayEnd);
  const segments = buildSegments(doses, win);

  return (
    <div className="arc-wrap">
      {/* scales to the screen: at a fixed 368 the right-hand end sits past the
          edge of every phone narrower than the 402 the artwork was drawn for */}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden>
        {segments.map((s) => (
          <Segment key={s.key} d={arcPath(s.a, s.b)} taken={s.taken} />
        ))}
      </svg>

      <div className="arc-centre">
        <div className="arc-count">{leftToday}</div>
        <div className="arc-left">left today</div>
      </div>

      {/* the window, not the profile — an out-of-window dose moved the end,
          and a label still reading 7:00 AM would be the same lie the clamp was */}
      <div className="arc-ends">
        <span>{fmtHour(win.start)}</span>
        <span>{fmtHour(win.end)}</span>
      </div>
    </div>
  );
}
