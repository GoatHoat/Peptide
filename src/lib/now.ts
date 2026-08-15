import { useEffect, useState } from 'react';
import { toISODate } from './date';

/**
 * The current moment, kept live.
 *
 * `new Date()` called during render is correct only for the instant the screen
 * mounted. Left open, the app drifted: the arc's "now" froze where it was, and
 * a session running past midnight still showed yesterday's date and yesterday's
 * doses. Phones make that the normal case, not the edge case — the app is
 * backgrounded far more often than it is closed.
 *
 * All of this is local to the device. Date and getHours() read the OS clock and
 * zone, and toISODate is built from getFullYear/getMonth/getDate rather than
 * toISOString, which would silently shift the day for anyone west of UTC.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () =>
      setNow((prev) => {
        const next = new Date();
        // only re-render when the displayed minute actually changes
        return Math.floor(prev.getTime() / 60_000) === Math.floor(next.getTime() / 60_000)
          ? prev
          : next;
      });

    const id = setInterval(tick, intervalMs);
    // coming back from the background can skip hours — catch up immediately
    const onVisible = () => document.visibilityState === 'visible' && setNow(new Date());
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [intervalMs]);

  return now;
}

/**
 * Today's date in the device's own zone, changing identity only when the
 * calendar day does — so effects keyed on it fire once at midnight rather than
 * on every tick.
 */
export function useTodayISO(): string {
  const now = useNow();
  return toISODate(now);
}
