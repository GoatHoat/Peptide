import { useEffect, useRef } from 'react';

/**
 * "You are here" — a hairline through the schedule at the current moment.
 *
 * It sits between rows rather than on top of one, so the list stays readable:
 * the caller splits the doses at `now` and drops this in the gap. Before the
 * first dose of the day it is above everything; after the last, below.
 *
 * It moves on its own because the caller re-renders from the same live clock
 * the header uses (`useNow`), so no reload is needed for it to travel down the
 * list as the day passes.
 */
export function NowMarker({
  time,
  /** scroll it into view once, on first paint of the day's list */
  scrollIntoView = false,
}: {
  time: string;
  scrollIntoView?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!scrollIntoView || done.current || !ref.current) return;
    done.current = true;
    /* A third from the top: enough of what has been missed to see it, more of
       what is still ahead. `auto` rather than `smooth` because this fires on
       first paint and an animated scroll on open reads as the screen twitching
       rather than as a deliberate position. */
    ref.current.scrollIntoView({ block: 'center', behavior: 'auto' });
    const scroller = document.scrollingElement;
    if (scroller) scroller.scrollTop = Math.max(0, scroller.scrollTop - window.innerHeight * 0.17);
  }, [scrollIntoView]);

  return (
    <div className="now-marker" ref={ref} aria-label={`Now, ${time}`}>
      <span className="now-marker-label t-label">You are here</span>
      <span className="now-marker-line" />
      <span className="now-marker-time t-label">{time}</span>
    </div>
  );
}
