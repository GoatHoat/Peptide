/**
 * Whether animation should be suppressed, asked at the moment of animating.
 *
 * Read from the document rather than from React state on purpose. These are
 * called inside pointer handlers and `animate()` calls, which run outside
 * render, so a hook value would be a frame stale and would need every one of
 * those components to re-render when the switch flips. The class is written
 * once by ProfileProvider; this reads it.
 *
 * Both sources count. The iOS system setting has always driven the CSS via
 * `@media (prefers-reduced-motion: reduce)` but never reached framer-motion,
 * so a phone with Reduce Motion on still got the full spring on every tab
 * change.
 */
export function motionReduced(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.documentElement.classList.contains('reduce-motion')) return true;
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/**
 * The given transition, or an instant one when motion is reduced.
 *
 * `duration: 0` rather than skipping `animate()` altogether so the value still
 * lands through the same code path — every `onComplete` and every derived
 * motion value behaves exactly as it does normally, just with no frames in
 * between. Dropping the call instead is how a pager ends up at the right index
 * with the track still parked at the old offset.
 */
export function withMotion<T extends object>(transition: T): T {
  /* Cast rather than a `T | { duration: 0 }` return type: framer-motion's
     `animate` is heavily overloaded and a union argument makes overload
     resolution fail at every call site. The runtime value is a valid
     Transition either way. */
  return (motionReduced() ? { duration: 0 } : transition) as T;
}
