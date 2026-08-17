import { useAuth } from '../lib/auth';
import { readScoped, writeScoped, removeScoped } from '../lib/storage';
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
  /** the ids start at q2 on purpose — see FLOW, where q1 was cut */
  survey: { q2: string | null; q3: string | null };
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
  /** how many they say they take, before the list. Sizes the input that follows. */
  stackCount: number | null;
  currentStack: string[];
  goals: string[];
  /** goals in the order that matters to them, most first. Empty means no ranking given. */
  goalPriority: string[];
  /** days a week they chose to aim for. The target the adherence view measures against. */
  commitmentDays: number;
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
  survey: { q2: null, q3: null },
  diet: [],
  reactions: [],
  reactionsNote: '',
  forms: [],
  wake: '07:00',
  sleep: '23:00',
  meals: DEFAULT_MEALS.map((m) => ({ ...m })),
  stackCount: null,
  currentStack: [],
  goals: [],
  goalPriority: [],
  /* Five, not seven. A default nobody chose should be the one somebody is most
     likely to keep, and a target you miss twice in week one is a target you
     stop looking at. */
  commitmentDays: 5,
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

/**
 * Scoped to the account. This held age, sex, diet, reactions, goals, wake and
 * sleep times, meal times and the current stack under one fixed key, so a
 * second person signing in on the same device inherited all of it. The first
 * screens legitimately run before a user exists and start under `:anon`, and
 * lib/storage.ts migrates that onto the account at sign-in.
 */
const KEY = 'pepstack.onboarding.v1';

/**
 * Persisted on every change rather than at the end. A backgrounded tab on iOS
 * can be discarded without warning, and losing eleven screens of answers is the
 * kind of thing people do not come back from.
 */
function load(userId: string | null): OnboardingState {
  try {
    const parsed = readScoped<Partial<OnboardingState> | null>(KEY, userId, null);
    if (!parsed) return initialState();
    // merge over defaults so a store written by an older build still opens
    const base = initialState();
    const merged: OnboardingState = {
      ...base,
      ...parsed,
      auth: { ...base.auth, ...parsed.auth },
      profile: { ...base.profile, ...parsed.profile },
      /* Named rather than spread, so a store written before q1 was cut does
         not carry its answer forward into a shape that no longer has it. */
      survey: { q2: parsed.survey?.q2 ?? null, q3: parsed.survey?.q3 ?? null },
      diet: Array.isArray(parsed.diet) ? parsed.diet : [],
      reactions: Array.isArray(parsed.reactions) ? parsed.reactions : [],
      reactionsNote: typeof parsed.reactionsNote === 'string' ? parsed.reactionsNote : '',
      forms: Array.isArray(parsed.forms) ? parsed.forms : [],
      meals: Array.isArray(parsed.meals) ? parsed.meals : base.meals,
      currentStack: Array.isArray(parsed.currentStack) ? parsed.currentStack : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      stackCount: typeof parsed.stackCount === 'number' ? parsed.stackCount : null,
      goalPriority: Array.isArray(parsed.goalPriority) ? parsed.goalPriority : [],
      commitmentDays: typeof parsed.commitmentDays === 'number' ? parsed.commitmentDays : 5,
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
  /* The account these answers belong to. Null through the first screens, which
     run before anyone has signed in — those legitimately save under `:anon` and
     are migrated onto the account at sign-in by lib/storage. */
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [state, setState] = useState<OnboardingState>(() => load(null));
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  /* Re-read when the account resolves or changes. Reading once on mount would
     load the anonymous record and then write it back under whichever key
     appeared later, which is the leak in a slower form. */
  useEffect(() => {
    setState(load(userId));
    setLoadedFor(userId ?? 'anon');
  }, [userId]);

  useEffect(() => {
    if (loadedFor === null) return;
    writeScoped(KEY, userId, state);
  }, [state, userId, loadedFor]);

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
    while (
      i > 0 &&
      i < FLOW.length - 1 &&
      isSkipped(FLOW[i], {
        ...s.survey,
        subscribed: s.subscribed,
        pickedCount: s.recommendations.filter((r) => r.selected).length,
        goalCount: s.goals.length,
      })
    )
      i += dir;
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
    removeScoped(KEY, userId);
    setState(initialState());
  }, [userId]);

  const step: Step = FLOW[state.step];

  return useMemo(
    () => ({ state, step, patch, hydrate, goTo, next, back, reset }),
    [state, step, patch, hydrate, goTo, next, back, reset],
  );
}

export type OnboardingApi = ReturnType<typeof useOnboardingStore>;

/** Has the user finished onboarding at least once on this device? */
export const DONE_KEY = 'pepstack.onboarded.v1';

/**
 * Whether this ACCOUNT has finished onboarding — not this browser.
 *
 * It was one unscoped key, so completing onboarding once meant every account
 * that ever signed in on the device skipped it and landed on a Today screen
 * built from the first person's answers.
 *
 * This is the local cache. `profiles.onboarded_at` is the source of truth, so
 * signing in on a new phone does not re-run a flow the account has finished;
 * see migration 0035 and App.tsx.
 */
export const markOnboarded = (userId: string | null) => writeScoped(DONE_KEY, userId, true);
export const hasOnboarded = (userId: string | null) =>
  readScoped<boolean>(DONE_KEY, userId, false) === true;
