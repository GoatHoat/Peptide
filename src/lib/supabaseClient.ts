import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Whether the two env vars are present. This module used to `throw` here when
 * they were not, which is a boot-time crash rather than a failure: this file is
 * imported by lib/auth, which is imported by main.tsx, so the throw ran during
 * module evaluation and createRoot().render() was never reached. The result was
 * an empty #root and a white page with no visible explanation.
 *
 * main.tsx now checks this flag and renders a setup screen instead.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * The placeholders keep createClient from throwing on its own URL validation
 * when the vars are absent. Nothing ever calls through them — when
 * isSupabaseConfigured is false the app renders <SetupNeeded /> and no screen
 * that talks to Supabase is mounted.
 */
const baseUrl = url || 'http://localhost';

/**
 * The anon key, which every Supabase request carries in a header of its own.
 * It is VITE_-prefixed and therefore already in the bundle and public by
 * design; the repo holds no value for it. See the Secrets section of CLAUDE.md.
 */
export const anonApiKey = anonKey || 'not-configured';

export const supabase = createClient(baseUrl, anonApiKey);

/**
 * Where an edge function lives on this project.
 *
 * `ask` is called with a plain fetch rather than `supabase.functions.invoke`,
 * because the screen renders the function's own error codes and `invoke` hands
 * back a Response to unwrap instead of a body.
 */
export function functionUrl(name: string): string {
  return `${baseUrl}/functions/v1/${name}`;
}
