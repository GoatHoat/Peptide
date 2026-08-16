/**
 * Interaction rules used by the schedule builder to accept or refuse a drop.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THESE RUN ON INGREDIENTS, NOT ON PRODUCT NAMES.
 *
 * They used to match by substring against the product name, which works for
 * "Thorne Zinc Picolinate 30 mg" and is completely blind to "Klean Athlete
 * Klean Multivitamin" — 15 mg of zinc, 50 mg of calcium, and none of those
 * words in its title. The builder placed that multivitamin beside an iron
 * capsule and reported nothing, which is the exact case this file exists for.
 *
 * Products now arrive carrying their ingredient panel (see
 * `glossary_ingredient`, migration 0028/0029) and rules resolve against
 * ingredient keys. The old name matching is kept as a fallback for items that
 * have no ingredient rows — a hand-typed schedule entry, or a product added
 * before the backfill — so nothing silently stops being checked.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SEED DATA. Still a starting point, not a clinical reference. Every rule here
 * was in the file before this rewrite; what changed is what they match against
 * and that they now carry amount thresholds. Adding a rule is a research task
 * with a citable source, not a coding one — `source` is on the type for when
 * that happens, and a rule without one is a rule that has not been justified.
 */

export interface GapRule {
  kind: 'gap';
  /** canonical ingredient keys — see scripts/ingredient_map.py */
  a: string;
  b: string;
  minGapMinutes: number;
  message: string;
  /** soft rules explain themselves but do not block the drop */
  severity: 'block' | 'warn';
  /**
   * Below this much of `a` (in the unit the label prints) the rule does not
   * fire. The zinc/iron interaction is documented at supplemental iron doses;
   * a multivitamin carrying 2 mg of iron should not block a zinc capsule.
   * Null means "no defensible threshold" and the rule always fires — those are
   * listed in the report rather than being given an invented number.
   */
  minAmountA: number | null;
  minAmountB: number | null;
  /** the unit the thresholds are expressed in */
  unit: string | null;
  /** glossary_research.id backing this rule, where one exists */
  source: string | null;
}

export interface AnchorRule {
  kind: 'anchor';
  /** canonical ingredient key */
  item: string;
  requires: 'meal' | 'evening';
  /** how close to the anchor it has to land */
  withinMinutes: number;
  message: string;
  severity: 'block' | 'warn';
  source: string | null;
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
    // Documented at supplemental doses. Below these the competition for the
    // DMT1 transporter is not what the trials measured.
    minAmountA: 15,
    minAmountB: 25,
    unit: 'mg',
    source: null,
  },
  {
    kind: 'gap',
    a: 'calcium',
    b: 'zinc',
    minGapMinutes: 120,
    message: 'Calcium and zinc compete for absorption — about 2 hours apart works better.',
    severity: 'warn',
    minAmountA: 250,
    minAmountB: 15,
    unit: 'mg',
    source: null,
  },
  {
    kind: 'gap',
    a: 'iron',
    b: 'calcium',
    minGapMinutes: 120,
    message: 'Calcium blunts iron absorption — keep about 2 hours between them.',
    severity: 'warn',
    minAmountA: 25,
    minAmountB: 250,
    unit: 'mg',
    source: null,
  },
  {
    kind: 'gap',
    a: 'zinc',
    b: 'copper',
    minGapMinutes: 120,
    message: 'Taken together long-term, zinc lowers copper — about 2 hours apart is better.',
    severity: 'warn',
    minAmountA: 25,
    minAmountB: null,
    unit: 'mg',
    source: null,
  },
  {
    kind: 'gap',
    a: 'calcium',
    b: 'magnesium',
    minGapMinutes: 120,
    message: 'Calcium and magnesium share a transporter at these amounts — 2 hours apart absorbs better.',
    severity: 'warn',
    minAmountA: 500,
    minAmountB: 300,
    unit: 'mg',
    source: null,
  },
  {
    kind: 'anchor',
    item: 'omega-3',
    requires: 'meal',
    withinMinutes: 60,
    message: 'Omega-3 needs a meal. Try moving it to within an hour of one.',
    severity: 'block',
    source: null,
  },
  {
    kind: 'anchor',
    item: 'magnesium',
    requires: 'evening',
    withinMinutes: 120,
    message: 'Magnesium works better in your wind-down window.',
    severity: 'warn',
    source: null,
  },
  {
    kind: 'anchor',
    item: 'glycine',
    requires: 'evening',
    withinMinutes: 120,
    message: 'Glycine works better in your wind-down window.',
    severity: 'warn',
    source: null,
  },
];

/**
 * Fibre binds and delays whatever is taken with it. Kept apart from the pairwise
 * rules because it applies against everything rather than against one partner.
 */
export const FIBRE_KEYS = new Set(['psyllium', 'inulin', 'beta-glucan']);
export const FIBRE_GAP_MINUTES = 120;

export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

export const fromMinutes = (mins: number): string => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** One line of a product's supplement facts panel, as the app carries it. */
export interface ItemIngredient {
  /** canonical key, or null where the printed name could not be mapped */
  key: string | null;
  /** as printed, e.g. "Zinc (as zinc picolinate)" */
  raw_name?: string;
  amount: number | null;
  unit: string | null;
}

export interface ScheduledItem {
  id: string;
  name: string;
  time: string;
  /**
   * The product's panel. Absent means "not backfilled yet", and the rules fall
   * back to matching the name — see the header. An empty array is different: it
   * means the product genuinely has no panel, and no ingredient rule can apply.
   */
  ingredients?: ItemIngredient[];
}

export interface Violation {
  message: string;
  severity: 'block' | 'warn';
  /** the ingredient key that triggered it, for the UI to name */
  ingredient?: string;
}

export interface DayContext {
  mealTimes: string[];
  sleepTime: string;
}

const nameMatches = (name: string, token: string) =>
  name.toLowerCase().includes(token.toLowerCase());

/**
 * How much of `key` this item carries, or null if it does not carry it.
 *
 * Falls back to the product name when the item has no panel. The fallback
 * returns a null amount rather than a guess, which every threshold check reads
 * as "cannot rule this out" and therefore lets the rule fire — the same
 * behaviour the file had before ingredients existed.
 */
function carries(item: ScheduledItem, key: string): { has: boolean; amount: number | null } {
  if (item.ingredients && item.ingredients.length > 0) {
    const row = item.ingredients.find((i) => i.key === key);
    return row ? { has: true, amount: row.amount } : { has: false, amount: null };
  }
  return { has: nameMatches(item.name, key), amount: null };
}

/** True when the rule's threshold is met, or cannot be evaluated. */
const overThreshold = (amount: number | null, min: number | null) =>
  min === null || amount === null || amount >= min;

/**
 * The sentence a violation shows.
 *
 * Naming the ingredient and the amount is the entire value of the ingredient
 * work: a user cannot see inside a multivitamin, so "your Klean Multivitamin has
 * 15 mg of zinc in it, which wants 2 hours from your iron" is actionable where
 * "zinc and iron need 2 hours" is the app moving things for no visible reason.
 */
function gapMessage(
  moved: ScheduledItem,
  movedKey: string,
  movedAmount: number | null,
  other: ScheduledItem,
  otherKey: string,
  rule: GapRule,
): string {
  const hidden = !nameMatches(moved.name, movedKey);
  const amount = movedAmount !== null ? `${movedAmount} ${rule.unit ?? 'mg'} of ` : '';
  const hours = Math.round(rule.minGapMinutes / 60);
  const gap = hours === 1 ? 'an hour' : `${hours} hours`;
  if (hidden && movedAmount !== null) {
    return `Your ${moved.name} has ${amount}${movedKey} in it, which wants ${gap} from your ${other.name}.`;
  }
  return `${moved.name} and ${other.name} want ${gap} between them — ${movedKey} and ${otherKey}.`;
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
  const seen = new Set<string>();

  const push = (v: Violation) => {
    const dedupe = `${v.severity}|${v.message}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    out.push(v);
  };

  for (const rule of CONFLICT_RULES) {
    if (rule.kind === 'gap') {
      // the rule is symmetric: whichever side `moved` is, the other side is
      // what we look for among its neighbours
      for (const [mineKey, theirsKey, mineMin, theirsMin] of [
        [rule.a, rule.b, rule.minAmountA, rule.minAmountB],
        [rule.b, rule.a, rule.minAmountB, rule.minAmountA],
      ] as const) {
        const mine = carries(moved, mineKey);
        if (!mine.has || !overThreshold(mine.amount, mineMin)) continue;

        for (const o of others) {
          if (o.id === moved.id) continue;
          const theirs = carries(o, theirsKey);
          if (!theirs.has || !overThreshold(theirs.amount, theirsMin)) continue;
          if (Math.abs(toMinutes(o.time) - at) >= rule.minGapMinutes) continue;
          push({
            message: gapMessage(moved, mineKey, mine.amount, o, theirsKey, rule),
            severity: rule.severity,
            ingredient: mineKey,
          });
        }
      }
      continue;
    }

    const mine = carries(moved, rule.item);
    if (!mine.has) continue;

    if (rule.requires === 'meal') {
      const near = ctx.mealTimes.some((m) => Math.abs(toMinutes(m) - at) <= rule.withinMinutes);
      // with no meals logged the rule has nothing to anchor to, so it cannot fire
      if (ctx.mealTimes.length > 0 && !near) {
        push({ message: rule.message, severity: rule.severity, ingredient: rule.item });
      }
    } else {
      const sleep = toMinutes(ctx.sleepTime);
      // the wind-down window runs backwards from sleep, and wraps past midnight
      const delta = (((sleep - at) % 1440) + 1440) % 1440;
      if (delta > rule.withinMinutes) {
        push({ message: rule.message, severity: rule.severity, ingredient: rule.item });
      }
    }
  }

  // Fibre against everything, rather than against a named partner.
  const movedFibre = [...FIBRE_KEYS].find((k) => carries(moved, k).has);
  for (const o of others) {
    if (o.id === moved.id) continue;
    if (Math.abs(toMinutes(o.time) - at) >= FIBRE_GAP_MINUTES) continue;
    const otherFibre = [...FIBRE_KEYS].find((k) => carries(o, k).has);
    // one side fibre, not both — two fibres together are nobody's problem
    if (!!movedFibre === !!otherFibre) continue;
    const fibre = movedFibre ? moved : o;
    const blocked = movedFibre ? o : moved;
    push({
      message: `${fibre.name} is a fibre — it binds and delays whatever it is taken with. Keep about 2 hours from your ${blocked.name}.`,
      severity: 'warn',
      ingredient: movedFibre ?? otherFibre,
    });
  }

  return out.sort(
    (a, b) => (a.severity === 'block' ? -1 : 1) - (b.severity === 'block' ? -1 : 1),
  );
}
