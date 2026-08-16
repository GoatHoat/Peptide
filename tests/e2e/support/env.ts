/**
 * The handful of constants the config and the tests both need.
 *
 * Kept in one file because two of them are derived from a third, and getting
 * that derivation wrong fails silently rather than loudly.
 */

/** Off 5173 so a dev server you already have open is not disturbed. */
export const PORT = 5174;

export const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Same origin as the app, on purpose.
 *
 * Every Supabase call is answered by page.route() before it leaves the browser
 * (see supabaseStub.ts). Pointing the client at another origin would put a CORS
 * preflight in front of each one, and a preflight is not something route() can
 * reliably answer. The /__supabase prefix exists only so the intercepted paths
 * are unmistakable in a trace.
 */
export const SUPABASE_URL = `${BASE_URL}/__supabase`;

/**
 * Not a credential. It is sent as the `apikey` header to an endpoint that is
 * intercepted in the page, so it never reaches a server of any kind. It only
 * has to be non-empty, because that is what `isSupabaseConfigured` checks.
 */
export const SUPABASE_ANON_KEY = 'stub-anon-key';

/**
 * Where supabase-js keeps the session. It derives this itself as
 * `sb-${hostname.split('.')[0]}-auth-token`; mirrored rather than written out,
 * so changing SUPABASE_URL cannot quietly leave a seeded session under a key
 * nothing reads.
 */
export const AUTH_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;

/** `DONE_KEY` in src/onboarding/store.ts. */
export const ONBOARDED_KEY = 'pepstack.onboarded.v1';
