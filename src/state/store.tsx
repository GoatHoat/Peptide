import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { BUILD } from '../data/mock';

export type Screen =
  | 'ob1'
  | 'ob2'
  | 'ob3'
  | 'ob4'
  | 'ob5'
  | 'ob5b'
  | 'ob6'
  | 'ob6b'
  | 'ob7'
  | 'ob8'
  | 'ob9'
  | 'ob10'
  | 'ob11'
  | 'ob12'
  | 'gate'
  | 'today'
  | 'stack'
  | 'item'
  | 'analysis'
  | 'profile'
  | 'yir'
  | 'st_rt'
  | 'st_ax3';

export interface AppState {
  screen: Screen;

  // Dev toolbar toggles
  reduceMotion: boolean;
  lowPower: boolean;
  alerts: boolean;
  emptyStack: boolean;
  scanFail: boolean;

  // ob2
  age: number;
  sex: string;

  // ob3
  builder: 'entry' | 'scanning' | 'fail' | 'list';
  added: number;
  toast: boolean;

  // ob6
  goalIdx: number;
  goalSel: Record<number, boolean>;
  goalDX: number;

  // ob7
  photo: 'ask' | 'camera' | 'confirm';

  // ob8 / ob9
  bedT: number;
  wakeT: number;
  breakfast: [number, number];
  lunch: [number, number];
  dinner: [number, number];
  fasting: boolean;

  // ob10
  reveal: number;

  // ob11 / ob12
  notif: 'mock' | 'prompt';
  plan: string;

  // gate
  gate: 'ask' | 'filling' | 'wipe';

  // today
  taken: Record<string, boolean>;
  ring: string | null;
  swipe: { id: string; dx: number } | null;

  // stack
  sheetH: number;
  sheetDragging: boolean;

  // add sheet
  sheet: boolean;

  // recommender (ob6 stepper + ob6b selection)
  recCount: number;
  recoSelected: string[];
  /** which selected item Item detail is showing */
  openItem: string | null;

  // profile / analysis / yir
  photosOpen: boolean;
  yirPhotos: boolean;
  adh: 30 | 90;
  costLocked: boolean;
}

export const ONBOARDING_ORDER: Screen[] = [
  'ob1',
  'ob2',
  'ob3',
  'ob4',
  'ob5',
  'ob6',
  'ob6b',
  'ob7',
  'ob8',
  'ob9',
  'ob10',
  'ob11',
  'ob12',
];

const INITIAL: AppState = {
  screen: 'ob1',
  reduceMotion: false,
  lowPower: false,
  alerts: true,
  emptyStack: false,
  scanFail: false,
  age: 34,
  sex: 'Male',
  builder: 'entry',
  added: 0,
  toast: false,
  goalIdx: 6, // Skin & hair
  goalSel: { 6: true },
  goalDX: 0,
  photo: 'ask',
  bedT: 22.75,
  wakeT: 7,
  breakfast: [8, 9],
  lunch: [12.5, 13.5],
  dinner: [18.5, 19.5],
  fasting: false,
  reveal: 0,
  notif: 'mock',
  plan: 'annual',
  gate: 'ask',
  taken: { collagen: true },
  ring: null,
  swipe: null,
  sheetH: 310,
  sheetDragging: false,
  sheet: false,
  recCount: 3,
  openItem: null,
  recoSelected: ['zinc-copper'], // first card selected — CTA is never dead on arrival
  photosOpen: false,
  yirPhotos: false,
  adh: 30,
  costLocked: true,
};

const STORAGE_KEY = 'stack-tracker-v1';

/** Only durable state survives a reload — nothing mid-gesture or mid-animation. */
const PERSISTED: (keyof AppState)[] = [
  'screen',
  'reduceMotion',
  'lowPower',
  'alerts',
  'emptyStack',
  'scanFail',
  'age',
  'sex',
  'builder',
  'added',
  'goalIdx',
  'goalSel',
  'photo',
  'bedT',
  'wakeT',
  'breakfast',
  'lunch',
  'dinner',
  'fasting',
  'notif',
  'plan',
  'taken',
  'sheetH',
  'recCount',
  'recoSelected',
  'openItem',
  'photosOpen',
  'yirPhotos',
  'adh',
  'costLocked',
];

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    const saved = JSON.parse(raw) as Partial<AppState>;
    const next = { ...INITIAL };
    for (const k of PERSISTED) {
      if (saved[k] !== undefined) (next as Record<string, unknown>)[k] = saved[k];
    }
    // repair anything persisted by an older schema that would break a screen
    if (!Number.isFinite(next.recCount) || next.recCount < 1 || next.recCount > 5) next.recCount = 3;
    if (!Array.isArray(next.recoSelected)) next.recoSelected = INITIAL.recoSelected;
    return next;
  } catch {
    return INITIAL;
  }
}

interface Store {
  state: AppState;
  set: (patch: Partial<AppState>) => void;
  go: (screen: Screen) => void;
  next: () => void;
  toggle: (key: keyof AppState) => void;
  logDose: (id: string) => void;
  gateYes: () => void;
  scan: () => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);
  const stateRef = useRef(state);
  stateRef.current = state;

  const timers = useRef<number[]>([]);
  const interval = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const set = useCallback((patch: Partial<AppState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  useEffect(() => {
    const persisted: Record<string, unknown> = {};
    for (const k of PERSISTED) persisted[k] = state[k];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      /* private mode — the app still works, it just won't remember */
    }
  }, [state]);

  useEffect(
    () => () => {
      clearTimers();
      if (interval.current) window.clearInterval(interval.current);
    },
    [clearTimers],
  );

  const go = useCallback(
    (screen: Screen) => {
      clearTimers();
      if (interval.current) {
        window.clearInterval(interval.current);
        interval.current = null;
      }

      if (screen === 'ob10') {
        // The schedule reveals block by block, 40ms apart (DESIGN.md §6).
        set({ screen, reveal: 0, sheet: false, gate: 'ask', swipe: null });
        interval.current = window.setInterval(() => {
          if (stateRef.current.reveal >= 14) {
            if (interval.current) window.clearInterval(interval.current);
            interval.current = null;
            return;
          }
          set({ reveal: stateRef.current.reveal + 1 });
        }, 40);
        return;
      }

      set({ screen, sheet: false, swipe: null, gate: 'ask' });
    },
    [clearTimers, set],
  );

  const next = useCallback(() => {
    const i = ONBOARDING_ORDER.indexOf(stateRef.current.screen);
    go(i < 0 || i === ONBOARDING_ORDER.length - 1 ? 'gate' : ONBOARDING_ORDER[i + 1]);
  }, [go]);

  const toggle = useCallback(
    (key: keyof AppState) => {
      set({ [key]: !stateRef.current[key] } as Partial<AppState>);
    },
    [set],
  );

  /** The signature interaction: ring fills over 0.5s, then the halo fades. */
  const logDose = useCallback(
    (id: string) => {
      const taken = { ...stateRef.current.taken };
      taken[id] = !taken[id];
      set({ taken, ring: taken[id] ? id : null });
      after(620, () => set({ ring: null }));
    },
    [after, set],
  );

  const gateYes = useCallback(() => {
    set({ gate: 'filling' });
    after(540, () => set({ gate: 'wipe' }));
    after(980, () => {
      const taken = { ...stateRef.current.taken, d7: true };
      set({ taken, screen: 'today', gate: 'ask' });
    });
  }, [after, set]);

  const scan = useCallback(() => {
    clearTimers();
    set({ builder: 'scanning', toast: false });
    after(1100, () => {
      if (stateRef.current.scanFail) {
        set({ builder: 'fail' });
        return;
      }
      set({ toast: true });
      after(1150, () =>
        set({
          builder: 'list',
          toast: false,
          added: Math.min(BUILD.length, stateRef.current.added + 1),
        }),
      );
    });
  }, [after, clearTimers, set]);

  const reset = useCallback(() => {
    clearTimers();
    if (interval.current) window.clearInterval(interval.current);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setState(INITIAL);
  }, [clearTimers]);

  const value = useMemo<Store>(
    () => ({ state, set, go, next, toggle, logDose, gateYes, scan, reset }),
    [state, set, go, next, toggle, logDose, gateYes, scan, reset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside <StoreProvider>');
  return v;
}
