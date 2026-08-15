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
export const supabase = createClient(url || 'http://localhost', anonKey || 'not-configured');
