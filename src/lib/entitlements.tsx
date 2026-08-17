import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './auth';

/**
 * What this account is allowed to do.
 *
 * `profiles.subscription_tier` is the single source of truth and every gate in
 * the app reads from here. No component decides for itself — that is how two
 * screens end up disagreeing about whether somebody has paid.
 *
 * ENFORCED ON THE SERVER, because it is what people pay for:
 *   stack items   trigger on stack_items (migration 0037)
 *   ask messages  lifetime count inside the Edge Function, tier read from the
 *                 database rather than taken from the request
 *
 * NOT ENFORCED, deliberately: the catalogue cap. It is published NIH label
 * filings and PubMed citations — public reference material. Blurring it is an
 * upsell, not a security boundary, and a server check there would be theatre.
 */
export type Tier = 'free' | 'pro';

export const LIMITS = {
  free: {
    stackItems: 1,
    /** per kind: free_rank <= this is visible */
    catalogue: 30,
    askMessagesTotal: 3,
  },
  pro: {
    stackItems: Infinity,
    catalogue: null,
    askMessagesTotal: null,
  },
} as const;

/** The errcode the stack trigger raises. */
export const STACK_LIMIT_CODE = 'free_tier_stack_limit';

export interface Entitlement {
  tier: Tier;
  isPro: boolean;
  limits: (typeof LIMITS)['free'] | (typeof LIMITS)['pro'];
  /** assistant messages this account has ever sent */
  askUsed: number;
  /** how many are left, or null when unlimited */
  askLeft: number | null;
  /** every product in the catalogue — read, never hardcoded into copy */
  catalogueTotal: number;
  /** how many a free account cannot see */
  lockedTotal: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

const FREE_FALLBACK: Omit<Entitlement, 'refresh'> = {
  tier: 'free',
  isPro: false,
  limits: LIMITS.free,
  askUsed: 0,
  askLeft: LIMITS.free.askMessagesTotal,
  catalogueTotal: 0,
  lockedTotal: 0,
  loading: true,
};

const Ctx = createContext<Entitlement>({ ...FREE_FALLBACK, refresh: async () => {} });

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<Entitlement, 'refresh'>>(FREE_FALLBACK);

  const load = useCallback(async () => {
    if (!user) {
      setState({ ...FREE_FALLBACK, loading: false });
      return;
    }
    try {
      const { data, error } = await supabase.rpc('my_entitlement');
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as
        | { tier?: string; ask_used?: number | string; catalogue_total?: number | string }
        | undefined;

      const tier: Tier = row?.tier === 'pro' ? 'pro' : 'free';
      const limits = tier === 'pro' ? LIMITS.pro : LIMITS.free;
      const askUsed = Number(row?.ask_used ?? 0);
      const catalogueTotal = Number(row?.catalogue_total ?? 0);

      setState({
        tier,
        isPro: tier === 'pro',
        limits,
        askUsed,
        askLeft:
          limits.askMessagesTotal === null ? null : Math.max(0, limits.askMessagesTotal - askUsed),
        catalogueTotal,
        // two kinds, each capped
        lockedTotal:
          limits.catalogue === null ? 0 : Math.max(0, catalogueTotal - limits.catalogue * 2),
        loading: false,
      });
    } catch {
      /* 0037 not applied yet, or offline. Free is the conservative default: it
         shows an upsell to somebody who has paid, which is annoying; the other
         way round gives away what they are paying for. */
      setState({ ...FREE_FALLBACK, loading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return <Ctx.Provider value={{ ...state, refresh: load }}>{children}</Ctx.Provider>;
}

export function useEntitlement(): Entitlement {
  return useContext(Ctx);
}

/** True when the database refused an insert because of the free stack cap. */
export function isStackLimitError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { message?: string; code?: string; details?: string };
  return [e.message, e.details, e.code].some((v) => typeof v === 'string' && v.includes(STACK_LIMIT_CODE));
}
