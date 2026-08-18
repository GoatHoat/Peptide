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
 * False in any production build, so every branch guarded by it is dropped.
 *
 * `import.meta.env.DEV` written exactly like this and nothing else: Vite
 * substitutes the literal `false` at build time, which lets the minifier fold
 * the branch and delete the row entirely. Writing `import.meta.env?.DEV` —
 * which is what this said first — defeats the substitution, leaves a runtime
 * lookup, and the row stayed in the production bundle. Verified by grepping
 * dist for the row's label.
 */
export const PREVIEW_ENABLED = import.meta.env.DEV;

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
