import { useRef, useState } from 'react';
import { useMotionValue, useMotionValueEvent } from 'framer-motion';
import { Sheet } from '../components/Sheet';
import { SKIP_REASONS, type Dose } from '../lib/api';

/**
 * What you missed while the app was closed.
 *
 * One screen, one card per missed dose — never a queue of screens, because
 * nobody drags a slider six times in a row and anybody asked to would stop
 * reading and start dismissing.
 *
 * THE TONE IS THE FEATURE. No streak break, no red, no "you missed 4 doses this
 * week" as a headline. It exists to collect a reason and move the schedule, not
 * to tell anyone off: somebody who feels judged marks everything taken, and the
 * adherence data — the thing the whole screen is for — stops meaning anything.
 */
export function CatchUp({
  doses,
  onTaken,
  onSkipped,
  onDismiss,
}: {
  doses: Dose[];
  onTaken: (dose: Dose) => Promise<void> | void;
  onSkipped: (dose: Dose, reason: string, note?: string) => Promise<void> | void;
  onDismiss: () => void;
}) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [asking, setAsking] = useState<Dose | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const remaining = doses.filter((d) => !done.has(d.id));

  const markTaken = async (dose: Dose) => {
    setDone((prev) => new Set(prev).add(dose.id));
    await onTaken(dose);
  };

  return (
    <div className={`catchup${doses.length < 3 ? ' short' : ''}`}>
      <div className="catchup-head">
        <h1 className="t-title">While you were away</h1>
        <p className="catchup-sub t-body">
          {doses.length === 1
            ? 'One dose came due. Did you take it?'
            : `${doses.length} doses came due. Did you take them?`}
        </p>
      </div>

      <div className="catchup-list">
        {doses.map((dose) => (
          <CatchUpCard
            key={dose.id}
            dose={dose}
            done={done.has(dose.id)}
            onTaken={() => markTaken(dose)}
            onNotTaken={() => {
              setReason(null);
              setNote('');
              setAsking(dose);
            }}
          />
        ))}
      </div>

      {/* Says the rule rather than relying on the control to imply it. */}
      <p className="catchup-footer t-caption">Nothing is marked until you slide it.</p>

      <button className="catchup-dismiss pressable" onClick={onDismiss}>
        {remaining.length === 0 ? 'Done' : 'Not now'}
      </button>

      <Sheet open={!!asking} onClose={() => setAsking(null)} title="What got in the way?">
        <div className="catchup-reasons">
          {SKIP_REASONS.map((r) => (
            <button
              key={r.id}
              className={`catchup-reason pressable${reason === r.id ? ' on' : ''}`}
              aria-pressed={reason === r.id}
              onClick={() => setReason(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <label className="t-label" htmlFor="skip-note">
            Anything else? (optional)
          </label>
          <textarea
            id="skip-note"
            className="field-input"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button
          className="btn btn-fill pressable"
          style={{ marginTop: 16, width: '100%' }}
          disabled={!reason}
          onClick={async () => {
            const dose = asking;
            if (!dose || !reason) return;
            setAsking(null);
            setDone((prev) => new Set(prev).add(dose.id));
            await onSkipped(dose, reason, note.trim() || undefined);
          }}
        >
          Save
        </button>
      </Sheet>
    </div>
  );
}

/** One missed dose: the slider, and the quiet way out underneath it. */
function CatchUpCard({
  dose,
  done,
  onTaken,
  onNotTaken,
}: {
  dose: Dose;
  done: boolean;
  onTaken: () => void;
  onNotTaken: () => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);

  /**
   * The offset, as a motion value rather than state.
   *
   * `onPointerMove` used to call `setX`, which is a full React render per
   * pointer event — up to 120 a second, re-rendering the whole card subtree
   * each time. That was the largest cause of the lag. App.tsx and Tabs.tsx
   * already drive their drags this way and never call setState mid-gesture;
   * this is the same pattern. React state is kept for the discrete states
   * only: dragging, locked, done.
   */
  const x = useMotionValue(0);
  const [dragging, setDragging] = useState(false);
  const [locked, setLocked] = useState(false);
  /** for the aria value, which does not need to update every frame */
  const [pct, setPct] = useState(0);

  const THUMB = 48;
  const PAD = 4;

  const travel = () => (track.current?.clientWidth ?? 0) - THUMB - PAD * 2;

  /**
   * Paint from the motion value, outside React.
   *
   * `scaleX` on the fill rather than `width`: a width change lays out every
   * frame, a transform composites. Both get `translate3d`/`scaleX` so neither
   * touches layout during a gesture.
   */
  const paint = (next: number) => {
    const t = travel();
    if (fill.current) {
      const scale = t > 0 ? (next + THUMB) / (t + THUMB) : 0;
      fill.current.style.transform = `scaleX(${scale})`;
    }
    if (thumb.current) thumb.current.style.transform = `translate3d(${next}px,0,0)`;
  };

  useMotionValueEvent(x, 'change', paint);

  const finish = () => {
    setLocked(true);
    /* The one moment worth easing, because it is not finger-driven. The class
       is what carries the transition; it is absent during the drag. */
    x.set(travel());
    setPct(1);
    onTaken();
  };

  /* Drag, never tap. The friction is the point: a tap is what produces false
     "yes" answers, and a false yes is worse than no answer at all because it
     silently poisons the adherence data this screen exists to gather. */
  const onPointerDown = (e: React.PointerEvent) => {
    if (locked || done) return;
    /* `e.currentTarget`, not `e.target`. The target is whatever was under the
       finger — usually the thumb, sometimes the label — and capturing to a
       child made the track's move handler behave differently depending on
       where the drag started. The track is always the right element. */
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || locked) return;
    const rect = track.current?.getBoundingClientRect();
    if (!rect) return;
    const t = travel();
    const next = Math.max(0, Math.min(t, e.clientX - rect.left - THUMB / 2));
    x.set(next);
    if (next >= t - 2) finish();
  };

  const release = () => {
    if (locked) return;
    setDragging(false);
    x.set(0);
    setPct(0);
  };

  const complete = locked || done;

  return (
    <div className="catchup-card">
      <div className="catchup-card-head">
        <span className="catchup-name">{dose.name}</span>
        <span className="catchup-due t-caption">
          Due {dose.scheduled_time ? dose.scheduled_time.slice(0, 5) : '—'}
          {dose.amount ? ` · ${dose.amount}` : ''}
        </span>
      </div>

      <div
        className={`catchup-track${complete ? ' done' : ''}`}
        ref={track}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={release}
        onPointerCancel={release}
        role="slider"
        aria-label={`Slide if you took ${dose.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={complete ? 100 : Math.round(pct * 100)}
      >
        {/* `settling` carries the only two transitions: the snap back on
            release and the run to the end on completion. Absent while the
            finger is down, so nothing is easing behind it. */}
        <span
          ref={fill}
          className={`catchup-fill${dragging ? '' : ' settling'}`}
          style={complete ? { transform: 'scaleX(1)' } : undefined}
        />
        <span className="catchup-label">{complete ? 'Taken' : 'Slide if you took it'}</span>
        <span
          ref={thumb}
          className={`catchup-thumb${dragging ? '' : ' settling'}`}
          style={complete ? { transform: `translate3d(${travel()}px,0,0)` } : undefined}
        />
      </div>

      {!complete && (
        <button className="catchup-no pressable" onClick={onNotTaken}>
          I didn&rsquo;t take this
        </button>
      )}
    </div>
  );
}
