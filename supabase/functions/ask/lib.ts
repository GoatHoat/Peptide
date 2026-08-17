/**
 * The pure half of the `ask` edge function: request validation, the scope
 * rules, the rate-limit arithmetic, prompt assembly, and turning what the
 * model asked for into cards the app can render.
 *
 * Nothing in here touches Deno, the network or the clock — `index.ts` owns all
 * three and passes in what it read. That split is the whole point: it lets
 * `tests/unit/ask.spec.ts` run this file in Node, and it is why this file is in
 * `tsconfig.json`'s include list while `index.ts`, which needs Deno globals,
 * is not.
 */

// ============================================================================
// Limits and constants
// ============================================================================

/** Claude Haiku 4.5 — $1/$5 per MTok against Opus 5's $5/$25. The assistant
 * retrieves from a supplied catalogue and summarises; the guardrails that matter
 * (peptides filtered out of the candidate set, citations validated against the
 * database, upper limits checked after the response) are enforced in code here,
 * not by the model's judgement. So a smaller model costs answer quality, not
 * compliance. */
export const MODEL = 'claude-haiku-4-5';

/**
 * A hard cap on what one response can cost, not a target.
 *
 * 8192 was a runaway ceiling — enough for an answer several times longer than
 * anyone reads, and output bills at five times input. 2000 is ample for a full
 * answer plus three cards with rationales. The assistant still answers at
 * whatever length the question needs; a question about four interacting
 * products gets a real answer inside this.
 *
 * If a response ever does hit it, `stop_reason` comes back as `max_tokens` and
 * the client says so rather than showing a sentence that stops mid-word.
 */
export const MAX_TOKENS = 2000;

/**
 * Claude Haiku 4.5, dollars per million tokens.
 *
 * One place, so a price change is one edit and the number in the database
 * cannot drift from the number on the invoice.
 */
export const RATES = { input: 1.0, output: 5.0, cacheRead: 0.1, cacheWrite5m: 1.25 } as const;

export interface ModelUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

/** What one call cost, from what the API reported it used. */
export function costOf(usage: ModelUsage | undefined): {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  usd: number;
} {
  const input = usage?.input_tokens ?? 0;
  const output = usage?.output_tokens ?? 0;
  const cacheRead = usage?.cache_read_input_tokens ?? 0;
  const cacheWrite = usage?.cache_creation_input_tokens ?? 0;
  const usd =
    (input * RATES.input +
      output * RATES.output +
      cacheRead * RATES.cacheRead +
      cacheWrite * RATES.cacheWrite5m) /
    1_000_000;
  return { input, output, cacheRead, cacheWrite, usd };
}

/**
 * The ceiling, in dollars a calendar month, per tier.
 *
 * Dollars rather than tokens because a token allowance does not cap cost: the
 * same 2.5M tokens is about $0.97 with the cache working and around $2.60
 * without it — the same allowance, nearly triple the bill, exactly when a brake
 * matters most.
 *
 * $29.99 a year is $2.12 a month after Apple's 15% Small Business rate, so
 * $1.00 is under half of that at the absolute maximum. Nobody legitimate
 * reaches it; if caching underperforms the same budget simply yields fewer
 * messages, which is correct behaviour rather than a bug.
 */
export const MONTHLY_BUDGET_USD = { free: 0.02, pro: 1.0 } as const;

/**
 * The user's own message. Never the assistant's reply — that answers at
 * whatever length the question needs.
 *
 * 240 is about 60 tokens, so this is not really a cost control; the input side
 * of the bill is the catalogue, not the question. It is here because short
 * questions get short answers, and output bills at five times input. The
 * assistant already loads age, sex, diet, reactions, goals, stack and schedule
 * server-side, so the question can be short without the answer getting worse —
 * if answers start degrading, raise this rather than keep it.
 *
 * Enforced here as well as on the textarea, because a client limit is a
 * suggestion.
 */
export const MAX_QUESTION_CHARS = 240;

/**
 * Turns of prior conversation carried into the request, newest kept.
 *
 * Six rather than twelve: a long conversation should not get progressively more
 * expensive with every message, and the profile block carries the standing
 * facts anyway, so the history only has to hold the last exchange or two.
 */
export const MAX_HISTORY_TURNS = 6;

/** The answer shows at most three products. More is a list, not an answer. */
export const MAX_CARDS = 3;

/** Products the model may open in one `get_product_detail` call. */
export const MAX_DETAIL_SLUGS = 5;

/** Tool round trips before we stop and answer with what we have. */
export const MAX_TOOL_ROUNDS = 4;

/** Papers attached to a card. The sheet can fetch the rest. */
export const MAX_CITATIONS_PER_CARD = 3;

/**
 * The first line of defence, and only that. It stops a runaway loop inside an
 * hour; the monthly budget is what stops sustained expense.
 */
export const RATE_LIMIT = { perHour: 20, perDay: 40 };

/**
 * Assistant messages a free account gets, ever. Not per month, not per day.
 * `ask_usage` already records every call, so the count is the table.
 */
export const FREE_ASK_LIFETIME = 3;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// ============================================================================
// Wire types
// ============================================================================

export type AskRole = 'user' | 'assistant';

export interface AskTurn {
  role: AskRole;
  text: string;
}

export interface AskRequest {
  question: string;
  history: AskTurn[];
}

export type AskErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'rate_limited'
  | 'upgrade_required'
  | 'server_error';

export interface AskErrorBody {
  error: { code: AskErrorCode; message: string; retry_after?: number };
}

export interface AskCitation {
  title: string;
  meta: string | null;
  url: string | null;
}

export interface AskCard {
  slug: string;
  name: string;
  /**
   * 'supplement' or 'peptide'. Peptide cards are never numbered and never
   * offered to the schedule — the ranking is the part that turns a reference
   * list into a personalised recommendation, and that is the line this product
   * does not cross for unapproved compounds. See PROMPT_V2.md section 3.
   */
  kind: string | null;
  /**
   * 1-based position, best first, or null where ranking does not apply.
   * The model is told the order it passes items in is the order shown.
   */
  rank: number | null;
  brand: string | null;
  form: string | null;
  /** one line, the model's reason for this product for this person */
  reason: string;
  timing: string | null;
  timing_note: string | null;
  evidence: string | null;
  label_url: string | null;
  citations: AskCitation[];
}

export interface AskUsage {
  remaining_hour: number;
  remaining_day: number;
  resets_at: string;
}

export interface AskAnswer {
  answer: string;
  cards: AskCard[];
  usage: AskUsage;
  /**
   * True when the wording came from `fixtures.ts` rather than the model —
   * either because no ANTHROPIC_API_KEY is set, or because the question was
   * refused by the scope gate before the model was called.
   */
  stub: boolean;
}

/** One glossary row, trimmed to what the assistant is allowed to see. */
export interface CatalogueEntry {
  slug: string;
  name: string;
  brand: string | null;
  product_form: string | null;
  goal_tags: string[];
  kind: string | null;
  timing: string | null;
  timing_note: string | null;
  evidence: string | null;
  mechanism_summary: string | null;
  label_url: string | null;
  ods_url: string | null;
}

/** What `show_products` asks for, after validation. */
export interface RequestedCard {
  slug: string;
  reason: string;
}

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

// ============================================================================
// Request validation
// ============================================================================

export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * Parses the POST body. Everything the client sends is treated as hostile:
 * the question is length-capped, the history is trimmed to the last
 * MAX_HISTORY_TURNS and anything that is not a plain user/assistant turn is
 * dropped rather than rejected, because a stale client should still get an
 * answer.
 */
export function parseRequest(raw: unknown): Parsed<AskRequest> {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, message: 'Send a JSON object with a question.' };
  }
  const body = raw as Record<string, unknown>;
  const question = (asString(body.question) ?? '').trim();
  if (!question) return { ok: false, message: 'Ask a question first.' };
  if (question.length > MAX_QUESTION_CHARS) {
    return { ok: false, message: `Questions are limited to ${MAX_QUESTION_CHARS} characters.` };
  }

  const history: AskTurn[] = [];
  if (Array.isArray(body.history)) {
    for (const item of body.history) {
      if (item === null || typeof item !== 'object') continue;
      const turn = item as Record<string, unknown>;
      const role = asString(turn.role);
      const text = (asString(turn.text) ?? '').trim();
      if ((role !== 'user' && role !== 'assistant') || !text) continue;
      history.push({ role, text: text.slice(0, MAX_QUESTION_CHARS) });
    }
  }

  return { ok: true, value: { question, history: history.slice(-MAX_HISTORY_TURNS) } };
}

// ============================================================================
// Scope — what this assistant will not answer, decided before the model runs
// ============================================================================

export type AskScope = 'ok' | 'peptide' | 'pregnancy';

/**
 * Peptide names the app should recognise even when the catalogue does not hold
 * them. `index.ts` adds every `kind = 'peptide'` name and slug from the
 * glossary on top of this; the hardcoded list covers what people ask about but
 * the library has never listed.
 *
 * Deliberately no bare "peptide": the catalogue sells Vital Proteins Collagen
 * Peptides and a casein decapeptide, and refusing to talk about a product we
 * list would be worse than the thing this list is guarding against.
 */
export const PEPTIDE_TERMS = [
  'bpc-157', 'tb-500', 'tb4', 'thymosin beta-4', 'thymosin alpha-1',
  'cjc-1295', 'ipamorelin', 'sermorelin', 'tesamorelin', 'hexarelin',
  'ghrp-2', 'ghrp-6', 'ghrh', 'hgh', 'igf-1', 'igf-1 lr3', 'mk-677', 'ibutamoren',
  'semaglutide', 'tirzepatide', 'retatrutide', 'liraglutide', 'aod-9604',
  'ghk-cu', 'copper peptide', 'melanotan', 'pt-141', 'bremelanotide',
  'mots-c', 'humanin', 'ss-31', 'epitalon', 'pinealon', 'dsip', 'selank',
  'semax', 'kisspeptin', 'follistatin', 'thymulin', 'larazotide', 'p21',
  'cortexin', 'cerebrolysin', 'snap-8', 'matrixyl',
];

/** Route words. The product has no injection UI anywhere, by design. */
const ROUTE_PATTERNS = [
  /\binject/,
  /\bsubcutaneous/,
  /\bintramuscular/,
  /\breconstitut/,
  /\bsyringe/,
  /\bbacteriostatic/,
];

const PREGNANCY_TERMS = [
  'pregnant', 'pregnancy', 'breastfeeding', 'breast feeding', 'breastfeed',
  'lactating', 'lactation', 'trying to conceive', 'ttc', 'ivf',
  'trimester', 'postpartum', 'prenatal',
];

/** lowercase, punctuation to single spaces, padded so `\b`-style tests are cheap */
function spaced(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

function squashed(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function mentions(haystackSpaced: string, haystackSquashed: string, term: string): boolean {
  const normalised = spaced(term).trim();
  if (!normalised) return false;
  if (haystackSpaced.includes(` ${normalised} `)) return true;
  // "BPC157" and "TB500" are how people actually type them. Only terms that
  // carry a digit get the squashed pass — squashing a short word like "vip"
  // and matching it unanchored would fire on half the language.
  if (/\d/.test(normalised)) return haystackSquashed.includes(normalised.replace(/ /g, ''));
  return false;
}

export function isPeptideQuestion(question: string, extraTerms: string[] = []): boolean {
  const hay = spaced(question);
  const squash = squashed(question);
  if (ROUTE_PATTERNS.some((re) => re.test(hay))) return true;
  for (const term of PEPTIDE_TERMS) if (mentions(hay, squash, term)) return true;
  for (const term of extraTerms) if (mentions(hay, squash, term)) return true;
  return false;
}

export function isPregnancyQuestion(question: string): boolean {
  const hay = spaced(question);
  const squash = squashed(question);
  return PREGNANCY_TERMS.some((term) => mentions(hay, squash, term));
}

/**
 * The server-side gate. It runs before the model does and cannot be talked out
 * of its answer, which is the entire reason it is here rather than in the
 * system prompt.
 *
 * Pregnancy is checked first: "is BPC-157 safe while pregnant" wants the
 * see-a-clinician answer more than it wants the we-don't-advise-on-peptides
 * one, and both decline.
 */
export function classifyScope(question: string, peptideTerms: string[] = []): AskScope {
  if (isPregnancyQuestion(question)) return 'pregnancy';
  if (isPeptideQuestion(question, peptideTerms)) return 'peptide';
  return 'ok';
}

// ============================================================================
// Rate limiting
// ============================================================================

export interface RateVerdict {
  allowed: boolean;
  remaining_hour: number;
  remaining_day: number;
  /** when the next slot frees up */
  resets_at: string;
  /** seconds; 0 when allowed */
  retry_after: number;
}

/**
 * Given every call this user has made in the last day, decide whether this one
 * goes through. Both windows are rolling — a fixed hourly bucket lets someone
 * spend the whole allowance twice across a boundary.
 */
export function rateVerdict(nowMs: number, stampsMs: number[]): RateVerdict {
  const inDay = stampsMs.filter((t) => t > nowMs - DAY_MS).sort((a, b) => a - b);
  const inHour = inDay.filter((t) => t > nowMs - HOUR_MS);

  const remaining_hour = Math.max(0, RATE_LIMIT.perHour - inHour.length);
  const remaining_day = Math.max(0, RATE_LIMIT.perDay - inDay.length);
  const allowed = remaining_hour > 0 && remaining_day > 0;

  let resetMs: number;
  if (remaining_hour === 0 && inHour.length > 0) resetMs = inHour[0] + HOUR_MS;
  else if (remaining_day === 0 && inDay.length > 0) resetMs = inDay[0] + DAY_MS;
  else if (inHour.length > 0) resetMs = inHour[0] + HOUR_MS;
  else resetMs = nowMs + HOUR_MS;

  return {
    allowed,
    remaining_hour,
    remaining_day,
    resets_at: new Date(resetMs).toISOString(),
    retry_after: allowed ? 0 : Math.max(1, Math.ceil((resetMs - nowMs) / 1000)),
  };
}

// ============================================================================
// The prompt
// ============================================================================

/**
 * The rules, stated once and plainly. Everything here is either a product
 * decision (no doses, no peptides) or a fact the model cannot know (what this
 * app is, what the cards do). Nothing restates what the model already does.
 */
export const INSTRUCTIONS = [
  'You are the assistant inside Pepstack, an app that schedules supplements around',
  "someone's meals and sleep. You are talking to one person about their own stack.",
  '',
  'What you do:',
  '- Answer from the catalogue below. It is the only set of products that exists here.',
  '',
  'ASK BEFORE YOU RECOMMEND. When someone asks what to take for something — skin, sleep,',
  'energy, anything — do not answer with products on the first turn. Ask one or two short',
  'questions first, then recommend on the next turn. "What should I take for my skin"',
  'covers acne, dryness, ageing and hair, and those are different products; answering',
  'immediately means guessing which one they meant and being wrong most of the time.',
  '',
  '- Ask at most two questions, in one message, as plain sentences. Not a numbered list,',
  '  not a form.',
  '- Only ask what you do not already know. The profile below carries their age, sex,',
  '  diet, what has disagreed with them and which forms they prefer — asking again for',
  '  any of it reads as not having looked.',
  '- Good questions narrow the product: what specifically they want to change, how long',
  '  it has been going on, what they have already tried.',
  '- If they have already told you enough, or they push back and ask for the answer,',
  '  recommend straight away. Asking twice is worse than guessing once.',
  '',
  '- Suggest at most three products, by calling show_products, once you know enough.',
  '  Questions about timing, interactions or what something does usually need no cards',
  '  at all.',
  '- The order you pass them in is the order they are shown, numbered 1 to 3, best first.',
  '  Put the one you would actually pick at the top and mean it.',
  '- Call get_product_detail before answering about a specific product. The index below',
  '  carries names and goals only.',
  '- Say when the evidence is thin. The catalogue records that, and hiding it is the one',
  '  thing that would make this app worth less than a search engine.',
  '',
  'What you never do:',
  '- Never give a dose, an amount, a strength, a schedule of amounts, or a protocol. The',
  '  app shows reference intakes from the NIH alongside the card; restating or adjusting',
  '  them is the one thing this product must not do.',
  '- Never name a product that is not in the catalogue. A slug that is not in the index',
  '  is dropped before the person sees it, so the card would simply not appear.',
  '- Never advise on peptides — no doses, no sourcing, no protocols, no injections. The',
  '  library lists them as reference and that is all.',
  '- Never diagnose, never interpret symptoms or blood results, and never tell someone to',
  '  start, stop or change a prescription. Say to ask a pharmacist or doctor instead.',
  '',
  'How to write:',
  '- Do not restate the question. Do not narrate what you are about to do. Do not summarise',
  '  at the end. Answer directly, at whatever length the question actually needs.',
  '- Sentence case. No lists unless asked, no exclamation marks, no headings, no bold.',
  '- Most questions need two or three sentences. A question about several things',
  '  interacting needs more, and should get it — a truncated answer is worse than a',
  '  long one.',
  '- The cards carry the name, brand, form, timing and papers. Do not repeat them in the',
  '  text; say the thing the cards cannot say.',
  '- If the honest answer is that nothing here helps, say that.',
].join('\n');

export function catalogueLine(entry: CatalogueEntry): string {
  const goals = entry.goal_tags.length ? entry.goal_tags.join('/') : 'no goal';
  const form = entry.product_form ? `, ${entry.product_form}` : '';
  return `${entry.slug} | ${entry.name}${form} | ${goals}`;
}

/**
 * Everything that could plausibly answer this person's question.
 *
 * The whole supplement catalogue is ~23,800 characters, about 6,600 input
 * tokens on every single message including "thanks". Somebody whose goals are
 * Sleep and Focus does not need the 41 recovery products in context to be
 * answered well.
 *
 * Two deliberate softenings, because a filter that hides a real answer is worse
 * than a filter that saves nothing:
 *
 * - a product with **no** goal tags is always kept, since an untagged row is
 *   missing data rather than an irrelevant product;
 * - below `MIN_CATALOGUE`, the filter gives up and returns everything. A person
 *   with one narrow goal must not get a worse assistant than one with six.
 *
 * Measured against the live catalogue of 250 supplements: Sleep+Mood 83%
 * smaller, Focus 81%, Immune+Gut Health 78%, Skin+Anti-Aging 68%,
 * Energy+Recovery 61%. Injury (11 products) and Growth+Muscle (39) fall back
 * to the full list, which is the floor doing its job.
 *
 * With no goals on file this returns the catalogue unchanged, which is the
 * pre-existing behaviour.
 */
export const MIN_CATALOGUE = 40;

export function relevantCatalogue(
  catalogue: CatalogueEntry[],
  goalTags: string[],
): CatalogueEntry[] {
  if (goalTags.length === 0) return catalogue;
  const wanted = new Set(goalTags.map((t) => t.toLowerCase()));
  const kept = catalogue.filter(
    (entry) =>
      entry.goal_tags.length === 0 ||
      entry.goal_tags.some((tag) => wanted.has(tag.toLowerCase())),
  );
  return kept.length >= MIN_CATALOGUE ? kept : catalogue;
}

/**
 * The catalogue index.
 *
 * `index.ts` puts the cache breakpoint on this. Note what that now means: the
 * block is the same bytes for everyone **with the same goals**, not for
 * everyone — so the cache is shared across a cohort rather than across all
 * users. That is still most of the saving, because the block is read back on
 * the next message in the same conversation, which is where the repetition
 * actually is.
 */
export function buildCatalogueBlock(catalogue: CatalogueEntry[]): string {
  const lines = catalogue.map(catalogueLine);
  return [
    'CATALOGUE — slug | product | goals. Suggest nothing that is not on this list.',
    '',
    ...lines,
  ].join('\n');
}

/** What `get_product_detail` hands back to the model. */
export function buildDetail(entry: CatalogueEntry, citations: AskCitation[]): string {
  const parts = [
    `${entry.slug} — ${entry.name}`,
    entry.brand ? `brand: ${entry.brand}` : null,
    entry.product_form ? `form: ${entry.product_form}` : null,
    entry.goal_tags.length ? `goals: ${entry.goal_tags.join(', ')}` : null,
    entry.mechanism_summary ? `what it is: ${entry.mechanism_summary}` : null,
    entry.timing ? `timing: ${entry.timing}` : null,
    entry.timing_note ? `timing note: ${entry.timing_note}` : null,
    entry.evidence ? `evidence: ${entry.evidence}` : 'evidence: not recorded',
  ].filter((line): line is string => line !== null);

  if (citations.length) {
    parts.push('papers on file:');
    for (const c of citations) parts.push(`- ${c.title}${c.meta ? ` (${c.meta})` : ''}`);
  } else {
    parts.push('papers on file: none');
  }
  return parts.join('\n');
}

export interface ProfileContext {
  age?: number | null;
  sex?: string | null;
  diet?: string[] | null;
  reactions?: string[] | null;
  reactions_note?: string | null;
  form_prefs?: string[] | null;
  wake_time?: string | null;
  sleep_time?: string | null;
}

/**
 * The person, in one paragraph, carried in the user turn rather than the
 * system prompt — the system prompt is the cached prefix and must be identical
 * for everybody. Absent fields are simply left out; the model is told nothing
 * it was not given.
 */
export function buildProfileBlock(profile: ProfileContext | null, stackNames: string[]): string {
  if (!profile && stackNames.length === 0) return 'About them: nothing on file.';
  const bits: string[] = [];
  if (profile?.age) bits.push(`${profile.age} years old`);
  if (profile?.sex === 'm') bits.push('male');
  else if (profile?.sex === 'f') bits.push('female');
  if (profile?.diet?.length) bits.push(`diet: ${profile.diet.join(', ')}`);
  if (profile?.reactions?.length) bits.push(`has reacted badly to: ${profile.reactions.join(', ')}`);
  if (profile?.reactions_note) bits.push(`in their words: "${profile.reactions_note}"`);
  if (profile?.form_prefs?.length) bits.push(`prefers: ${profile.form_prefs.join(', ')}`);
  if (profile?.wake_time && profile?.sleep_time) {
    bits.push(`awake ${profile.wake_time.slice(0, 5)} to ${profile.sleep_time.slice(0, 5)}`);
  }
  if (stackNames.length) bits.push(`already taking: ${stackNames.join(', ')}`);
  return bits.length ? `About them: ${bits.join('; ')}.` : 'About them: nothing on file.';
}

// ============================================================================
// Tools
// ============================================================================

/**
 * Two tools, both of which read the database. The model picks slugs; the
 * server materialises everything the person actually sees, so a hallucinated
 * product cannot reach a card.
 *
 * Neither is `strict`: strict tool use rejects array constraints like
 * maxItems, and the limits are enforced in `readDetailSlugs` / `readShowProducts`
 * regardless of what the model sends.
 */
export const TOOLS: ToolSpec[] = [
  {
    name: 'get_product_detail',
    description:
      'Read the full library entry for up to five catalogue products: what the product is, when it is taken, how strong the evidence is, and the papers on file. Call this before answering anything about a specific product — the catalogue index in the system prompt carries only slugs, names and goals.',
    input_schema: {
      type: 'object',
      properties: {
        slugs: {
          type: 'array',
          items: { type: 'string' },
          maxItems: MAX_DETAIL_SLUGS,
          description: 'Catalogue slugs, exactly as they appear in the index.',
        },
      },
      required: ['slugs'],
      additionalProperties: false,
    },
  },
  {
    name: 'show_products',
    description:
      'Show product cards to the person, at most three, in the order they should read them. Every slug must come from the catalogue index; anything else is dropped and no card appears. Call this once, after any lookups. The card already shows the name, brand, form, timing and papers, so the reason should say why this one for this person and nothing else.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          maxItems: MAX_CARDS,
          items: {
            type: 'object',
            properties: {
              slug: { type: 'string', description: 'A slug from the catalogue index.' },
              reason: {
                type: 'string',
                description:
                  'One short sentence, under 120 characters, saying why this product for this person. No dose, no amount.',
              },
            },
            required: ['slug', 'reason'],
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
];

export function readDetailSlugs(input: unknown): string[] {
  if (input === null || typeof input !== 'object') return [];
  const raw = (input as Record<string, unknown>).slugs;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const slug = asString(item)?.trim();
    if (slug && !out.includes(slug)) out.push(slug);
    if (out.length === MAX_DETAIL_SLUGS) break;
  }
  return out;
}

export function readShowProducts(input: unknown): RequestedCard[] {
  if (input === null || typeof input !== 'object') return [];
  const raw = (input as Record<string, unknown>).items;
  if (!Array.isArray(raw)) return [];
  const out: RequestedCard[] = [];
  for (const item of raw) {
    if (item === null || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const slug = asString(row.slug)?.trim();
    const reason = (asString(row.reason) ?? '').trim();
    if (!slug || out.some((c) => c.slug === slug)) continue;
    out.push({ slug, reason: reason.slice(0, 160) });
    if (out.length === MAX_CARDS) break;
  }
  return out;
}

// ============================================================================
// Cards
// ============================================================================

/**
 * Turns the slugs the model asked for into cards, using the database row for
 * every field the person sees. A slug the catalogue does not hold is dropped:
 * the alternative is rendering a product that does not exist.
 *
 * `fallback` is the stub path only — the fixtures name products from
 * migrations 0021 and 0022, which are written but not applied, so on a
 * database that has not had them run the fixture's own copy of the row stands
 * in rather than the answer arriving with no cards at all.
 */
export function buildCards(
  requested: RequestedCard[],
  catalogue: Map<string, CatalogueEntry>,
  citations: Map<string, AskCitation[]>,
  fallback?: Map<string, CatalogueEntry>,
): AskCard[] {
  const cards: AskCard[] = [];
  /* Ranking is decided once for the whole answer rather than per card: a set
     that contains a peptide is a reading list, and numbering three items where
     one of them is unranked would be worse than numbering none. */
  const picked = requested
    .slice(0, MAX_CARDS)
    .map((item) => ({ item, entry: catalogue.get(item.slug) ?? fallback?.get(item.slug) }))
    .filter((x): x is { item: RequestedCard; entry: CatalogueEntry } => !!x.entry);
  const rankable = picked.every((x) => (x.entry.kind ?? 'peptide') === 'supplement');

  for (const [i, { item, entry }] of picked.entries()) {
    cards.push({
      slug: entry.slug,
      name: entry.name,
      kind: entry.kind ?? null,
      rank: rankable ? i + 1 : null,
      brand: entry.brand,
      form: entry.product_form,
      reason: item.reason,
      timing: entry.timing,
      timing_note: entry.timing_note,
      evidence: entry.evidence,
      label_url: entry.label_url,
      citations: (citations.get(item.slug) ?? []).slice(0, MAX_CITATIONS_PER_CARD),
    });
  }
  return cards;
}
