/**
 * The schedule solver.
 *
 * What it replaces was `slots[i % slots.length]` — round-robin, no reasoning,
 * and no way for the app to say why anything landed where it did.
 *
 * IT RUNS ON INGREDIENTS, NOT PRODUCTS. Two products conflict because of what
 * is in them: a multivitamin containing 15 mg of zinc conflicts with an iron
 * capsule even though neither is called "iron" or "zinc". Every item is expanded
 * to its panel before any constraint is evaluated — see `lib/conflicts.ts`,
 * which does the same and is reused here rather than reimplemented.
 *
 * THE OBJECTIVE IS FEWER BLOCKS, NOT PERFECT SPACING. Four a day is the
 * practical ceiling. A schedule that is pharmacokinetically ideal and has seven
 * blocks is worse than one with three that somebody actually follows: a
 * supplement taken at a slightly wrong time is absorbed, one left in the
 * cupboard is not.
 *
 * EVERY BLOCK IS ANCHORED to something the user already does — waking, a meal,
 * going to bed. There is no free-floating 15:20. When a constraint cannot be
 * satisfied against the anchors that exist, the item goes to the nearest one and
 * the compromise is stated rather than hidden.
 */

import {
  CONFLICT_RULES,
  FIBRE_GAP_MINUTES,
  FIBRE_KEYS,
  fromMinutes,
  toMinutes,
  type ItemIngredient,
} from './conflicts';

/** Where an item wants to sit, independent of anything else in the stack. */
export type Anchor = 'with_food' | 'with_fat' | 'empty' | 'evening' | 'morning' | 'any';

export interface SolverItem {
  id: string;
  name: string;
  /** the product's panel; absent falls back to name matching, as conflicts does */
  ingredients?: ItemIngredient[];
  /** the catalogue's own timing hint, where it has one */
  timing?: string | null;
}

export interface Meal {
  id: string;
  name: string;
  time: string;
  /** the meal the user said was their largest; fat-soluble items prefer it */
  largest?: boolean;
}

export interface DayShape {
  wake: string;
  sleep: string;
  meals: Meal[];
}

/** A time of day with a name the user recognises. */
export interface Block {
  id: string;
  name: string;
  time: string;
  /** true when this block is a meal, which `with_food` requires */
  isMeal: boolean;
  /**
   * Set when the solver made this time up rather than being given it.
   *
   * Only ever the food-free gap below. It exists so the reason line can state
   * the fact instead of apologising for a compromise it did not make.
   */
  derived?: true;
}

export interface Placement {
  itemId: string;
  blockId: string;
  /** one line, shown in the schedule and in the onboarding reveal */
  reason: string;
  /** set when a soft constraint had to be broken to fit the day */
  compromise?: string;
}

export interface Solution {
  blocks: Block[];
  placements: Placement[];
  /** blocks that ended up with nothing in them are not returned */
  used: Block[];
}

/**
 * Preferred ceiling on distinct blocks. Above this, adherence falls off a
 * cliff.
 *
 * NOT a hard limit, and it stopped being one when the food-free gap below was
 * added. A hard anchor is worth one extra block, so the worst case is five:
 * four the user gave plus one derived. The reuse penalty in `solve` is what
 * enforces the preference, and it is a cost rather than a refusal for exactly
 * this reason.
 */
export const MAX_BLOCKS = 4;

const WITH_FOOD_MINUTES = 30;
const EMPTY_AFTER_MEAL = 120;
const EMPTY_BEFORE_MEAL = 30;
const WINDOW_MINUTES = 120;
/** Resolution of the search for a food-free gap. */
const DERIVE_STEP_MINUTES = 15;
/**
 * How far a derived block must sit from every block the user already has.
 *
 * Without it the search returns a time ten minutes off an existing one, which
 * is two alarms that feel like a bug rather than a schedule.
 */
const DERIVE_CLEARANCE_MINUTES = 30;

/** Fat-soluble vitamins and the long-chain omega-3s. */
const FAT_SOLUBLE = new Set(['vitamin-a', 'vitamin-d', 'vitamin-e', 'vitamin-k', 'omega-3']);
/** Wants an empty stomach — absorption is blunted by a meal. */
const EMPTY_STOMACH = new Set(['iron', 'l-tyrosine', 'l-tryptophan', '5-htp']);
/** Studied in the evening, or simply unpleasant earlier. */
const EVENING = new Set(['magnesium', 'glycine', 'melatonin', 'l-theanine', 'gaba', '5-htp']);
/** Wants the morning: stimulating, or it interferes with sleep. */
const MORNING = new Set(['caffeine', 'vitamin-b12', 'thiamine', 'riboflavin']);

const keysOf = (item: SolverItem): string[] =>
  (item.ingredients ?? [])
    .map((i) => i.key)
    .filter((k): k is string => !!k);

/**
 * What this item wants, from its ingredients first and its catalogue timing
 * second.
 *
 * Ingredients win because they are the thing that is actually true: a product's
 * `timing` is an editorial field on one row, while the panel is the filing.
 */
export function anchorFor(item: SolverItem): Anchor {
  const keys = keysOf(item);
  if (keys.some((k) => FAT_SOLUBLE.has(k))) return 'with_fat';
  if (keys.some((k) => EMPTY_STOMACH.has(k))) return 'empty';
  if (keys.some((k) => EVENING.has(k))) return 'evening';
  if (keys.some((k) => MORNING.has(k))) return 'morning';

  switch (item.timing) {
    case 'with_food':
      return 'with_food';
    case 'empty_stomach':
      return 'empty';
    case 'evening':
    case 'before_bed':
      return 'evening';
    case 'morning':
      return 'morning';
    default:
      return 'any';
  }
}

/**
 * The blocks a day offers: waking, each meal, and wind-down.
 *
 * Anchored to events the user gave us, never invented. Duplicate times collapse
 * — someone who wakes at 07:00 and eats at 07:00 has one block, not two.
 */
export function blocksFor(day: DayShape): Block[] {
  const out: Block[] = [{ id: 'wake', name: 'When you wake', time: day.wake, isMeal: false }];
  for (const m of [...day.meals].sort((a, b) => toMinutes(a.time) - toMinutes(b.time))) {
    out.push({ id: m.id, name: m.name, time: m.time, isMeal: true });
  }
  const winddown = fromMinutes(toMinutes(day.sleep) - 60);
  out.push({ id: 'winddown', name: 'Wind-down', time: winddown, isMeal: false });

  /* Collapse duplicate times, but MERGE rather than drop. Wake is pushed
     first, so a plain filter kept "When you wake" and threw the meal away —
     and with it `isMeal`. The time then looked food-free to every empty-stomach
     item and offered nothing to anchor a with-food one, for somebody who eats
     breakfast the moment they get up. The meal's name and its flag both win,
     because eating is the fact that constrains the placement. */
  const byTime = new Map<string, Block>();
  for (const b of out) {
    const existing = byTime.get(b.time);
    if (!existing) {
      byTime.set(b.time, b);
      continue;
    }
    if (b.isMeal && !existing.isMeal) {
      byTime.set(b.time, { ...b, id: existing.id === 'wake' ? b.id : existing.id });
    }
  }
  return [...byTime.values()].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}

/** The meal the user called largest, else dinner, else the last meal. */
function fattiestMeal(day: DayShape, blocks: Block[]): Block | null {
  const named = day.meals.find((m) => m.largest);
  if (named) return blocks.find((b) => b.id === named.id) ?? null;
  const meals = blocks.filter((b) => b.isMeal);
  if (meals.length === 0) return null;
  const dinner = meals.find((b) => /dinner|evening meal|supper/i.test(b.name));
  return dinner ?? meals[meals.length - 1];
}

/** How well a block satisfies an anchor. 0 is perfect; higher is worse. */
function anchorCost(anchor: Anchor, block: Block, day: DayShape, blocks: Block[]): number {
  const at = toMinutes(block.time);
  const meals = blocks.filter((b) => b.isMeal).map((b) => toMinutes(b.time));

  switch (anchor) {
    case 'with_food':
      if (meals.length === 0) return 1; // nothing to anchor to; not the user's fault
      return meals.some((m) => Math.abs(m - at) <= WITH_FOOD_MINUTES) ? 0 : 100;

    case 'with_fat': {
      const target = fattiestMeal(day, blocks);
      if (!target) return 1;
      if (block.id === target.id) return 0;
      return block.isMeal ? 40 : 100;
    }

    case 'empty': {
      if (meals.length === 0) return 0;
      const after = meals.every((m) => at - m >= EMPTY_AFTER_MEAL || at < m);
      const before = meals.every((m) => m - at >= EMPTY_BEFORE_MEAL || m < at);
      return after && before ? 0 : 100;
    }

    case 'evening': {
      const sleep = toMinutes(day.sleep);
      const delta = (((sleep - at) % 1440) + 1440) % 1440;
      return delta <= WINDOW_MINUTES ? 0 : Math.min(100, Math.round(delta / 10));
    }

    case 'morning': {
      const delta = at - toMinutes(day.wake);
      return delta >= 0 && delta <= WINDOW_MINUTES ? 0 : Math.min(100, Math.abs(delta) / 10);
    }

    default:
      return 0;
  }
}

/** Minutes between two blocks, on a 24h clock without wrapping. */
const gap = (a: Block, b: Block) => Math.abs(toMinutes(a.time) - toMinutes(b.time));

/**
 * Does putting `item` in `block` break a separation against anything already
 * placed? Returns the offending messages, empty when it is fine.
 *
 * Reuses the rule table from conflicts.ts rather than restating it, including
 * the amount thresholds — a multivitamin with 2 mg of iron must not push a zinc
 * capsule into its own block.
 */
function separationBreaks(
  item: SolverItem,
  block: Block,
  placed: { item: SolverItem; block: Block }[],
): string[] {
  const out: string[] = [];
  const mineKeys = new Set(keysOf(item));
  const amount = (it: SolverItem, key: string) =>
    (it.ingredients ?? []).find((i) => i.key === key)?.amount ?? null;
  const over = (a: number | null, min: number | null) => min === null || a === null || a >= min;

  for (const other of placed) {
    const theirKeys = new Set(keysOf(other.item));
    const apart = gap(block, other.block);

    for (const rule of CONFLICT_RULES) {
      if (rule.kind !== 'gap') continue;
      for (const [x, y, xMin, yMin] of [
        [rule.a, rule.b, rule.minAmountA, rule.minAmountB],
        [rule.b, rule.a, rule.minAmountB, rule.minAmountA],
      ] as const) {
        if (!mineKeys.has(x) || !theirKeys.has(y)) continue;
        if (!over(amount(item, x), xMin) || !over(amount(other.item, y), yMin)) continue;
        if (apart >= rule.minGapMinutes) continue;
        out.push(
          `${item.name} and ${other.item.name} want ${Math.round(rule.minGapMinutes / 60)}h between them — ${x} and ${y}.`,
        );
      }
    }

    // fibre against everything
    const mineFibre = [...mineKeys].some((k) => FIBRE_KEYS.has(k));
    const theirFibre = [...theirKeys].some((k) => FIBRE_KEYS.has(k));
    if (mineFibre !== theirFibre && apart < FIBRE_GAP_MINUTES) {
      const f = mineFibre ? item : other.item;
      out.push(`${f.name} is a fibre — it binds whatever it is taken with.`);
    }
  }
  return out;
}

/**
 * A food-free time, invented only when the day genuinely offers none.
 *
 * An empty-stomach item used to land on a meal with a line admitting it would
 * rather not be there. For an app whose whole claim is timing, saying "here is
 * the least bad option" is the wrong answer when a perfectly good gap exists
 * two hours later and nobody looked.
 *
 * THE SEARCH. Every quarter hour from wake to sleep, taking the first time
 * that `anchorCost('empty', …)` scores zero — so the definition of "away from
 * food" is the one the solver already uses, EMPTY_AFTER_MEAL and
 * EMPTY_BEFORE_MEAL, rather than a second one that could drift from it. A
 * candidate also has to sit DERIVE_CLEARANCE_MINUTES clear of every block the
 * user already has.
 *
 * EARLIEST WINS, and that is a judgement rather than a fallout of the loop
 * order: a supplement somebody has to remember at four in the afternoon is one
 * they skip, so the first workable gap beats a theoretically roomier one later.
 *
 * Returns null when the day has no gap at all — someone eating from wake to
 * sleep. The caller then keeps the old behaviour and says so. A 3am slot that
 * satisfies the constraint on paper is not an answer.
 */
function deriveFoodFreeBlock(day: DayShape, blocks: Block[]): Block | null {
  const wake = toMinutes(day.wake);
  const sleepRaw = toMinutes(day.sleep);
  /* An overnight sleep time reads as smaller than wake. Walking to sleep+1440
     keeps the loop going forward through the waking day rather than not at
     all. */
  const sleep = sleepRaw > wake ? sleepRaw : sleepRaw + 1440;
  const existing = blocks.map((b) => toMinutes(b.time));

  for (let t = wake; t <= sleep; t += DERIVE_STEP_MINUTES) {
    const time = fromMinutes(t);
    const clear = existing.every((e) => {
      const gap = Math.abs(((((t - e) % 1440) + 1440) % 1440));
      return Math.min(gap, 1440 - gap) >= DERIVE_CLEARANCE_MINUTES;
    });
    if (!clear) continue;

    const candidate: Block = { id: 'away-from-food', name: 'Away from food', time, isMeal: false, derived: true };
    /* Scored against the user's own blocks, not against a set containing this
       one — a block cannot be its own reason for existing. `empty` only reads
       meals out of the list, so passing the originals is also the honest
       input. */
    if (anchorCost('empty', candidate, day, blocks) === 0) return candidate;
  }
  return null;
}

/** The sentence shown under a placement. */
function reasonFor(anchor: Anchor, block: Block, day: DayShape, blocks: Block[]): string {
  switch (anchor) {
    case 'with_fat': {
      const target = fattiestMeal(day, blocks);
      return target && block.id === target.id
        ? `With ${block.name.toLowerCase()} — needs fat to absorb.`
        : `With ${block.name.toLowerCase()} — needs food to absorb.`;
    }
    case 'with_food':
      return `With ${block.name.toLowerCase()} — absorbs better with food.`;
    case 'empty':
      /* Derived first. The app made a gap for this rather than settling, so it
         says what it did — plainly, and without congratulating itself. */
      if (block.derived) return `${block.name} — a gap kept clear of your meals.`;
      return block.isMeal
        ? `At ${block.name.toLowerCase()} — it would rather be away from food.`
        : `${block.name} — the one that has to be away from food.`;
    case 'evening':
      return `${block.name} — it belongs in your wind-down.`;
    case 'morning':
      return `${block.name} — it would keep you up later on.`;
    default:
      return `With ${block.name.toLowerCase()} — grouped here to keep your day to as few blocks as possible.`;
  }
}

/**
 * Place every item.
 *
 * Greedy by how constrained each item is, then a preference for blocks already
 * in use — that preference is what keeps the block count down, and it is the
 * whole objective. Items are never dropped: one that cannot be placed cleanly
 * goes to its least-bad block and says what was given up.
 */
export function solve(items: SolverItem[], day: DayShape): Solution {
  const blocks = blocksFor(day);
  if (blocks.length === 0 || items.length === 0) {
    return { blocks, placements: [], used: [] };
  }

  /* Grow the day, but only for `empty`, and only when it has nowhere to go.
     `with_food`, `evening` and `morning` all degrade onto an existing block
     sensibly and `any` does not care, so none of them earns a new time.
     At most one: two empty-stomach items share it, because a day that sprouts
     three new alarms is worse than the compromise it replaced. */
  const needsGap =
    items.some((i) => anchorFor(i) === 'empty') &&
    !blocks.some((b) => anchorCost('empty', b, day, blocks) === 0);
  if (needsGap) {
    const gap = deriveFoodFreeBlock(day, blocks);
    if (gap) {
      blocks.push(gap);
      blocks.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
    }
  }

  // hardest first: an item with one acceptable block must choose before an
  // item that would have been happy anywhere
  const ordered = [...items].sort((a, b) => {
    const ca = blocks.filter((x) => anchorCost(anchorFor(a), x, day, blocks) === 0).length;
    const cb = blocks.filter((x) => anchorCost(anchorFor(b), x, day, blocks) === 0).length;
    return ca - cb;
  });

  const placed: { item: SolverItem; block: Block }[] = [];
  const placements: Placement[] = [];
  const inUse = new Set<string>();

  for (const item of ordered) {
    const anchor = anchorFor(item);

    const scored = blocks
      .map((block) => {
        const anchorPenalty = anchorCost(anchor, block, day, blocks);
        const breaks = separationBreaks(item, block, placed);
        /* Reusing a block is worth a lot, and opening a fifth is worth
           refusing outright unless nothing else works — see MAX_BLOCKS. */
        const reuse = inUse.has(block.id) ? 0 : inUse.size >= MAX_BLOCKS ? 60 : 8;
        return { block, cost: anchorPenalty + breaks.length * 50 + reuse, breaks, anchorPenalty };
      })
      .sort((a, b) => a.cost - b.cost);

    const best = scored[0];
    placed.push({ item, block: best.block });
    inUse.add(best.block.id);

    const compromise =
      best.breaks.length > 0
        ? best.breaks[0].replace(/\.$/, '') + ' — your day does not have room for that gap.'
        : best.anchorPenalty > 0 && anchor !== 'any'
          ? 'Placed at the closest anchor your day offers.'
          : undefined;

    placements.push({
      itemId: item.id,
      blockId: best.block.id,
      reason: reasonFor(anchor, best.block, day, blocks),
      compromise,
    });
  }

  const used = blocks.filter((b) => inUse.has(b.id));
  return { blocks, placements, used };
}
