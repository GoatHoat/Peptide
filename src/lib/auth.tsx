import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { clearLocalState, migrateAnonState } from './storage';
import { setPurchasesUser } from './revenuecat';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * A Supabase auth error, in words somebody can act on.
 *
 * Some of what comes back is already a sentence — "Invalid login credentials".
 * Plenty is not: "AuthRetryableFetchError", "Database error saving new user",
 * "Failed to fetch". Those were rendered straight into the form, which tells
 * the person nothing they can do and rather a lot about the inside of the app.
 *
 * Matched on substrings rather than on codes because supabase-js does not
 * carry a stable code on every one of these. Anything unmatched falls through
 * to a plain sentence, and the original goes to the console.
 */
function authMessage(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  console.error('auth error', raw);
  const t = raw.toLowerCase();
  if (t.includes('invalid login credentials')) return 'That email and password do not match.';
  if (t.includes('email not confirmed')) return 'Confirm your email address first — check your inbox.';
  if (t.includes('already registered') || t.includes('already been registered'))
    return 'There is already an account with that email. Sign in instead.';
  if (t.includes('password should be')) return 'Passwords need at least six characters.';
  if (t.includes('unable to validate email') || t.includes('invalid email'))
    return 'That does not look like an email address.';
  if (t.includes('rate limit') || t.includes('too many')) return 'Too many attempts. Wait a minute and try again.';
  if (t.includes('failed to fetch') || t.includes('networkerror') || t.includes('retryable'))
    return 'Could not reach the server. Check your connection and try again.';
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      /* RevenueCat is configured here rather than at the paywall, because
         configuring before the session resolves is what creates an anonymous
         user and silently detaches every purchase from its account. */
      void setPurchasesUser(data.session?.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      /* The one place the anonymous hand-off happens. Onboarding's first
         screens run before an account exists, so those answers start under
         `:anon`; doing this per screen is how one screen ends up missing it. */
      if (s?.user?.id) migrateAnonState(s.user.id);
      /* Sign-in identifies, sign-out forgets. Skipping the sign-out half is how
         a second account on one device inherits the first one's subscription. */
      void setPurchasesUser(s?.user?.id ?? null);
      setSession(s);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthState['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? authMessage(error.message, 'Could not sign you in. Try again.') : null };
  };

  const signUp: AuthState['signUp'] = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error)
      return { error: authMessage(error.message, 'Could not create the account. Try again.'), needsConfirmation: false };
    // Supabase returns no session when email confirmation is required.
    return { error: null, needsConfirmation: !data.session };
  };

  const signOut = async () => {
    /* Before the call, while we still know who is leaving. Everything this app
       persists locally is scoped to an account and none of it survives that
       account signing out — otherwise the next person to use the device
       inherits a conversation and a set of onboarding answers. Other accounts'
       keys are untouched. */
    clearLocalState(session?.user?.id ?? null);
    await supabase.auth.signOut();
  };

  /* The "Forgot password?" control was drawn with no handler behind it, which
     is a dead button on the sign-in screen — Guideline 2.1, and the kind a
     reviewer taps first. Supabase mails the link; redirectTo is where it lands,
     and it has to be on the allow-list in the project's auth settings or the
     link silently bounces to the site root. */
  const resetPassword: AuthState['resetPassword'] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    return { error: error ? authMessage(error.message, 'Could not send the reset email. Try again.') : null };
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
