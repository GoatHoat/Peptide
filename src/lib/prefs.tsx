import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import { getProfile, updateProfile, type Profile } from './api';

interface PrefsState {
  profile: Profile | null;
  loading: boolean;
  /** the profile could not be read after three tries; screens may say so */
  error: boolean;
  reduceMotion: boolean;
  largerText: boolean;
  refresh: () => Promise<void>;
  save: (patch: Partial<Profile>) => Promise<void>;
}

const PrefsContext = createContext<PrefsState | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /**
   * The profile row, with the signup race allowed for.
   *
   * `getProfile` throws when the row is not there, and immediately after
   * signing up it sometimes is not: the row is made by a trigger on
   * auth.users, and the client's first read can win that race. This was
   * uncaught, so the rejection went nowhere, `profile` stayed null, and every
   * screen that reads it — You returns null when it is missing — rendered
   * blank with nothing to press and no way to find out why.
   *
   * Three tries over about a second, then it gives up quietly and leaves the
   * screens to their own empty states. `error` is exposed so a screen can say
   * so rather than showing nothing at all.
   */
  const refresh = async () => {
    if (!user) {
      setProfile(null);
      setError(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        setProfile(await getProfile(user.id));
        setLoading(false);
        return;
      } catch (err) {
        if (attempt === 2) {
          console.error('profile load failed', err);
          setError(true);
          setLoading(false);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
      }
    }
  };

  useEffect(() => {
    /* Called rather than awaited, so the catch has to be inside `refresh`.
       It is — this line used to be the whole unhandled rejection. */
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const save = async (patch: Partial<Profile>) => {
    if (!user) return;
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
    try {
      await updateProfile(user.id, patch);
    } catch (err) {
      /* The optimistic update above already moved the switch. Putting it back
         is worse than leaving it: the next load reads the server anyway. */
      console.error('profile save failed', err);
    }
  };

  return (
    <PrefsContext.Provider
      value={{
        profile,
        loading,
        error,
        reduceMotion: profile?.reduce_motion ?? false,
        largerText: profile?.larger_text ?? false,
        refresh,
        save,
      }}
    >
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used within ProfileProvider');
  return ctx;
}
