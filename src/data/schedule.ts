import {
  FALLBACK_RECOMMENDATIONS,
  GOALS,
  recommendationsFor,
  REFERENCE,
  USER_GUMMY,
  type RecoItem,
} from './mock';
import { useStore } from '../state/store';

/**
 * The ob6b selection is the single source of truth for what the user takes.
 * Every downstream screen derives from here — nothing reads a fixed array any
 * more, so one selected item produces a one-item schedule, not a broken layout.
 */

/** The demo's fixed "now" — 3:41 PM, matching the Today marker. */
export const NOW_HOUR = 15.68;

export interface Dose {
  id: string;
  n: string;
  d: string;
  why?: string;
}

export interface Block {
  id: string;
  label: string;
  time: string;
  hour: number;
  past: boolean;
  items: Dose[];
}

/** One block per item — the three real times are distinct, so they never merge. */
export function buildSchedule(items: RecoItem[]): Block[] {
  return [...items]
    .sort((a, b) => a.hour - b.hour)
    .map((it) => ({
      id: 'b-' + it.id,
      label: it.block,
      time: it.time,
      hour: it.hour,
      past: it.hour < NOW_HOUR,
      items: [{ id: it.id, n: stripHtml(it.n), d: it.d.split(' · ')[0], why: it.timing }],
    }));
}

function stripHtml(s: string): string {
  return s.replace(/&nbsp;/g, ' ').replace(/<[^>]*>/g, '');
}

export interface Scored {
  n: string;
  amt: number;
  u: string;
  rda: number;
  ul: number | null;
  aiOnly: boolean;
  from: string;
  /** amount ÷ upper limit, or 0 when there is no limit to be over */
  p: number;
  pctT: string;
  over: boolean;
  crit: boolean;
  near: boolean;
}

/**
 * Nutrient totals = the gummy the user already takes + whatever they selected.
 * With three conservative recommendations, nothing we suggest is near a limit;
 * the over-limit finding comes from their own product. That is the point.
 */
export function buildAudit(selected: RecoItem[]): Scored[] {
  const totals = new Map<string, { amt: number; sources: string[] }>();
  const add = (n: string, amt: number, source: string) => {
    const cur = totals.get(n) ?? { amt: 0, sources: [] };
    cur.amt += amt;
    cur.sources.push(source);
    totals.set(n, cur);
  };

  for (const g of USER_GUMMY.nutrients) add(g.n, g.amt, USER_GUMMY.name);
  for (const it of selected) for (const nut of it.nutrients) add(nut.n, nut.amt, stripHtml(it.n));

  return [...totals.entries()]
    .map(([n, v]) => {
      const ref = REFERENCE[n] ?? { rda: 0, ul: null, u: '' };
      const p = ref.ul ? v.amt / ref.ul : 0;
      return {
        n,
        amt: v.amt,
        u: ref.u,
        rda: ref.rda,
        ul: ref.ul,
        aiOnly: !!ref.aiOnly,
        from: v.sources.length > 1 ? `across ${v.sources.length} products` : v.sources[0],
        p,
        pctT: ref.ul ? Math.round(p * 100) + '%' : '—',
        over: !!ref.ul && p >= 1,
        crit: !!ref.ul && p >= 1.5,
        near: !!ref.ul && p >= 0.8 && p < 1,
      };
    })
    .sort((a, b) => b.p - a.p);
}

export interface Finding {
  id: string;
  kind: 'over' | 'note' | 'watch';
  title: string;
  body: string;
  action?: string;
}

/** The three audit findings. Copy is fixed; which ones fire depends on selection. */
export function buildFindings(audit: Scored[]): Finding[] {
  const out: Finding[] = [];
  const zinc = audit.find((a) => a.n === 'Zinc');
  if (zinc && zinc.over) {
    out.push({
      id: 'zinc',
      kind: 'over',
      title: `Zinc ${zinc.amt} ${zinc.u}`,
      body: `Your gummy already has 30 mg. Ours takes you to ${zinc.amt}. The ceiling is 40, and sustained intake above it blocks copper absorption.`,
      action: 'Drop our zinc',
    });
  }
  const biotin = audit.find((a) => a.n === 'Biotin');
  if (biotin) {
    out.push({
      id: 'biotin',
      kind: 'note',
      // Biotin has no upper limit and is not toxic. The issue is assay
      // interference, and the copy must never imply otherwise.
      title: `Biotin ${biotin.amt.toLocaleString('en-US')} mcg`,
      body: 'Not dangerous in itself — biotin has no upper limit. But at this dose it distorts blood tests, including the one used to diagnose heart attacks. Tell whoever draws your blood.',
      action: 'Blood test coming up?',
    });
  }
  const sel = audit.find((a) => a.n === 'Selenium');
  if (sel && sel.ul) {
    out.push({
      id: 'selenium',
      kind: 'watch',
      title: `Selenium ${sel.pctT} of the ceiling`,
      body: 'Half the ceiling from one gummy. Worth knowing, because the first sign of too much selenium is hair loss and brittle nails — the thing you bought it for.',
    });
  }
  return out;
}

/** Everything downstream reads this. */
export function useSchedule() {
  const { state } = useStore();
  const goal = GOALS[state.goalIdx]?.t ?? 'Skin & hair';
  const forGoal = recommendationsFor(goal);
  const all = forGoal.length ? forGoal : FALLBACK_RECOMMENDATIONS;

  const count =
    Number.isFinite(state.recCount) && state.recCount > 0 ? Math.min(5, state.recCount) : 3;
  const offered = all.slice(0, count);
  const selected = offered.filter((i) => state.recoSelected.includes(i.id));

  const blocks = buildSchedule(selected);
  const totalDoses = blocks.reduce((a, b) => a + b.items.length, 0);
  const takenCount = blocks.reduce(
    (a, b) => a + b.items.filter((i) => state.taken[i.id]).length,
    0,
  );
  const audit = buildAudit(selected);

  return {
    offered,
    selected,
    blocks,
    totalDoses,
    takenCount,
    audit,
    findings: buildFindings(audit),
    /** the next dose whose time has not passed, else the first */
    next: blocks.find((b) => !b.past) ?? blocks[0],
    dosesPerHour: blocks.reduce<Record<number, number>>((acc, b) => {
      acc[Math.floor(b.hour)] = (acc[Math.floor(b.hour)] ?? 0) + b.items.length;
      return acc;
    }, {}),
  };
}
