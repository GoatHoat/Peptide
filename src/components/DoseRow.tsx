import { useEffect, useRef, useState } from 'react';
import type { Dose } from '../lib/api';

/** iOS opens a context menu at about half a second. */
const LONG_PRESS_MS = 450;
/** past this the finger is scrolling or swiping pages, not holding */
const MOVE_TOLERANCE = 10;

interface Props {
  dose: Dose;
  onToggle: (dose: Dose) => void;
  onLongPress: (dose: Dose) => void;
  /**
   * Past its time and still unmarked. A copy and state change, never a colour
   * one — nothing here goes red. Somebody who feels told off marks everything
   * taken and the data stops meaning anything.
   */
  missed?: boolean;
}

/**
 * A dose in the day's list.
 *
 * Marking one off used to open the history sheet, which put a Remove From
 * Schedule button in front of someone who had just taken their supplement —
 * a destructive action offered as the response to a routine one. Tapping the
 * circle now only marks it. The sheet is a press-and-hold, the same gesture
 * iOS uses everywhere else for "show me more about this".
 */
export function DoseRow({ dose, missed = false, onToggle, onLongPress }: Props) {
  const timer = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [held, setHeld] = useState(false);

  const cancel = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setHeld(false);
  };

  useEffect(() => cancel, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    origin.current = { x: e.clientX, y: e.clientY };
    cancel();
    setHeld(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHeld(false);
      onLongPress(dose);
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (timer.current === null) return;
    const { x, y } = origin.current;
    if (Math.abs(e.clientX - x) > MOVE_TOLERANCE || Math.abs(e.clientY - y) > MOVE_TOLERANCE) {
      cancel();
    }
  };

  return (
    <div
      className={`dose${dose.taken ? ' taken' : ''}${missed ? ' missed' : ''}${held ? ' holding' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      /* the iOS callout menu would otherwise hijack the same gesture */
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="dose-time">{dose.scheduled_time ? dose.scheduled_time.slice(0, 5) : '—'}</span>
      <span className="dose-body">
        <span className="dose-name" style={{ display: 'block' }}>
          {dose.name}
        </span>
        <span className="dose-amt" style={{ display: 'block' }}>
          {dose.amount}
        </span>
      </span>
      <button
        type="button"
        className={`dose-mark ${dose.taken ? 'on' : 'off'}`}
        aria-label={dose.taken ? `Mark ${dose.name} as not taken` : `Mark ${dose.name} as taken`}
        aria-pressed={dose.taken}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(dose);
        }}
      />
    </div>
  );
}
