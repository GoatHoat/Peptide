/**
 * Interpreting what somebody typed in their own words.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RULE THIS FILE EXISTS TO ENFORCE. A model's reading of free text may
 * inform what the assistant SAYS. It may never silently change a dose, a
 * schedule or a safety warning.
 *
 * So the model is asked for structure, and then every part of that structure is
 * checked in code before anything is stored. Not by asking it nicely in a
 * prompt — by resolving each proposed ingredient against `ingredient_synonym`
 * and dropping what does not resolve, and by rejecting any tag outside the
 * enum. `raw_text` is never touched.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHEN. Lazily, on the first assistant turn after a note was written — never
 * during onboarding. A model call in the middle of that flow adds latency to
 * the one sequence that cannot afford it, costs money for every signup
 * including the ones that never come back, and fails badly offline.
 */

/** The reaction taxonomy the rules already use, plus an escape hatch. */
export const FACT_TAGS = [
  'iron-gi',
  'mag-gi',
  'fishoil-burp',
  'niacin-flush',
  'large-caps',
  'zinc-nausea',
  'other',
] as const;

export type FactTag = (typeof FACT_TAGS)[number];

/** Below this the model is guessing, and a guess gets no tags. */
export const MIN_CONFIDENCE = 0.6;

export const INTERPRET_TOOL = {
  name: 'interpret_note',
  description:
    'Turn one sentence a person wrote about a supplement reaction into structure. Summarise in one line, tag it against the fixed list, and name any supplement ingredients it mentions. If the note describes something medical rather than a product reaction — a diagnosis, a prescription, pregnancy, or symptoms that need care — use the tag "other", name no ingredients, and say so in the summary.',
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'One line, under 120 characters, in the third person.',
      },
      tags: {
        type: 'array',
        items: { type: 'string', enum: FACT_TAGS as unknown as string[] },
      },
      ingredient_names: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Supplement ingredients the note names, as ordinary words — "magnesium", "fish oil". Empty if it names none.',
      },
      confidence: {
        type: 'number',
        description: '0 to 1. How confident you are that the tags and ingredients are right.',
      },
    },
    required: ['summary', 'tags', 'ingredient_names', 'confidence'],
    additionalProperties: false,
  },
} as const;

export interface RawInterpretation {
  summary?: unknown;
  tags?: unknown;
  ingredient_names?: unknown;
  confidence?: unknown;
}

export interface Interpretation {
  summary: string;
  tags: FactTag[];
  /** ordinary words, still to be resolved against the synonym table */
  ingredientNames: string[];
  confidence: number;
  /** names the model proposed that resolved to nothing, for the log */
  discarded: string[];
}

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

/**
 * Everything the model returned, reduced to what is allowed.
 *
 * Deliberately total: anything unexpected becomes an empty list rather than an
 * exception, because a malformed interpretation must degrade to "we learned
 * nothing from this note" and never to a broken assistant turn.
 */
export function readInterpretation(raw: RawInterpretation): Interpretation | null {
  const summary = str(raw.summary);
  if (!summary) return null;

  const allowed = new Set<string>(FACT_TAGS);
  const tags = Array.isArray(raw.tags)
    ? (raw.tags.filter((t): t is FactTag => typeof t === 'string' && allowed.has(t)) as FactTag[])
    : [];

  const ingredientNames = Array.isArray(raw.ingredient_names)
    ? raw.ingredient_names.map(str).filter((v): v is string => v !== null)
    : [];

  const confidence =
    typeof raw.confidence === 'number' && Number.isFinite(raw.confidence)
      ? Math.max(0, Math.min(1, raw.confidence))
      : 0;

  /* A medical note gets no ingredient keys whatever it named. The assistant
     may mention it; nothing in the rules may act on it. */
  const medical = tags.includes('other');

  return {
    summary: summary.slice(0, 200),
    tags: confidence < MIN_CONFIDENCE ? [] : tags,
    ingredientNames: medical || confidence < MIN_CONFIDENCE ? [] : ingredientNames,
    confidence,
    discarded: [],
  };
}

/**
 * Keep only the names the catalogue actually knows.
 *
 * The model may propose "magnesium" and be right, or "sea moss complex" and be
 * proposing something that resolves to nothing. The second must not be stored:
 * an invented key reaching `recommend.ts` would move somebody's schedule for a
 * reason that does not exist.
 */
export async function resolveIngredientNames(
  /** one name -> its canonical key, or null. The caller supplies the lookup so
      this file stays free of database types and stays testable. */
  resolve: (name: string) => Promise<string | null>,
  names: string[],
): Promise<{ keys: string[]; discarded: string[] }> {
  const keys: string[] = [];
  const discarded: string[] = [];

  for (const name of names.slice(0, 8)) {
    let key: string | null = null;
    try {
      key = await resolve(name);
    } catch {
      key = null;
    }
    if (!key) discarded.push(name);
    else if (!keys.includes(key)) keys.push(key);
  }

  return { keys, discarded };
}
