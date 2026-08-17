import { anonApiKey, functionUrl, supabase } from './supabaseClient';
import { readScoped, writeScoped } from './storage';
import type {
  AskAnswer,
  AskCard,
  AskCitation,
  AskErrorCode,
  AskTurn,
} from '../../supabase/functions/ask/lib';

/**
 * The client half of the `ask` edge function.
 *
 * The wire types are imported from the function's own `lib.ts` rather than
 * restated here, so the two halves cannot drift. They are `import type` only —
 * that statement is erased at build time, so none of the function's prompt
 * text, tool schemas or peptide list reaches the bundle.
 *
 * Nothing in this file knows whether the answer came from Claude or from
 * `fixtures.ts`; the response says so and the screen decides what to do about
 * it. Setting ANTHROPIC_API_KEY on the project is still the only difference
 * between the two, and no key is read on this side of the wire.
 */

export type { AskAnswer, AskCard, AskCitation, AskTurn };

/** Mirrors MAX_QUESTION_CHARS in the function; the textarea stops at it. */
export const MAX_QUESTION_CHARS = 240;

/** The counter appears only near the end, so it is information and not a meter. */
export const QUESTION_COUNTER_FROM = 200;

/** Mirrors MAX_HISTORY_TURNS. The server trims again regardless. */
export const MAX_HISTORY_TURNS = 12;

/** The function's four codes, plus the one it can never send. */
export type AskFailureCode = AskErrorCode | 'offline';

export interface AskFailure {
  code: AskFailureCode;
  message: string;
  /** seconds until the next question is allowed; rate limit only */
  retryAfter: number | null;
}

export type AskResult = { ok: true; answer: AskAnswer } | { ok: false; error: AskFailure };

/**
 * What the person reads when the server sent no message of its own — a network
 * that never reached it, or a body that was not the JSON we expect. Never a
 * status code, never a raw error string.
 */
const FALLBACK: Record<AskFailureCode, string> = {
  offline: 'No connection. Your question is still here — try again once you are back.',
  bad_request: 'That question did not go through. Try asking it a different way.',
  unauthorized: 'That session has expired. Sign in again.',
  upgrade_required:
    'You have used your three free assistant messages. Pro raises it to 20 an hour.',
  rate_limited: 'That is the limit on questions for now. It frees up again shortly.',
  server_error: 'Something went wrong at our end. Try that again.',
};

function codeFor(status: number): AskFailureCode {
  if (status === 400) return 'bad_request';
  if (status === 401 || status === 403) return 'unauthorized';
  if (status === 429) return 'rate_limited';
  return 'server_error';
}

function fail(code: AskFailureCode, message?: string, retryAfter?: number | null): AskResult {
  return { ok: false, error: { code, message: message || FALLBACK[code], retryAfter: retryAfter ?? null } };
}

/** A failure the screen has to invent, worded from the same table. */
export function askFailure(code: AskFailureCode): AskFailure {
  return { code, message: FALLBACK[code], retryAfter: null };
}

const str = (value: unknown): string | null => (typeof value === 'string' ? value : null);

function readCitation(raw: unknown): AskCitation | null {
  if (raw === null || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const title = str(row.title);
  if (!title) return null;
  return { title, meta: str(row.meta), url: str(row.url) };
}

function readCard(raw: unknown): AskCard | null {
  if (raw === null || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const slug = str(row.slug);
  const name = str(row.name);
  if (!slug || !name) return null;
  return {
    slug,
    name,
    kind: str(row.kind),
    /* Absent on an older deployment of the function, which reads as "do not
       number these" rather than as position 0. */
    rank: typeof row.rank === 'number' ? row.rank : null,
    brand: str(row.brand),
    form: str(row.form),
    reason: str(row.reason) ?? '',
    timing: str(row.timing),
    timing_note: str(row.timing_note),
    evidence: str(row.evidence),
    label_url: str(row.label_url),
    citations: Array.isArray(row.citations)
      ? row.citations.map(readCitation).filter((c): c is AskCitation => c !== null)
      : [],
  };
}

/**
 * The response, field by field. The server is ours, but a card is rendered as
 * a product recommendation and a half-shaped one is worse than none — so every
 * field is read rather than cast, and a card missing a slug or a name is
 * dropped the same way the function drops a slug it cannot resolve.
 */
function readAnswer(raw: unknown): AskAnswer | null {
  if (raw === null || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  const answer = str(body.answer);
  if (!answer) return null;
  const usage = (body.usage ?? {}) as Record<string, unknown>;
  return {
    answer,
    cards: Array.isArray(body.cards)
      ? body.cards.map(readCard).filter((c): c is AskCard => c !== null)
      : [],
    usage: {
      remaining_hour: Number(usage.remaining_hour) || 0,
      remaining_day: Number(usage.remaining_day) || 0,
      resets_at: str(usage.resets_at) ?? '',
    },
    stub: body.stub === true,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * The prior turns, which is every user and assistant message except the one
 * being asked — the function takes that separately, and sending it twice makes
 * the model answer the question before the question.
 */
export function historyFrom(turns: AskTurn[], asking: string): AskTurn[] {
  const out = turns.slice();
  const last = out[out.length - 1];
  if (last && last.role === 'user' && last.text === asking) out.pop();
  return out.slice(-MAX_HISTORY_TURNS);
}

export async function askQuestion(question: string, history: AskTurn[]): Promise<AskResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  // The function refuses an anonymous caller anyway; failing here saves the
  // round trip and gives the same sentence.
  if (!token) return fail('unauthorized');

  let response: Response;
  try {
    response = await fetch(functionUrl('ask'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonApiKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question: question.slice(0, MAX_QUESTION_CHARS),
        history: history.slice(-MAX_HISTORY_TURNS),
      }),
    });
  } catch {
    return fail('offline');
  }

  const body = await readJson(response);

  if (!response.ok) {
    const error = (body as { error?: Record<string, unknown> } | null)?.error;
    const code = str(error?.code) as AskFailureCode | null;
    const retryAfter = Number(error?.retry_after);
    return fail(
      code && code in FALLBACK ? code : codeFor(response.status),
      str(error?.message) ?? undefined,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    );
  }

  const answer = readAnswer(body);
  if (!answer) return fail('server_error');
  return { ok: true, answer };
}

// ============================================================================
// The thread, kept across an app kill
// ============================================================================

/**
 * One line in the thread. Errors are entries rather than a banner because the
 * question above one is still on screen and the failure belongs next to it —
 * and because a retry has to know which question to send again.
 */
export type AskEntry =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; cards: AskCard[]; stub: boolean }
  | { id: string; role: 'error'; text: string; code: AskFailureCode; retryAfter: number | null; question: string };

/**
 * The conversation is stored per account, never per browser.
 *
 * It used to be a fixed key, so on a shared device a second person signing in
 * saw the first person's whole conversation. See lib/storage.ts.
 */
const THREAD_BASE = 'pepstack.ask.v1';

/**
 * Enough to scroll back through, capped so a long-running thread cannot fill
 * the origin's storage quota and start throwing on write.
 */
const MAX_PERSISTED = 40;

let seq = 0;

export function askEntryId(): string {
  return `${Date.now().toString(36)}-${seq++}`;
}

export function turnsFrom(entries: AskEntry[]): AskTurn[] {
  const turns: AskTurn[] = [];
  for (const entry of entries) {
    if (entry.role === 'user' || entry.role === 'assistant') {
      turns.push({ role: entry.role, text: entry.text });
    }
  }
  return turns;
}

/**
 * Read back on mount. iOS discards a backgrounded web view without warning,
 * and a chat that empties itself every time the app is reopened reads as
 * broken rather than as private.
 *
 * Every entry is rebuilt field by field rather than trusted: this is the same
 * JSON any script on the origin could have written, and it renders as product
 * recommendations.
 */
export function loadThread(userId: string | null): AskEntry[] {
  try {
    const parsed = readScoped<unknown>(THREAD_BASE, userId, null);
    if (parsed === null) return [];
    if (!Array.isArray(parsed)) return [];
    const out: AskEntry[] = [];
    for (const item of parsed) {
      if (item === null || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const text = str(row.text);
      if (!text) continue;
      const id = str(row.id) ?? askEntryId();
      if (row.role === 'user') out.push({ id, role: 'user', text });
      else if (row.role === 'assistant') {
        out.push({
          id,
          role: 'assistant',
          text,
          cards: Array.isArray(row.cards)
            ? row.cards.map(readCard).filter((c): c is AskCard => c !== null)
            : [],
          stub: row.stub === true,
        });
      } else if (row.role === 'error') {
        const code = str(row.code) as AskFailureCode | null;
        out.push({
          id,
          role: 'error',
          text,
          code: code && code in FALLBACK ? code : 'server_error',
          retryAfter: null,
          question: str(row.question) ?? '',
        });
      }
    }
    return out.slice(-MAX_PERSISTED);
  } catch {
    return [];
  }
}

export function saveThread(userId: string | null, entries: AskEntry[]): void {
  writeScoped(THREAD_BASE, userId, entries.slice(-MAX_PERSISTED));
}

/**
 * Files a report against an assistant answer.
 *
 * Guideline 1.2 wants a working path from "this answer was objectionable" to
 * somebody who can do something about it. The row carries the question and the
 * answer, because a report without them cannot be acted on.
 *
 * Reports are insert-only under RLS (migration 0027) — the caller cannot read
 * back what they filed, or anybody else's.
 */
export async function reportAnswer(input: {
  userId: string;
  question: string;
  answer: string;
  reason?: string;
}): Promise<void> {
  const { error } = await supabase.from('ask_reports').insert({
    user_id: input.userId,
    question: input.question.slice(0, MAX_QUESTION_CHARS),
    answer: input.answer.slice(0, 8000),
    reason: input.reason?.slice(0, 500) || null,
  });
  if (error) throw error;
}
