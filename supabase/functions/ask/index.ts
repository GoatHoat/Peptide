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
  FREE_ASK_LIFETIME,
  buildCatalogueBlock,
  buildDetail,
  buildProfileBlock,
  classifyScope,
  INSTRUCTIONS,
  costOf,
  MAX_TOKENS,
  MAX_TOOL_ROUNDS,
  MODEL,
  MONTHLY_BUDGET_USD,
  parseRequest,
  rateVerdict,
  relevantCatalogue,
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
import {
  INTERPRET_TOOL,
  MIN_CONFIDENCE,
  readInterpretation,
  resolveIngredientNames,
} from './memory.ts';

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
    /* ---- 3a. the free lifetime cap ---------------------------------------
       Three messages ever, not per day. The tier is read from the database
       here rather than taken from the request, because the request is written
       by the client and the client is what the cap exists to constrain. A
       402 is the client's signal to open the paywall; the message it typed is
       left in the input so upgrading and sending again is one tap. */
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();
    const tier = (profileRow as { subscription_tier?: string } | null)?.subscription_tier ?? 'free';

    if (tier === 'free') {
      const { count: lifetime } = await supabase
        .from('ask_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);
      if ((lifetime ?? 0) >= FREE_ASK_LIFETIME) {
        return fail(
          'upgrade_required',
          /* Both numbers read from the constants that enforce them. Spelled
             out, they would keep reading as true after a limit changed — on
             the message that asks somebody to pay, which is where a wrong
             number costs the most. */
          `You have used your ${FREE_ASK_LIFETIME} free assistant messages. Pro raises it to ${RATE_LIMIT.perHour} an hour.`,
          402,
        );
      }
    }

    /* ---- 3b. the monthly ceiling ----------------------------------------
       On measured dollars, not on a message count and not on a token
       allowance: the same allowance is roughly $0.97 with the prompt cache
       working and $2.60 without it, so a token budget stops bounding cost
       exactly when a brake matters most.

       A missing function means 0039 has not been applied. That reads as zero
       spend and the call proceeds — the rate limit above is still a real
       ceiling, and refusing every message because a migration is outstanding
       would take the assistant down for everybody. */
    const budget = MONTHLY_BUDGET_USD[tier === 'pro' ? 'pro' : 'free'];
    const { data: spendRow } = await supabase.rpc('my_ask_spend_this_month');
    const spent = Number(spendRow ?? 0);
    if (Number.isFinite(spent) && spent >= budget) {
      /* Never a dollar figure and never a token count. "255 messages a month"
         reads as generous; "$1.00 of AI" reads as metered. */
      return fail(
        'upgrade_required',
        'You have used this month’s assistant messages. They reset on the 1st.',
        402,
      );
    }

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

    /* Written before the call so the rate limit counts an attempt, and updated
       after it with what the call actually cost. `select` so the id comes back
       — the budget is a sum of cost_usd on these rows, and a row that never
       receives its cost is a message that was free as far as the ceiling is
       concerned. */
    const { data: usageRow, error: insertError } = await supabase
      .from('ask_usage')
      .insert({ user_id: user.id })
      .select('id')
      .single();
    if (insertError) throw insertError;
    const usageId = (usageRow as { id: string } | null)?.id ?? null;

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
    return await liveAnswer(supabase, request, supplements, bySlug, user.id, usage, usageId);
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
  /** the ask_usage row to write the measured cost back to */
  usageId: string | null,
): Promise<Response> {
  const [profile, stack] = await Promise.all([
    loadProfile(supabase, userId),
    loadStack(supabase, userId),
  ]);
  const stackNames = stack.names;

  /* What this person is interested in, derived from what they already take
     rather than from the request. Goals live in the onboarding store on the
     device and are not on `profiles`, so there is nothing on the server to read
     them from — but the catalogue is already in memory and every product
     carries goal tags, so the stack is a free signal with no extra query and
     nothing the client can lie about. Somebody taking nothing gets the whole
     catalogue, which is the old behaviour. */
  const stackIds = new Set(stack.glossaryIds);
  const goalTags = [
    ...new Set(supplements.filter((row) => stackIds.has(row.id)).flatMap((row) => row.goal_tags)),
  ];
  const catalogue = relevantCatalogue(supplements, goalTags);

  const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

  /* Interpret anything the user typed that has not been read yet. Lazy on
     purpose — never during onboarding, where a model call sits between two
     taps. Failures are swallowed: memory is additive, and a bad interpretation
     must not cost somebody their answer. */
  await interpretPendingFacts(supabase, client, userId).catch(() => {});
  const facts = await loadFacts(supabase, userId).catch(() => []);

  const system = [
    { type: 'text', text: INSTRUCTIONS },
    // The catalogue is identical for every person, so the breakpoint goes here
    // and the whole prefix — tools included — is read back on the next request
    // rather than paid for again. Anything per-person goes in the user turn.
    {
      type: 'text',
      text: buildCatalogueBlock(catalogue),
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
  /* Summed across every round, because a tool round trip is a second billed
     call and a budget that only counted the last one would undercount by the
     number of tools the model chose to use. */
  const spend = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, usd: 0 };
  let truncated = false;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callModel(client, {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      /* Deliberation bills as output at five times input, and this is
         retrieval and summarisation over a catalogue we supply — there is
         little to reason about before answering. */
      /* NO output_config. It was `{ effort: 'low' }`, added to stop paying for
         deliberation tokens at five times input — and this model rejects the
         parameter, so every single call 400'd. The catch below turned that
         into "something went wrong on our end", which is the correct thing to
         show a user and the worst possible thing to debug from: three wrong
         diagnoses before the response body was read directly.

         If a cheaper effort setting is wanted later, confirm the model accepts
         it against the API docs first, and check it with one real call before
         deploying. */
      system,
      tools: TOOLS,
      messages,
    });

    const round_cost = costOf(response.usage);
    spend.input += round_cost.input;
    spend.output += round_cost.output;
    spend.cacheRead += round_cost.cacheRead;
    spend.cacheWrite += round_cost.cacheWrite;
    spend.usd += round_cost.usd;
    if (response.stop_reason === 'max_tokens') truncated = true;

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

  /* What it cost, on the row the budget sums. Logged as well as stored: the
     first thing to check after deploying is whether cacheRead is non-zero,
     because zero there means the catalogue is being paid for in full on every
     single message. */
  console.log(
    `ask cost: $${spend.usd.toFixed(6)} in=${spend.input} out=${spend.output} cacheRead=${spend.cacheRead} cacheWrite=${spend.cacheWrite}`,
  );
  if (usageId) {
    await supabase
      .from('ask_usage')
      .update({
        input_tokens: spend.input,
        output_tokens: spend.output,
        cache_read_tokens: spend.cacheRead,
        cache_write_tokens: spend.cacheWrite,
        cost_usd: Number(spend.usd.toFixed(6)),
      })
      .eq('id', usageId)
      /* 0039 not applied yet: the columns do not exist and the update fails.
         The message was still answered and still counted, so this must not
         turn a good answer into a 500. */
      .then(undefined, (err: unknown) => console.error('ask: could not record cost', err));
  }

  const answer: AskAnswer = {
    answer: truncated
      ? `${text}

That answer hit its length limit. Ask me for the rest and I will carry on.`
      : text || 'I could not put an answer together for that. Try asking it a different way.',
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

async function loadStack(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ names: string[]; glossaryIds: string[] }> {
  const { data } = await supabase
    .from('schedule_items')
    .select('name, glossary_id')
    .eq('user_id', userId)
    .eq('active', true)
    .limit(25);
  const rows = (data ?? []) as { name: string; glossary_id: string | null }[];
  return {
    names: rows.map((row) => row.name),
    glossaryIds: rows.map((row) => row.glossary_id).filter((id): id is string => !!id),
  };
}


/** Facts this user has recorded, newest first, dismissals excluded. */
async function loadFacts(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ summary: string | null; raw_text: string }[]> {
  const { data } = await supabase
    .from('user_facts')
    .select('summary, raw_text')
    .eq('user_id', userId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(10);
  return (data ?? []) as { summary: string | null; raw_text: string }[];
}

/**
 * Read any note that has not been interpreted yet, and store the validated
 * result beside it.
 *
 * Everything the model proposes is checked here rather than trusted: tags
 * against the enum, ingredient names against the synonym table, and the whole
 * lot discarded below MIN_CONFIDENCE. The raw text is never modified.
 *
 * At most three per turn. Somebody who typed six notes gets them read over two
 * conversations rather than paying for six extra model calls in one.
 */
async function interpretPendingFacts(
  supabase: ReturnType<typeof createClient>,
  client: Anthropic,
  userId: string,
): Promise<void> {
  const { data } = await supabase
    .from('user_facts')
    .select('id, raw_text')
    .eq('user_id', userId)
    .is('interpreted_at', null)
    .limit(3);

  const pending = (data ?? []) as { id: string; raw_text: string }[];
  if (pending.length === 0) return;

  for (const fact of pending) {
    try {
      const reply = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        tools: [INTERPRET_TOOL as never],
        tool_choice: { type: 'tool', name: INTERPRET_TOOL.name },
        messages: [
          {
            role: 'user',
            content: `Someone wrote this about a supplement that did not agree with them:

"${fact.raw_text}"`,
          },
        ],
      });

      const call = (reply.content ?? []).find(
        (block: { type?: string }) => block.type === 'tool_use',
      ) as { input?: Record<string, unknown> } | undefined;

      const parsed = call?.input ? readInterpretation(call.input) : null;
      if (!parsed) {
        // still stamped, or it is retried on every turn forever
        await supabase
          .from('user_facts')
          .update({ interpreted_at: new Date().toISOString() })
          .eq('id', fact.id);
        continue;
      }

      const { keys, discarded } = await resolveIngredientNames(async (name) => {
        const { data } = await supabase.rpc('resolve_ingredient_key', { query_text: name });
        return typeof data === 'string' && data ? data : null;
      }, parsed.ingredientNames);
      if (discarded.length) {
        console.log(`interpret_note: dropped unresolvable ingredients: ${discarded.join(', ')}`);
      }

      await supabase
        .from('user_facts')
        .update({
          summary: parsed.summary,
          tags: parsed.tags,
          ingredient_keys: parsed.confidence < MIN_CONFIDENCE ? [] : keys,
          confidence: parsed.confidence,
          interpreted_at: new Date().toISOString(),
        })
        .eq('id', fact.id);
    } catch {
      /* One note failing must not cost the user their answer. It stays
         uninterpreted and is tried again next turn. */
    }
  }
}
