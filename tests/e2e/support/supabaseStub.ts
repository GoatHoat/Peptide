import type { Page, Request } from '@playwright/test';
import { SUPABASE_URL } from './env';
import { INSERT_DEFAULTS, makeTables, STUB_EMAIL, STUB_USER_ID, type Row } from './catalogue';

/**
 * A Supabase that never leaves the browser.
 *
 * Every request the client makes is fulfilled by page.route(), so the tests
 * need no project, no keys and no network. It models enough of GoTrue and
 * PostgREST for the app's own calls — eq/in/gte/lte filters and `limit`, plus
 * the single-object Accept header — and nothing more. Embedded selects
 * (`glossary:glossary_id(*)`), `order` and `not.` filters are answered
 * unfiltered; no screen under test depends on them.
 *
 * Anything it does not recognise is recorded in `unhandled` rather than
 * guessed at, and the test fixture fails the test if that list is not empty.
 * A silent [] for a table nobody modelled is exactly the kind of pass that
 * makes a smoke test worthless.
 */

const PREFIX = new URL(SUPABASE_URL).pathname;
const DAY_SECONDS = 86_400;

/** Not a credential; the endpoint that would check it is intercepted. */
const ACCESS_TOKEN = 'stub-access-token';
const REFRESH_TOKEN = 'stub-refresh-token';

export function stubUser(): Row {
  const now = new Date().toISOString();
  return {
    id: STUB_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: STUB_EMAIL,
    email_confirmed_at: now,
    phone: '',
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { display_name: 'Smoke' },
    identities: [],
    created_at: now,
    updated_at: now,
  };
}

/** Far enough from expiry that the client never tries to refresh mid-test. */
export function stubSession(): Row {
  return {
    access_token: ACCESS_TOKEN,
    token_type: 'bearer',
    expires_in: DAY_SECONDS,
    expires_at: Math.floor(Date.now() / 1000) + DAY_SECONDS,
    refresh_token: REFRESH_TOKEN,
    user: stubUser(),
  };
}

export interface Stub {
  /** Live table contents, so a test can assert on what the app wrote. */
  db: Record<string, Row[]>;
  /** `METHOD /path` for every call the stub could not model. Empty is passing. */
  unhandled: string[];
}

export async function installSupabaseStub(page: Page): Promise<Stub> {
  const stub: Stub = { db: makeTables(), unhandled: [] };
  let generated = 0;

  await page.route(`${SUPABASE_URL}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.slice(PREFIX.length);
    const method = request.method();

    const miss = (status = 404) => {
      stub.unhandled.push(`${method} ${path}`);
      return route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ message: `stub has no route for ${method} ${path}` }),
      });
    };
    const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
      route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });

    /* ── GoTrue ───────────────────────────────────────────────────────── */

    if (path.startsWith('/auth/v1/')) {
      const endpoint = path.slice('/auth/v1/'.length);
      if (endpoint === 'signup' || endpoint === 'token') return json(stubSession());
      if (endpoint === 'user') return json(stubUser());
      if (endpoint === 'logout') return route.fulfill({ status: 204, body: '' });
      return miss();
    }

    /* ── PostgREST ────────────────────────────────────────────────────── */

    if (!path.startsWith('/rest/v1/')) return miss();
    const relation = path.slice('/rest/v1/'.length);

    if (relation.startsWith('rpc/')) {
      // match_goal is the only RPC the app calls, and only from the search box.
      if (relation === 'rpc/match_goal') {
        const { query_text } = (request.postDataJSON() ?? {}) as { query_text?: string };
        const q = (query_text ?? '').toLowerCase();
        return json(stub.db.glossary.filter((r) => String(r.name).toLowerCase().includes(q)));
      }
      return miss();
    }

    const table = stub.db[relation];
    if (!table) return miss();

    const single = wantsSingleObject(request);
    const matching = () => applyFilters(table, url.searchParams);

    if (method === 'GET' || method === 'HEAD') {
      const rows = withLimit(matching(), url.searchParams);
      if (method === 'HEAD') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'content-range': `0-${Math.max(0, rows.length - 1)}/${rows.length}` },
          body: '',
        });
      }
      if (!single) return json(rows);
      // PostgREST's own answer when .single() matched nothing; .maybeSingle()
      // reads it as null rather than an error.
      if (rows.length !== 1) {
        return json(
          { code: 'PGRST116', details: `Results contain ${rows.length} rows`, hint: null, message: 'JSON object requested, multiple (or no) rows returned' },
          406,
        );
      }
      return json(rows[0]);
    }

    if (method === 'POST') {
      const payload = request.postDataJSON() as Row | Row[] | null;
      const incoming = (Array.isArray(payload) ? payload : payload ? [payload] : []).map((row) => ({
        id: `stub-${relation}-${++generated}`,
        // `now()` is a default on every table that carries the column.
        created_at: new Date().toISOString(),
        ...INSERT_DEFAULTS[relation],
        ...row,
      }));
      table.push(...incoming);
      if (single) return json(incoming[0] ?? null, 201);
      return json(incoming, 201);
    }

    if (method === 'PATCH') {
      const patch = (request.postDataJSON() ?? {}) as Row;
      const hit = matching();
      for (const row of hit) Object.assign(row, patch);
      if (single) return json(hit[0] ?? null);
      return json(hit);
    }

    if (method === 'DELETE') {
      const doomed = new Set(matching());
      stub.db[relation] = table.filter((row) => !doomed.has(row));
      return route.fulfill({ status: 204, body: '' });
    }

    return miss(405);
  });

  return stub;
}

/** postgrest-js asks for a bare object rather than an array via Accept. */
function wantsSingleObject(request: Request): boolean {
  return (request.headers()['accept'] ?? '').includes('vnd.pgrst.object');
}

/** Everything in a PostgREST query string that is not a column filter. */
const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns']);

function applyFilters(rows: Row[], params: URLSearchParams): Row[] {
  let out = rows;
  for (const [column, raw] of params) {
    if (RESERVED.has(column)) continue;
    const eq = raw.match(/^eq\.(.*)$/s);
    if (eq) {
      out = out.filter((r) => String(r[column]) === eq[1]);
      continue;
    }
    const inList = raw.match(/^in\.\((.*)\)$/s);
    if (inList) {
      const wanted = new Set(inList[1].split(',').map((v) => v.replace(/^"|"$/g, '')));
      out = out.filter((r) => wanted.has(String(r[column])));
      continue;
    }
    const gte = raw.match(/^gte\.(.*)$/s);
    if (gte) {
      out = out.filter((r) => String(r[column]) >= gte[1]);
      continue;
    }
    const lte = raw.match(/^lte\.(.*)$/s);
    if (lte) {
      out = out.filter((r) => String(r[column]) <= lte[1]);
      continue;
    }
    // not./is./like. and the embedded-table filters fall through unfiltered.
  }
  return out;
}

function withLimit(rows: Row[], params: URLSearchParams): Row[] {
  const limit = Number(params.get('limit'));
  return Number.isFinite(limit) && limit > 0 ? rows.slice(0, limit) : rows;
}
