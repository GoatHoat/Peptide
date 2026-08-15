import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import { getProfile, updateProfile, type Profile } from './api';

interface PrefsState {
  profile: Profile | null;
  loading: boolean;
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

  const refresh = async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setProfile(await getProfile(user.id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const save = async (patch: Partial<Profile>) => {
    if (!user) return;
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
    await updateProfile(user.id, patch);
  };

  return (
    <PrefsContext.Provider
      value={{
        profile,
        loading,
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
