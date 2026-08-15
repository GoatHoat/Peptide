/**
 * Interaction rules used by the schedule builder to accept or refuse a drop.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SEED DATA. This list is a starting point, not a clinical reference. It covers
 * four well-documented interactions and nothing else, which means the builder
 * will happily accept plenty of combinations it should question. Expanding it
 * is a research task with a citable source per rule, not a coding one — add
 * `source` to each entry when that happens.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Matching is by substring against the lowercased item name, so "Zinc
 * picolinate" matches the `zinc` rule. That is deliberately loose: a missed
 * warning is worse than an occasional over-eager one.
 */

export interface GapRule {
  kind: 'gap';
  a: string;
  b: string;
  minGapMinutes: number;
  message: string;
  /** soft rules explain themselves but do not block the drop */
  severity: 'block' | 'warn';
}

export interface AnchorRule {
  kind: 'anchor';
  item: string;
  requires: 'meal' | 'evening';
  /** how close to the anchor it has to land */
  withinMinutes: number;
  message: string;
  severity: 'block' | 'warn';
}

export type ConflictRule = GapRule | AnchorRule;

export const CONFLICT_RULES: ConflictRule[] = [
  {
    kind: 'gap',
    a: 'zinc',
    b: 'iron',
    minGapMinutes: 120,
    message: 'Zinc and iron need about 2 hours between them.',
    severity: 'block',
  },
  {
    kind: 'gap',
    a: 'calcium',
    b: 'zinc',
    minGapMinutes: 120,
    message: 'Calcium and zinc compete for absorption — about 2 hours apart works better.',
    severity: 'warn',
  },
  {
    kind: 'anchor',
    item: 'omega-3',
    requires: 'meal',
    withinMinutes: 60,
    message: 'Omega-3 needs a meal. Try moving it to within an hour of one.',
    severity: 'block',
  },
  {
    kind: 'anchor',
    item: 'magnesium',
    requires: 'evening',
    withinMinutes: 120,
    message: 'Magnesium works better in your wind-down window.',
    severity: 'warn',
  },
  {
    kind: 'anchor',
    item: 'glycine',
    requires: 'evening',
    withinMinutes: 120,
    message: 'Glycine works better in your wind-down window.',
    severity: 'warn',
  },
];

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

export const fromMinutes = (mins: number): string => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

const matches = (name: string, token: string) => name.toLowerCase().includes(token.toLowerCase());

export interface ScheduledItem {
  id: string;
  name: string;
  time: string;
}

export interface Violation {
  message: string;
  severity: 'block' | 'warn';
}

export interface DayContext {
  mealTimes: string[];
  sleepTime: string;
}

/**
 * Everything wrong with putting `moved` at `time`, worst first. An empty array
 * means the drop is fine.
 */
export function checkPlacement(
  moved: ScheduledItem,
  time: string,
  others: ScheduledItem[],
  ctx: DayContext,
): Violation[] {
  const at = toMinutes(time);
  const out: Violation[] = [];

  for (const rule of CONFLICT_RULES) {
    if (rule.kind === 'gap') {
      const isA = matches(moved.name, rule.a);
      const isB = matches(moved.name, rule.b);
      if (!isA && !isB) continue;
      const otherToken = isA ? rule.b : rule.a;
      for (const o of others) {
        if (o.id === moved.id || !matches(o.name, otherToken)) continue;
        if (Math.abs(toMinutes(o.time) - at) < rule.minGapMinutes) {
          out.push({ message: rule.message, severity: rule.severity });
          break;
        }
      }
    } else {
      if (!matches(moved.name, rule.item)) continue;
      if (rule.requires === 'meal') {
        const near = ctx.mealTimes.some((m) => Math.abs(toMinutes(m) - at) <= rule.withinMinutes);
        // with no meals logged the rule has nothing to anchor to, so it cannot fire
        if (ctx.mealTimes.length > 0 && !near) {
          out.push({ message: rule.message, severity: rule.severity });
        }
      } else {
        const sleep = toMinutes(ctx.sleepTime);
        // the wind-down window runs backwards from sleep, and wraps past midnight
        const delta = ((sleep - at) % 1440 + 1440) % 1440;
        if (delta > rule.withinMinutes) {
          out.push({ message: rule.message, severity: rule.severity });
        }
      }
    }
  }

  return out.sort((a, b) => (a.severity === 'block' ? -1 : 1) - (b.severity === 'block' ? -1 : 1));
}
