/**
 * POST /functions/v1/ask — the assistant behind the Ask tab.
 *
 * Deno. This file is deliberately not in `tsconfig.json`'s include list: it
 * needs `Deno.env` and npm: specifiers, neither of which the app's TypeScript
 * config knows about. Everything that can be tested without a network lives in
 * `./lib.ts`, which is typechecked and unit tested.
 *
 * The order of operations matters and is the same on every request:
 *
 *   1. CORS, method, body.
 *   2. JWT. No valid bearer token, no answer — the catalogue is public but the
 *      model is not, and an unauthenticated function is a bill with a URL.
 *   3. Rate limit, from `ask_usage`. Counted before the model is called and
 *      before the fixtures are read, so the stub hits the same ceiling the live
 *      path does.
 *   4. Scope. Peptide and pregnancy questions are refused here, by the server,
 *      with fixed wording — before the model sees them. A rule in the system
 *      prompt can be argued with; this cannot.
 *   5. The answer. With no ANTHROPIC_API_KEY set it comes from `./fixtures.ts`.
 *      With one set it comes from Claude. Setting the key is the only
 *      difference between the two paths.
 *
 * SECRETS. `ANTHROPIC_API_KEY` is read from the environment and is absent by
 * design. It is never logged, never returned, and never reaches the client —
 * the client only ever learns whether an answer was stubbed. This function
 * runs on the caller's own JWT and the anon key, never the service role.
 *
 * DEPLOY: supabase functions deploy ask
 *         supabase secrets set ANTHROPIC_API_KEY=...   (only when going live)
 *         migration 0024 must be applied first, or every request 500s on the
 *         rate-limit read.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.117.1';

import {
  buildCards,
  buildCatalogueBlock,
  buildDetail,
  buildProfileBlock,
  classifyScope,
  INSTRUCTIONS,
  MAX_TOKENS,
  MAX_TOOL_ROUNDS,
  MODEL,
  parseRequest,
  rateVerdict,
  readDetailSlugs,
  readShowProducts,
  TOOLS,
} from './lib.ts';
import type {
  AskAnswer,
  AskCard,
  AskCitation,
  AskErrorCode,
  AskRequest,
  AskUsage,
  CatalogueEntry,
  ProfileContext,
  RequestedCard,
} from './lib.ts';
import { ANSWER_FIXTURES, ERROR_FIXTURES, pickFixture } from './fixtures.ts';

/** Opting into server-side refusal fallbacks; see callModel below. */
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function fail(code: AskErrorCode, message: string, status: number, retryAfter?: number): Response {
  const body = { error: { code, message, ...(retryAfter ? { retry_after: retryAfter } : {}) } };
  return json(body, status);
}

// ============================================================================
// Database reads
// ============================================================================

const CATALOGUE_COLUMNS =
  'id,slug,name,brand,product_form,goal_tags,kind,timing,timing_note,evidence,mechanism_summary,label_url,ods_url';

interface CatalogueRow extends CatalogueEntry {
  id: string;
}

function toEntry(row: Record<string, unknown>): CatalogueRow {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    brand: (row.brand as string) ?? null,
    product_form: (row.product_form as string) ?? null,
    goal_tags: Array.isArray(row.goal_tags) ? (row.goal_tags as string[]) : [],
    kind: (row.kind as string) ?? null,
    timing: (row.timing as string) ?? null,
    timing_note: (row.timing_note as string) ?? null,
    evidence: (row.evidence as string) ?? null,
    mechanism_summary: (row.mechanism_summary as string) ?? null,
    label_url: (row.label_url as string) ?? null,
    ods_url: (row.ods_url as string) ?? null,
  };
}

// ============================================================================
// Handler
// ============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('bad_request', 'Use POST.', 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    console.error('ask: SUPABASE_URL or SUPABASE_ANON_KEY missing from the environment');
    return fail('server_error', ERROR_FIXTURES.server_error.body.error.message, 500);
  }

  // ---- 1. body -------------------------------------------------------------
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail('bad_request', 'Send a JSON object with a question.', 400);
  }
  const parsed = parseRequest(raw);
  if (!parsed.ok) return fail('bad_request', parsed.message, 400);
  const request: AskRequest = parsed.value;

  // ---- 2. JWT --------------------------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return fail('unauthorized', 'Sign in to ask a question.', 401);
  }
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const user = auth?.user;
  if (authError || !user) {
    return fail('unauthorized', 'That session has expired. Sign in again.', 401);
  }

  try {
    // ---- 3. rate limit -----------------------------------------------------
    const now = Date.now();
    const since = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const { data: usageRows, error: usageError } = await supabase
      .from('ask_usage')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', since);
    if (usageError) throw usageError;

    const stamps = (usageRows ?? []).map((row: { created_at: string }) =>
      Date.parse(row.created_at),
    );
    const verdict = rateVerdict(now, stamps.filter((t: number) => Number.isFinite(t)));
    if (!verdict.allowed) {
      return fail(
        'rate_limited',
        ERROR_FIXTURES.rate_limit.body.error.message,
        429,
        verdict.retry_after,
      );
    }

    const { error: insertError } = await supabase.from('ask_usage').insert({ user_id: user.id });
    if (insertError) throw insertError;

    const usage: AskUsage = {
      remaining_hour: verdict.remaining_hour - 1,
      remaining_day: verdict.remaining_day - 1,
      resets_at: verdict.resets_at,
    };

    // ---- catalogue ---------------------------------------------------------
    const { data: glossaryRows, error: glossaryError } = await supabase
      .from('glossary')
      .select(CATALOGUE_COLUMNS)
      .order('name');
    if (glossaryError) throw glossaryError;

    const all = (glossaryRows ?? []).map(toEntry);
    const supplements = all.filter((row) => row.kind !== 'peptide');
    const peptideTerms = all
      .filter((row) => row.kind === 'peptide')
      .flatMap((row) => [row.name, row.slug]);

    const bySlug = new Map<string, CatalogueRow>();
    for (const row of supplements) bySlug.set(row.slug, row);

    // ---- 4. scope ----------------------------------------------------------
    const scope = classifyScope(request.question, peptideTerms);
    const hasKey = Boolean(Deno.env.get('ANTHROPIC_API_KEY'));

    if (scope !== 'ok') {
      const fixture = ANSWER_FIXTURES[scope];
      const answer: AskAnswer = { answer: fixture.answer, cards: [], usage, stub: true };
      return json(answer);
    }

    // ---- 5. answer ---------------------------------------------------------
    if (!hasKey) return await stubAnswer(supabase, request, bySlug, usage);
    return await liveAnswer(supabase, request, supplements, bySlug, user.id, usage);
  } catch (err) {
    // The message can carry a Postgres error or an upstream body; it stays in
    // the function log and never goes back to the client.
    console.error('ask: request failed', err);
    return fail('server_error', ERROR_FIXTURES.server_error.body.error.message, 500);
  }
});

// ============================================================================
// Citations
// ============================================================================

async function fetchCitations(
  supabase: ReturnType<typeof createClient>,
  entries: CatalogueRow[],
): Promise<Map<string, AskCitation[]>> {
  const out = new Map<string, AskCitation[]>();
  if (entries.length === 0) return out;
  const slugById = new Map(entries.map((e) => [e.id, e.slug]));
  const { data, error } = await supabase
    .from('glossary_research')
    .select('glossary_id,title,meta,url')
    .in('glossary_id', [...slugById.keys()]);
  if (error) throw error;
  for (const row of data ?? []) {
    const slug = slugById.get(String(row.glossary_id));
    if (!slug) continue;
    const list = out.get(slug) ?? [];
    list.push({
      title: String(row.title),
      meta: (row.meta as string) ?? null,
      url: (row.url as string) ?? null,
    });
    out.set(slug, list);
  }
  return out;
}

// ============================================================================
// The stub path — no key
// ============================================================================

async function stubAnswer(
  supabase: ReturnType<typeof createClient>,
  request: AskRequest,
  bySlug: Map<string, CatalogueRow>,
  usage: AskUsage,
): Promise<Response> {
  const key = pickFixture(request.question, 'ok');
  if (key === 'rate_limit' || key === 'server_error') {
    const fixture = ERROR_FIXTURES[key];
    return json(fixture.body, fixture.status);
  }

  const fixture = ANSWER_FIXTURES[key];
  const wanted = fixture.cards.map((card) => card.slug);
  const present = wanted
    .map((slug) => bySlug.get(slug))
    .filter((row): row is CatalogueRow => row !== undefined);

  const citations = await fetchCitations(supabase, present);
  // Fixture citations stand in for products the applied database does not hold
  // yet; a resolved product uses its own papers.
  for (const [slug, list] of Object.entries(fixture.citations)) {
    if (!citations.has(slug)) citations.set(slug, list);
  }

  const fallback = new Map<string, CatalogueEntry>();
  for (const row of fixture.products) fallback.set(row.slug, row);

  const cards = buildCards(fixture.cards, bySlug, citations, fallback);
  const answer: AskAnswer = { answer: fixture.answer, cards, usage, stub: true };
  return json(answer);
}

// ============================================================================
// The live path — a key is set
// ============================================================================

async function liveAnswer(
  supabase: ReturnType<typeof createClient>,
  request: AskRequest,
  supplements: CatalogueRow[],
  bySlug: Map<string, CatalogueRow>,
  userId: string,
  usage: AskUsage,
): Promise<Response> {
  const [profile, stackNames] = await Promise.all([
    loadProfile(supabase, userId),
    loadStackNames(supabase, userId),
  ]);

  const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

  const system = [
    { type: 'text', text: INSTRUCTIONS },
    // The catalogue is identical for every person, so the breakpoint goes here
    // and the whole prefix — tools included — is read back on the next request
    // rather than paid for again. Anything per-person goes in the user turn.
    {
      type: 'text',
      text: buildCatalogueBlock(supplements),
      cache_control: { type: 'ephemeral' },
    },
  ];

  const opening = `${buildProfileBlock(profile, stackNames)}\n\n${request.question}`;
  const messages: { role: 'user' | 'assistant'; content: unknown }[] = [
    ...request.history.map((turn) => ({ role: turn.role, content: turn.text })),
    { role: 'user' as const, content: opening },
  ];

  let requested: RequestedCard[] = [];
  let text = '';

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callModel(client, {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: { effort: 'medium' },
      system,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === 'refusal') {
      const answer: AskAnswer = {
        answer:
          'I cannot answer that one. If it is about something you are taking, ask it a different way and I will try again.',
        cards: [],
        usage,
        stub: false,
      };
      return json(answer);
    }

    const blocks: { type: string; text?: string; name?: string; id?: string; input?: unknown }[] =
      response.content ?? [];
    const said = blocks
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('\n')
      .trim();
    if (said) text = said;

    const calls = blocks.filter((block) => block.type === 'tool_use');
    if (response.stop_reason !== 'tool_use' || calls.length === 0) break;

    messages.push({ role: 'assistant', content: response.content });
    const results: unknown[] = [];
    for (const call of calls) {
      results.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: await runTool(supabase, call.name ?? '', call.input, bySlug, (cards) => {
          requested = cards;
        }),
      });
    }
    messages.push({ role: 'user', content: results });
  }

  const present = requested
    .map((card) => bySlug.get(card.slug))
    .filter((row): row is CatalogueRow => row !== undefined);
  const citations = await fetchCitations(supabase, present);
  const cards: AskCard[] = buildCards(requested, bySlug, citations);

  const answer: AskAnswer = {
    answer: text || 'I could not put an answer together for that. Try asking it a different way.',
    cards,
    usage,
    stub: false,
  };
  return json(answer);
}

/**
 * One model call, with server-side refusal fallbacks turned on. A health
 * question can trip a safety classifier; with `fallbacks: 'default'` the API
 * re-runs it on Anthropic's recommended model inside the same call rather than
 * handing back a refusal.
 *
 * The retry exists because this repo ships with no key and cannot exercise
 * either path: if this deployment's API or SDK does not know that beta, the
 * question still gets answered instead of every request 400ing.
 */
// deno-lint-ignore no-explicit-any
async function callModel(client: any, params: Record<string, unknown>): Promise<any> {
  try {
    return await client.beta.messages.create({
      ...params,
      betas: [FALLBACK_BETA],
      fallbacks: 'default',
    });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    const message = String((err as { message?: string })?.message ?? '');
    if (status !== 400 || !/fallback|beta/i.test(message)) throw err;
    console.error('ask: refusal fallbacks rejected, retrying without them —', message);
    return await client.beta.messages.create(params);
  }
}

async function runTool(
  supabase: ReturnType<typeof createClient>,
  name: string,
  input: unknown,
  bySlug: Map<string, CatalogueRow>,
  onShow: (cards: RequestedCard[]) => void,
): Promise<string> {
  if (name === 'get_product_detail') {
    const slugs = readDetailSlugs(input);
    const found = slugs
      .map((slug) => bySlug.get(slug))
      .filter((row): row is CatalogueRow => row !== undefined);
    if (found.length === 0) return 'No catalogue entry matches those slugs.';
    const citations = await fetchCitations(supabase, found);
    return found.map((row) => buildDetail(row, citations.get(row.slug) ?? [])).join('\n\n');
  }

  if (name === 'show_products') {
    const cards = readShowProducts(input);
    const known = cards.filter((card) => bySlug.has(card.slug));
    onShow(known);
    const dropped = cards.length - known.length;
    return dropped > 0
      ? `Showing ${known.length}. ${dropped} slug(s) are not in the catalogue and were dropped — do not mention them.`
      : `Showing ${known.length}.`;
  }

  return `No tool named ${name}.`;
}

async function loadProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<ProfileContext | null> {
  // `select('*')` rather than a column list: diet, reactions and the rest
  // arrive with migrations 0018 and 0019, and naming a column that has not
  // been added yet fails the whole request.
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return (data as ProfileContext) ?? null;
}

async function loadStackNames(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from('schedule_items')
    .select('name')
    .eq('user_id', userId)
    .eq('active', true)
    .limit(25);
  return (data ?? []).map((row: { name: string }) => row.name);
}
