import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { clearLocalState, migrateAnonState } from './storage';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      /* The one place the anonymous hand-off happens. Onboarding's first
         screens run before an account exists, so those answers start under
         `:anon`; doing this per screen is how one screen ends up missing it. */
      if (s?.user?.id) migrateAnonState(s.user.id);
      setSession(s);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn: AuthState['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthState['signUp'] = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) return { error: error.message, needsConfirmation: false };
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
    return { error: error?.message ?? null };
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
