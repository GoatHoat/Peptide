import { useCallback, useEffect, useMemo, useState } from 'react';
import { FLOW, type Step } from './flow';

export interface Meal {
  id: string;
  name: string;
  time: string;
}

export interface OnboardingState {
  step: number;
  auth: { userId: string | null; email: string | null };
  profile: { age: number | null; gender: 'm' | 'f' | 'na' | null };
  survey: { q1: string | null; q2: string | null; q3: string | null };
  wake: string;
  sleep: string;
  meals: Meal[];
  currentStack: string[];
  goals: string[];
  notificationsGranted: boolean;
  subscribed: boolean;
  recommendations: { id: string; selected: boolean }[];
  schedule: { id: string; time: string }[];
}

export const DEFAULT_MEALS: Meal[] = [
  { id: 'breakfast', name: 'Breakfast', time: '08:00' },
  { id: 'lunch', name: 'Lunch', time: '13:00' },
  { id: 'dinner', name: 'Dinner', time: '19:00' },
];

export const initialState = (): OnboardingState => ({
  step: 0,
  auth: { userId: null, email: null },
  profile: { age: 25, gender: null },
  survey: { q1: null, q2: null, q3: null },
  wake: '07:00',
  sleep: '23:00',
  meals: DEFAULT_MEALS.map((m) => ({ ...m })),
  currentStack: [],
  goals: [],
  notificationsGranted: false,
  subscribed: false,
  recommendations: [],
  schedule: [],
});

const KEY = 'pepstack.onboarding.v1';

/**
 * Persisted on every change rather than at the end. A backgrounded tab on iOS
 * can be discarded without warning, and losing eleven screens of answers is the
 * kind of thing people do not come back from.
 */
function load(): OnboardingState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    // merge over defaults so a store written by an older build still opens
    const base = initialState();
    const merged: OnboardingState = {
      ...base,
      ...parsed,
      auth: { ...base.auth, ...parsed.auth },
      profile: { ...base.profile, ...parsed.profile },
      survey: { ...base.survey, ...parsed.survey },
      meals: Array.isArray(parsed.meals) ? parsed.meals : base.meals,
      currentStack: Array.isArray(parsed.currentStack) ? parsed.currentStack : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      schedule: Array.isArray(parsed.schedule) ? parsed.schedule : [],
    };
    // a step index from a longer or reordered FLOW must not land out of bounds
    merged.step = Math.max(0, Math.min(FLOW.length - 1, Number(merged.step) || 0));
    return merged;
  } catch {
    return initialState();
  }
}

export function useOnboardingStore() {
  const [state, setState] = useState<OnboardingState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* private mode, quota — losing persistence is survivable, crashing is not */
    }
  }, [state]);

  const patch = useCallback((p: Partial<OnboardingState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  const goTo = useCallback((step: number) => {
    setState((s) => ({ ...s, step: Math.max(0, Math.min(FLOW.length - 1, step)) }));
  }, []);

  const next = useCallback(() => setState((s) => ({ ...s, step: Math.min(FLOW.length - 1, s.step + 1) })), []);
  const back = useCallback(() => setState((s) => ({ ...s, step: Math.max(0, s.step - 1) })), []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setState(initialState());
  }, []);

  const step: Step = FLOW[state.step];

  return useMemo(
    () => ({ state, step, patch, goTo, next, back, reset }),
    [state, step, patch, goTo, next, back, reset],
  );
}

export type OnboardingApi = ReturnType<typeof useOnboardingStore>;

/** Has the user finished onboarding at least once on this device? */
export const DONE_KEY = 'pepstack.onboarded.v1';
export const markOnboarded = () => {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    /* ignore */
  }
};
export const hasOnboarded = () => {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
};
