import { Capacitor } from '@capacitor/core';

/**
 * TEMPORARY — remove before submission.
 *
 * A way to open the catch-up screen on demand, because it is otherwise only
 * reachable by leaving the app closed across a scheduled dose, which makes it
 * the one screen nobody reviews.
 *
 * Dev builds only. `import.meta.env.DEV` is false in `npm run build`, so the
 * row that calls this is not in a production bundle — a debug affordance in a
 * submitted build is a Guideline 2.1 problem.
 *
 * To remove: delete this file, the `previewCatchUp` row in `screens/You.tsx`,
 * and the subscription in `CatchUpGate`. Three places, listed in BLOCKED.md.
 */

/**
 * On in a dev server and in the browser build; never in the iOS app.
 *
 * This was `import.meta.env.DEV` alone, which Vite substitutes with the
 * literal `false` at build time so the minifier deletes the row outright.
 * That was the stronger guarantee and it is why the row could not be found:
 * every build deployed for testing is a production build, so the only place
 * it has ever appeared is a local dev server.
 *
 * `!isNativePlatform()` is a runtime check, which is weaker — the string is in
 * the bundle now, where before it was provably absent. It is still airtight
 * for the thing that matters: a submitted binary runs inside the native
 * WebView, where this is false, and there is no setting or URL that changes
 * that. The compile-time half is kept so a dev server does not depend on it.
 *
 * Written as `import.meta.env.DEV` exactly, never `import.meta.env?.DEV` —
 * the optional chain defeats the substitution, and that is how this row
 * shipped in a production bundle once already.
 */
export const PREVIEW_ENABLED = import.meta.env.DEV || !Capacitor.isNativePlatform();

type Listener = () => void;
const listeners = new Set<Listener>();

/** Ask whatever is listening to open the catch-up screen. */
export function requestCatchUpPreview(): void {
  for (const fn of listeners) fn();
}

export function onCatchUpPreview(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
