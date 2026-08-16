import type { GlossaryEntry } from './api';

/**
 * The recommendation rule table.
 *
 * Pure and synchronous — entries in, an ordered list out. No fetching, no
 * randomness, no model call, nothing that cannot be read off the page. Every
 * rule below states the reason it fired and that reason is what the card
 * shows; a rule that cannot say why in one sentence does not belong here.
 *
 * Two things this deliberately does not do. It never removes a nutrient
 * because of a reaction — a reaction changes which product, not whether — and
 * it never invents a sentence. An entry that no rule touched carries the goal
 * match it already had, and an entry with neither carries nothing at all.
 */

/* ── what the user told us ───────────────────────────────────────────── */

export interface Answers {
  /** the goal tags the user's picks expand to; the caller owns that mapping */
  goalTags: string[];
  /** how to name those goals in a sentence — 'your goals', or 'sleep' */
  goalLabel: string;
  /** free text from the "what are you already taking" screen */
  currentStack: string[];
  /** `diet` ids from the onboarding store: no-meat, no-fish, … */
  diet: string[];
  /** `reactions` ids: iron-gi, mag-gi, … */
  reactions: string[];
  /** `forms` ids: capsule, powder, … */
  forms: string[];
}

export interface Suggestion {
  entry: GlossaryEntry;
  /** higher first; see the weights below for what each rule is worth */
  score: number;
  /** the goal tags this entry matched, for the fallback reason */
  goalHits: string[];
  /** the one line the card shows. Empty when nothing fired — show nothing. */
  reason: string;
  /** multiplier on the reference intake where a rule adjusts it; 1 otherwise */
  amountFactor: number;
  /** a reaction can force this even where the product's own timing differs */
  timing: 'with_food' | null;
}

/** A product a rule routed away from, and the plain reason why. */
export interface SwappedOut {
  name: string;
  why: string;
}

export interface RecommendResult {
  /** everything that survived, best first. The caller decides how many to show. */
  ranked: Suggestion[];
  swappedOut: SwappedOut[];
  /** names from the catalogue the user said they already take */
  alreadyTaking: string[];
}

/* ── weights ─────────────────────────────────────────────────────────── */

/**
 * One goal tag is worth 10, so a rule worth 30 outranks any realistic goal
 * overlap and a rule worth 6 only breaks ties. `required` is worth more than
 * anything else can add up to, because "no reliable plant source" is not a
 * ranking argument.
 */
const W = {
  goalHit: 10,
  required: 1000,
  dietPriority: 30,
  preferredForm: 25,
  swallowable: 12,
  formPreference: 6,
} as const;

const EVIDENCE = { strong: 2, mixed: 1, thin: 0 } as const;

/** Reason priority — the highest that fired is the one the card shows. */
const P = {
  required: 60,
  swap: 50,
  diet: 40,
  timing: 30,
  swallowable: 20,
  formPreference: 10,
  goal: 0,
} as const;

/* ── recognising a nutrient ──────────────────────────────────────────── */

/**
 * Name, slug and search keywords together — everything the catalogue holds
 * that says what a product *is*. Deliberately not the brand: matching Thorne
 * would match a quarter of the library. Deliberately not the mechanism or
 * research summary either, which mention neighbouring nutrients constantly.
 *
 * Slugs are matched as well as names so this survives item 0.5 renaming them
 * from ingredient-shaped to `<brand>-<product>` — both shapes contain the
 * ingredient.
 */
const textOf = (e: GlossaryEntry) =>
  `${e.name} ${e.slug} ${(e.search_keywords ?? []).join(' ')}`.toLowerCase();

const hits = (text: string, terms: readonly RegExp[]) => terms.some((t) => t.test(text));

/**
 * Word-bounded, so "iron" does not match inside another word and "niacin"
 * does not match "niacinamide" — the two forms of B3 are the whole point of
 * one of the rules below and must stay distinguishable.
 */
const NUTRIENT = {
  b12: [/\bb-?12\b/, /cobalamin/],
  iron: [/\biron\b/, /ferrous/, /ferric/],
  zinc: [/\bzinc\b/],
  magnesium: [/\bmagnesium\b/],
  omega3: [/\bomega[\s-]?3\b/, /\bdha\b/, /\bepa\b/, /fish oil/, /\bkrill\b/, /cod liver/],
  calcium: [/\bcalcium\b/],
  vitaminD: [/\bvitamin\s?d\b/, /\bd-?3\b/, /cholecalciferol/],
  // choline bitartrate and anything else that names choline. Citicoline and
  // alpha-GPC raise choline too but spell neither, and they are catalogued as
  // cognitive products — left out rather than quietly folded in.
  choline: [/choline/],
  niacin: [/niacin/, /nicotinamide/, /nicotinic/],
} as const;

/* ── product form ────────────────────────────────────────────────────── */

export type FormClass = 'capsule' | 'softgel' | 'tablet' | 'powder' | 'liquid' | 'gummy' | 'other';

/**
 * DSLD writes softgels as "Softgel Capsule", so softgel has to be tested
 * before capsule or every softgel in the library reads as a capsule.
 */
export function classifyForm(productForm: string | null | undefined): FormClass {
  const f = (productForm ?? '').toLowerCase();
  if (!f) return 'other';
  if (f.includes('gummy') || f.includes('gummies') || f.includes('chew')) return 'gummy';
  if (f.includes('softgel') || f.includes('soft gel')) return 'softgel';
  if (f.includes('capsule')) return 'capsule';
  if (f.includes('tablet') || f.includes('caplet')) return 'tablet';
  if (f.includes('powder')) return 'powder';
  if (f.includes('liquid') || f.includes('drops') || f.includes('tincture') || f.includes('oil'))
    return 'liquid';
  return 'other';
}

/** The onboarding option ids, in the same order as the question. */
const FORM_OPTION: Record<string, FormClass> = {
  capsule: 'capsule',
  tablet: 'tablet',
  softgel: 'softgel',
  powder: 'powder',
  liquid: 'liquid',
  gummy: 'gummy',
};

const FORM_PLURAL: Record<FormClass, string> = {
  capsule: 'capsules',
  softgel: 'softgels',
  tablet: 'tablets',
  powder: 'powders',
  liquid: 'liquids',
  gummy: 'gummies',
  other: 'this form',
};

/** A softgel is a capsule as far as swallowing one goes. */
const HARD_TO_SWALLOW: FormClass[] = ['capsule', 'softgel', 'tablet'];
const EASY_TO_SWALLOW: FormClass[] = ['powder', 'liquid'];

/* ── the diet table (spec 2.1) ───────────────────────────────────────── */

interface PriorityRule {
  /** the diet id that turns it on */
  when: string;
  group: readonly RegExp[];
  reason: string;
  /**
   * Pushes to the top of the list whatever the goals were, and keeps the
   * entry even when it matched no goal at all. Only B12 earns this.
   */
  required?: boolean;
  /** multiplier on the reference intake, where the published one differs */
  amountFactor?: number;
}

const DIET_RULES: PriorityRule[] = [
  {
    when: 'no-meat',
    group: NUTRIENT.b12,
    required: true,
    reason: 'You said no meat — this is the one thing with no reliable plant source.',
  },
  {
    when: 'no-meat',
    group: NUTRIENT.iron,
    // NIH ODS: the recommended intake for vegetarians is 1.8× the RDA, because
    // non-haem iron absorbs far less well than the haem kind.
    amountFactor: 1.8,
    reason: 'Vegetarian iron targets are 1.8× the standard, because non-haem iron absorbs less well.',
  },
  {
    when: 'no-meat',
    group: NUTRIENT.zinc,
    reason: 'Phytate in grains and legumes binds zinc, so vegetarians can need up to 50% more.',
  },
  {
    when: 'no-dairy',
    group: NUTRIENT.calcium,
    reason: 'You said no dairy, which is where most people get most of their calcium.',
  },
  {
    when: 'no-dairy',
    group: NUTRIENT.vitaminD,
    reason: 'You said no dairy — fortified milk is one of the few food sources of vitamin D.',
  },
  {
    when: 'no-eggs',
    group: NUTRIENT.choline,
    reason: 'You said no eggs, which are the densest food source of choline.',
  },
];

/* ── the swap table (spec 2.1 omega-3, 2.2 reactions) ────────────────── */

interface SwapRule {
  /** the answer id that turns it on */
  when: string;
  /** which answer it comes from — a diet exclusion behaves differently below */
  from: 'diet' | 'reactions';
  /** every product of this nutrient */
  group: readonly RegExp[];
  /** the form to route to */
  prefer: RegExp[];
  /** the form to route away from; null means anything that is not preferred */
  avoid: RegExp[] | null;
  reason: string;
  /**
   * Whether the product routed *to* also moves onto a full stomach. Only
   * where the rule says so — a timing chip the card's own sentence does not
   * explain is the app inventing advice.
   */
  timingOnPrefer?: boolean;
  /**
   * What the card says when the catalogue holds nothing to route to. Null
   * means the nutrient is excluded outright rather than kept with a note —
   * only correct for a food the user does not eat, never for a reaction.
   */
  soloReason: string | null;
  /** the line under "what was left out" */
  swappedWhy: string;
}

const SWAP_RULES: SwapRule[] = [
  {
    when: 'no-fish',
    from: 'diet',
    group: NUTRIENT.omega3,
    // "Vegan" on an omega-3 label means algal; there is no vegan fish oil
    prefer: [/algal/, /algae/, /vegan/, /schizochytrium/],
    avoid: null,
    reason: 'Algal rather than fish oil, because you don’t eat fish.',
    soloReason: null,
    swappedWhy: 'you don’t eat fish, and this one is fish-derived',
  },
  {
    when: 'iron-gi',
    from: 'reactions',
    group: NUTRIENT.iron,
    prefer: [/glycinate/],
    avoid: [/sulfate/, /sulphate/, /fumarate/],
    reason: 'Bisglycinate rather than sulfate, since iron has upset your stomach before.',
    soloReason: 'This is the only iron we have — take it with food.',
    swappedWhy: 'iron has upset your stomach, and the bisglycinate is gentler',
  },
  {
    when: 'mag-gi',
    from: 'reactions',
    group: NUTRIENT.magnesium,
    prefer: [/glycinate/],
    // citrate and oxide draw water into the bowel; glycinate does not. Other
    // salts — threonate, malate — are neither preferred nor avoided.
    avoid: [/citrate/, /oxide/],
    reason: 'Glycinate rather than citrate, since magnesium has loosened your stools before.',
    soloReason: 'This is the only magnesium we have — take it with food.',
    swappedWhy: 'citrate and oxide are the loosening ones, and the glycinate is not',
  },
  {
    when: 'fishoil-burp',
    from: 'reactions',
    group: NUTRIENT.omega3,
    prefer: [/algal/, /algae/, /vegan/, /schizochytrium/, /enteric/],
    avoid: null,
    reason: 'Algal rather than fish oil, since fish oil repeats on you.',
    timingOnPrefer: true,
    soloReason: 'This is the only omega-3 we have — take it with food.',
    swappedWhy: 'fish oil repeats on you, and the algal one does not',
  },
  {
    when: 'niacin-flush',
    from: 'reactions',
    group: NUTRIENT.niacin,
    prefer: [/niacinamide/, /nicotinamide/],
    // flushing is specific to nicotinic acid; the amide form does not do it
    avoid: [/\bniacin\b/, /nicotinic/],
    reason: 'Niacinamide rather than nicotinic acid — flushing is specific to that form.',
    soloReason: 'This is the only B3 we have — take it with food.',
    swappedWhy: 'flushing comes from the nicotinic acid form, and niacinamide does not flush',
  },
];

/* ── scoring ─────────────────────────────────────────────────────────── */

interface Draft {
  entry: GlossaryEntry;
  text: string;
  form: FormClass;
  goalHits: string[];
  score: number;
  reasons: { priority: number; text: string }[];
  amountFactor: number;
  /** said alongside the top reason, because an adjusted figure with no
      explanation is worse than a longer card */
  amountNote: string | null;
  timing: 'with_food' | null;
  /** same again for the timing: a chip the card cannot explain is advice the
      app has invented. Null where the top reason already says it. */
  timingNote: string | null;
  required: boolean;
  swappedWhy: string | null;
}

const say = (d: Draft, priority: number, text: string) => d.reasons.push({ priority, text });

const WITH_FOOD = 'Take it with food.';
const ZINC_WITH_FOOD =
  'With food rather than on an empty stomach, since zinc has made you nauseous.';

/**
 * Everything the user answered, applied to the catalogue.
 *
 * With no goal tags at all only rule-promoted entries survive, which is a list
 * of one or two rather than an error — the caller substitutes default goals
 * before it gets here, so that case is defensive rather than expected.
 */
export function recommend(entries: GlossaryEntry[], answers: Answers): RecommendResult {
  const already = new Set(
    answers.currentStack.map((s) => s.trim().toLowerCase()).filter(Boolean),
  );
  const wanted = new Set(answers.goalTags);
  const diet = new Set(answers.diet);
  const reactions = new Set(answers.reactions);

  const alreadyTaking = entries
    .filter((e) => already.has(e.name.toLowerCase()))
    .map((e) => e.name);

  const drafts: Draft[] = entries
    /* Supplements only. Ranking peptides for a specific person is a
       recommendation whether or not an amount is attached, and it is the same
       rule the assistant is held to — enforced here in code rather than left
       to whatever the tag overlap happens to return. */
    .filter((e) => (e.kind ?? 'peptide') === 'supplement')
    // no point suggesting what they told us they already take
    .filter((e) => !already.has(e.name.toLowerCase()))
    .map((e) => {
      const goalHits = (e.goal_tags ?? []).filter((t) => wanted.has(t));
      return {
        entry: e,
        text: textOf(e),
        form: classifyForm(e.product_form),
        goalHits,
        score: goalHits.length * W.goalHit + (EVIDENCE[e.evidence ?? 'thin'] ?? 0),
        reasons: [],
        amountFactor: 1,
        amountNote: null,
        timing: null,
        timingNote: null,
        required: false,
        swappedWhy: null,
      } satisfies Draft;
    });

  /* diet: priority and requirement ------------------------------------- */

  for (const rule of DIET_RULES) {
    if (!diet.has(rule.when)) continue;
    for (const d of drafts) {
      if (!hits(d.text, rule.group)) continue;
      d.score += rule.required ? W.required : W.dietPriority;
      d.required ||= rule.required === true;
      if (rule.amountFactor) {
        d.amountFactor *= rule.amountFactor;
        d.amountNote = rule.reason;
      }
      say(d, rule.required ? P.required : P.diet, rule.reason);
    }
  }

  /* swaps: which product of a nutrient, never whether ------------------- */

  const swappedOut: SwappedOut[] = [];

  for (const rule of SWAP_RULES) {
    const answered = rule.from === 'diet' ? diet : reactions;
    if (!answered.has(rule.when)) continue;

    const group = drafts.filter((d) => hits(d.text, rule.group));
    const preferred = group.filter((d) => hits(d.text, rule.prefer));

    for (const d of group) {
      if (preferred.includes(d)) {
        d.score += W.preferredForm;
        if (rule.timingOnPrefer) {
          d.timing = 'with_food';
          d.timingNote = WITH_FOOD;
        }
        say(d, P.swap, rule.reason);
        continue;
      }
      // not the preferred form: either something to route away from, or a
      // salt the rule has no opinion about (magnesium threonate, say)
      if (rule.avoid && !hits(d.text, rule.avoid)) continue;

      if (preferred.length > 0) {
        d.swappedWhy = rule.swappedWhy;
      } else if (rule.soloReason) {
        /* Nothing to route to. Keep the nutrient and say so plainly rather
           than dropping it — a reaction changes which product, not whether.
           No score change either: there is no sibling to sink it below, and
           demoting the only iron someone can have is not an improvement.
           No timing note: soloReason ends with the food clause itself. */
        d.timing = 'with_food';
        say(d, P.swap, rule.soloReason);
      } else {
        // a food they do not eat, with no alternative in the catalogue
        d.swappedWhy = rule.swappedWhy;
      }
    }
  }

  /* reactions that change the timing rather than the product ------------ */

  if (reactions.has('zinc-nausea')) {
    for (const d of drafts) {
      if (!hits(d.text, NUTRIENT.zinc)) continue;
      d.timing = 'with_food';
      d.timingNote = ZINC_WITH_FOOD;
      say(d, P.timing, ZINC_WITH_FOOD);
    }
  }

  /* form: a re-rank, never a filter (spec 2.3) -------------------------- */

  const hardToSwallow = reactions.has('large-caps');
  if (hardToSwallow) {
    for (const d of drafts) {
      if (EASY_TO_SWALLOW.includes(d.form)) {
        d.score += W.swallowable;
        say(d, P.swallowable, `A ${d.form} rather than capsules, since capsules are hard to swallow.`);
      } else if (HARD_TO_SWALLOW.includes(d.form)) {
        d.score -= W.swallowable;
      }
    }
  }

  /* Someone who said capsules are hard to swallow and then ticked capsules
     contradicted themselves; trust the problem over the preference. */
  const stated = answers.forms
    .map((f) => FORM_OPTION[f])
    .filter((f): f is FormClass => Boolean(f))
    .filter((f) => !(hardToSwallow && HARD_TO_SWALLOW.includes(f)));

  for (const d of drafts) {
    if (!stated.includes(d.form)) continue;
    d.score += W.formPreference;
    say(d, P.formPreference, `You said you prefer ${FORM_PLURAL[d.form]}.`);
  }

  /* the reason that was always there ------------------------------------ */

  for (const d of drafts) {
    if (d.goalHits.length === 0) continue;
    say(
      d,
      P.goal,
      `Tagged ${d.goalHits.join(' and ')} — matches ${answers.goalLabel}.`,
    );
  }

  /* out ---------------------------------------------------------------- */

  const kept = drafts.filter((d) => d.goalHits.length > 0 || d.required);

  for (const d of kept) {
    if (d.swappedWhy) swappedOut.push({ name: d.entry.name, why: d.swappedWhy });
  }

  const ranked = kept
    .filter((d) => !d.swappedWhy)
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
    .map((d) => {
      const top = d.reasons.sort((x, y) => y.priority - x.priority)[0]?.text ?? '';
      /* An adjusted figure and a with-food chip each need their sentence even
         when a louder rule owns the line — an unexplained 32 mg, or a chip
         nothing on the card accounts for, is worse than a second sentence.
         Two is the most this can produce. */
      const also = [d.amountNote, d.timingNote].filter((t): t is string => !!t && t !== top);
      return {
        entry: d.entry,
        score: d.score,
        goalHits: d.goalHits,
        reason: [top, ...also].filter(Boolean).join(' '),
        amountFactor: d.amountFactor,
        timing: d.timing,
      } satisfies Suggestion;
    });

  /* De-duplicated by glossary id after scoring, never before: two rules can
     reach the same product by different routes, and dropping one early would
     drop its reason with it. */
  const seen = new Map<string, Suggestion>();
  for (const s of ranked) if (!seen.has(s.entry.id)) seen.set(s.entry.id, s);

  return { ranked: Array.from(seen.values()), swappedOut, alreadyTaking };
}
