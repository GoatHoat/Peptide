import { useCallback, useEffect, useMemo, useState } from 'react';
import { FLOW, isSkipped, type Step } from './flow';

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
  /** what they don't eat — the one answer that moves the most products */
  diet: string[];
  /** what has not agreed with them before; picks the form, never drops the nutrient */
  reactions: string[];
  /** free text from "something else". Context for the assistant; never parsed by a rule. */
  reactionsNote: string;
  /** preferred product forms. A soft re-rank, so an empty list is a valid answer. */
  forms: string[];
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
  diet: [],
  reactions: [],
  reactionsNote: '',
  forms: [],
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

/** The answers that also live on `profiles`, in this file's shape. */
export interface PersistedAnswers {
  diet?: string[] | null;
  reactions?: string[] | null;
  reactionsNote?: string | null;
  forms?: string[] | null;
}

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
      diet: Array.isArray(parsed.diet) ? parsed.diet : [],
      reactions: Array.isArray(parsed.reactions) ? parsed.reactions : [],
      reactionsNote: typeof parsed.reactionsNote === 'string' ? parsed.reactionsNote : '',
      forms: Array.isArray(parsed.forms) ? parsed.forms : [],
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

  /**
   * Fill in answers already on the profile row — a returning user on a new
   * device has nothing in localStorage and should not be asked twice. Only
   * fields still empty here are touched, so an answer given on this device
   * always wins over an older one coming back from the server.
   */
  const hydrate = useCallback((p: PersistedAnswers) => {
    setState((s) => ({
      ...s,
      diet: s.diet.length ? s.diet : p.diet ?? [],
      reactions: s.reactions.length ? s.reactions : p.reactions ?? [],
      reactionsNote: s.reactionsNote || p.reactionsNote || '',
      forms: s.forms.length ? s.forms : p.forms ?? [],
    }));
  }, []);

  const goTo = useCallback((step: number) => {
    setState((s) => ({ ...s, step: Math.max(0, Math.min(FLOW.length - 1, step)) }));
  }, []);

  /** Walk over anything the answers so far have made irrelevant. */
  const step_ = useCallback((s: OnboardingState, dir: 1 | -1) => {
    let i = s.step + dir;
    while (i > 0 && i < FLOW.length - 1 && isSkipped(FLOW[i], s.survey)) i += dir;
    return Math.max(0, Math.min(FLOW.length - 1, i));
  }, []);

  const next = useCallback(
    () => setState((s) => ({ ...s, step: step_(s, 1) })),
    [step_],
  );
  const back = useCallback(
    () => setState((s) => ({ ...s, step: step_(s, -1) })),
    [step_],
  );

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
    () => ({ state, step, patch, hydrate, goTo, next, back, reset }),
    [state, step, patch, hydrate, goTo, next, back, reset],
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
