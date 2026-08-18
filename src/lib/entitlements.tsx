import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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

/* Which six are free is a pure function of the catalogue, so it lives in its
   own module and can be unit tested without a Supabase client. */
export { FREE_ARTICLES, freeSlugs } from './freeArticles';

export const LIMITS = {
  free: {
    stackItems: 1,
    /** articles readable free, per kind — see lib/freeArticles.ts */
    catalogue: 3,
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
  /**
   * Whether `askUsed`, `catalogueTotal` and `lockedTotal` were actually read.
   *
   * False when the tier came from the column fallback below, which answers
   * "what did they pay for" and nothing else. Copy that states a number must
   * check this first — claiming "3 free messages" to somebody who has used two
   * is worse than not naming a number at all. The tier itself is never
   * degraded, only the counts around it.
   */
  countsKnown: boolean;
  loading: boolean;
  refresh: () => Promise<Tier>;
  /**
   * Re-read until the tier turns pro, for the seconds after a payment while
   * Stripe's webhook races the user back into the app. Resolves true as soon
   * as it sees pro, false when the schedule runs out.
   */
  awaitPro: () => Promise<boolean>;
}

const FREE_FALLBACK: Omit<Entitlement, 'refresh' | 'awaitPro'> = {
  tier: 'free',
  isPro: false,
  limits: LIMITS.free,
  askUsed: 0,
  askLeft: LIMITS.free.askMessagesTotal,
  catalogueTotal: 0,
  lockedTotal: 0,
  countsKnown: false,
  loading: true,
};

const Ctx = createContext<Entitlement>({
  ...FREE_FALLBACK,
  refresh: async () => 'free',
  awaitPro: async () => false,
});

/**
 * How long after returning from checkout we keep asking.
 *
 * Milliseconds from the moment of return, not gaps between tries. Stripe fires
 * the webhook in parallel with redirecting the browser, so the first read
 * usually loses the race by a few hundred milliseconds; ten seconds covers the
 * slow end without leaving somebody staring at a spinner.
 */
const PRO_POLL_MS = [0, 2000, 5000, 10000];

/** Whether an error means "this database has never had 0037 applied". */
function isMissingRpc(message: string | undefined): boolean {
  return /does not exist|not find|PGRST202/i.test(message ?? '');
}

/* Once per page load, not once per read. The provider re-reads on every
   foreground, and a warning on each would bury the device log it exists to
   make visible. */
let warnedMissingRpc = false;

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<Entitlement, 'refresh' | 'awaitPro'>>(FREE_FALLBACK);

  /**
   * The last tier this session actually managed to read, and whose it was.
   *
   * Keyed by user id so signing a second account in on the same device cannot
   * inherit the first one's tier — without that this would be a way to get Pro
   * for free, which is a worse bug than the one it fixes.
   */
  const lastGood = useRef<{ userId: string; tier: Tier } | null>(null);

  const load = useCallback(async (): Promise<Tier> => {
    if (!user) {
      lastGood.current = null;
      setState({ ...FREE_FALLBACK, loading: false });
      return 'free';
    }

    const settle = (tier: Tier, counts: { askUsed: number; catalogueTotal: number } | null) => {
      const limits = tier === 'pro' ? LIMITS.pro : LIMITS.free;
      const askUsed = counts?.askUsed ?? 0;
      const catalogueTotal = counts?.catalogueTotal ?? 0;
      lastGood.current = { userId: user.id, tier };
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
        countsKnown: counts !== null,
        loading: false,
      });
      return tier;
    };

    /* ── first choice: the RPC ──────────────────────────────────────────
       It answers the tier, the lifetime message count and the catalogue size
       in one round trip, which nothing else can do. */
    /* `.then(ok, fail)` rather than try/catch: the builder is a thenable, not a
       promise, so it has no `.catch`, and a rejection here (DNS, no network)
       has to reach the fallback below by the same path a PostgREST error does. */
    const rpc = await supabase.rpc('my_entitlement').then(
      (r) => r as { data: unknown; error: { message?: string } | null },
      (error: unknown) => ({ data: null, error: (error ?? {}) as { message?: string } }),
    );
    if (!rpc.error) {
      const row = (Array.isArray(rpc.data) ? rpc.data[0] : rpc.data) as
        | { tier?: string; ask_used?: number | string; catalogue_total?: number | string }
        | undefined;
      return settle(row?.tier === 'pro' ? 'pro' : 'free', {
        askUsed: Number(row?.ask_used ?? 0),
        catalogueTotal: Number(row?.catalogue_total ?? 0),
      });
    }

    /* ── second choice: the column the RPC reads ────────────────────────
       `my_entitlement` ships in migration 0037. Against a database that has
       not had it applied the RPC does not exist, so this threw and every
       account in the app was silently free no matter what they had paid —
       indistinguishable, from the outside, from working. profiles
       .subscription_tier is the source of truth the RPC itself reads and RLS
       already lets somebody read their own row, so this is a correct answer
       rather than a guess. It cannot supply the counts; those degrade and the
       tier does not. */
    if (isMissingRpc(rpc.error.message) && !warnedMissingRpc) {
      warnedMissingRpc = true;
      console.warn(
        'my_entitlement() is missing — migration 0037 is not applied to this database. ' +
          'Falling back to reading profiles.subscription_tier directly.',
      );
    }

    const column = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()
      .then(
        (r: { data: { subscription_tier?: string | null } | null; error: unknown }) => r,
        (error: unknown) => ({ data: null, error }),
      );
    if (!column.error && column.data) {
      return settle(column.data.subscription_tier === 'pro' ? 'pro' : 'free', null);
    }

    /* ── both failed: genuinely offline ─────────────────────────────────
       Free is the conservative default for somebody we have never resolved.
       It is the wrong answer for somebody we already resolved as pro this
       session, though: watching paid features vanish because one request
       timed out is a refund and a one-star review, and keeping the tier gives
       away nothing the server does not re-check anyway. */
    if (lastGood.current?.userId === user.id && lastGood.current.tier === 'pro') {
      return settle('pro', null);
    }
    setState({ ...FREE_FALLBACK, loading: false });
    return 'free';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const awaitPro = useCallback(async (): Promise<boolean> => {
    const started = Date.now();
    for (const at of PRO_POLL_MS) {
      const wait = at - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if ((await load()) === 'pro') return true;
    }
    return false;
  }, [load]);

  return <Ctx.Provider value={{ ...state, refresh: load, awaitPro }}>{children}</Ctx.Provider>;
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
