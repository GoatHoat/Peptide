/**
 * Persisted local state, scoped to the account that owns it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BUG THIS EXISTS TO CLOSE. Three keys were written to fixed names with no
 * account in them, and sign-out cleared none of them:
 *
 *     pepstack.ask.v1          the whole assistant conversation
 *     pepstack.onboarding.v1   age, sex, diet, reactions, goals, wake and sleep
 *                              times, meal times, and the current stack
 *     pepstack.onboarded.v1    the flag deciding whether onboarding runs at all
 *
 * On a shared device a second account signed in, skipped onboarding entirely
 * because the flag was already set, and landed on a Today screen built from the
 * first person's answers — then asked the assistant a question and saw the first
 * person's conversation above it.
 *
 * Nothing leaked between devices: every table carries user_id under RLS. This
 * was local storage alone, and on a family phone that is worse rather than
 * better, because it is the one device two people actually share.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * TWO DEFENCES, DELIBERATELY. The key is namespaced, and the owner is also
 * written inside the payload and checked on read. Namespacing alone would be
 * undone by anybody renaming a key; the embedded check makes a mismatch
 * impossible to serve whatever the key says.
 */

/** `base:<uuid>`, or `base:anon` before anyone has signed in. */
export const userKey = (base: string, userId: string | null): string =>
  `${base}:${userId ?? 'anon'}`;

/**
 * Every base this module owns.
 *
 * One array, iterated by `clearLocalState`, so a key added later is cleared by
 * construction rather than by somebody remembering to add it in two places.
 */
export const KEY_BASES = [
  'pepstack.ask.v1',
  'pepstack.onboarding.v1',
  'pepstack.onboarded.v1',
  /* Today's doses, so the screen renders on a plane or in a lift rather than
     showing a spinner that never resolves. Cleared with everything else on
     sign-out — it is a list of what somebody takes. */
  'pepstack.today.v1',
] as const;

/**
 * NOT scoped, on purpose: `pepstack.discover.tab` in components/Tabs.tsx is
 * which tab was last open. That is UI state, not personal data, and scoping it
 * would mean a second account lands on a tab it never chose for no benefit.
 * Left global deliberately — please do not "fix" it.
 */

interface Envelope<T> {
  /** who this belongs to; `null` is the pre-sign-in record */
  userId: string | null;
  savedAt: number;
  data: T;
}

const isEnvelope = (v: unknown): v is Envelope<unknown> =>
  typeof v === 'object' && v !== null && 'data' in v && 'userId' in v;

/**
 * Reads state belonging to `userId`, or `fallback` if there is none.
 *
 * Returns the fallback rather than throwing on anything unexpected: a corrupt
 * or foreign record must read as "nothing saved", never as somebody else's.
 */
export function readScoped<T>(base: string, userId: string | null, fallback: T): T {
  try {
    const raw = localStorage.getItem(userKey(base, userId));
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!isEnvelope(parsed)) return fallback;
    // the belt-and-braces half: the key said one thing, the payload must agree
    if (parsed.userId !== userId) return fallback;
    return parsed.data as T;
  } catch {
    return fallback;
  }
}

export function writeScoped<T>(base: string, userId: string | null, data: T): void {
  try {
    const envelope: Envelope<T> = { userId, savedAt: Date.now(), data };
    localStorage.setItem(userKey(base, userId), JSON.stringify(envelope));
  } catch {
    /* Private mode, or the quota is full. Losing a cached thread is not worth
       breaking the screen that was trying to save it. */
  }
}

export function removeScoped(base: string, userId: string | null): void {
  try {
    localStorage.removeItem(userKey(base, userId));
  } catch {
    /* see writeScoped */
  }
}

/**
 * Removes every key this module owns for one account.
 *
 * Called on sign-out and after the account is deleted. Deleting the server-side
 * account and leaving the person's whole profile sitting in local storage on the
 * device rather defeats the point of deleting it.
 *
 * Other accounts' keys are untouched: on a shared device, one person signing out
 * must not wipe the other's saved answers.
 */
export function clearLocalState(userId: string | null): void {
  for (const base of KEY_BASES) removeScoped(base, userId);
}

/**
 * Moves the pre-sign-in record onto the account that just appeared.
 *
 * The onboarding flow runs welcome and the auth form before a user exists, so
 * those first answers legitimately start under `:anon`. This is the one place
 * that hand-off happens — doing it per screen is how one screen ends up missing
 * it.
 *
 * The anonymous copy is removed afterwards. Leaving it behind would mean the
 * next person to open the app on this device inherits it, which is the same bug
 * in a different key.
 */
export function migrateAnonState(userId: string): void {
  if (!userId) return;
  for (const base of KEY_BASES) {
    try {
      const raw = localStorage.getItem(userKey(base, null));
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      const data = isEnvelope(parsed) ? parsed.data : parsed;
      /* Never overwrite what the account already has. Somebody signing in on a
         device where they had half-filled an anonymous flow should keep the
         answers tied to their account, not the ones tied to the browser. */
      if (localStorage.getItem(userKey(base, userId)) === null) {
        writeScoped(base, userId, data);
      }
      localStorage.removeItem(userKey(base, null));
    } catch {
      /* a record that cannot be read is a record not worth migrating */
    }
  }
}
