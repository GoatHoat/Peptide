/**
 * POST /functions/v1/create-checkout — a Stripe Checkout session for Pro.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS DOES NOT DO. It does not grant the tier. Only `stripe-webhook`
 * does that, on `checkout.session.completed`, because the browser can be closed
 * or lied to between paying and returning — a client that says "I paid" is not
 * evidence and must never be treated as any.
 *
 * SECRETS. `STRIPE_SECRET_KEY` is read from the environment and is absent by
 * design. It is never logged and never returned. This runs on the caller's own
 * JWT and the anon key, never the service role.
 *
 * DEPLOY: supabase functions deploy create-checkout
 *         supabase secrets set STRIPE_SECRET_KEY=sk_live_...
 *         supabase secrets set STRIPE_PRICE_ANNUAL=price_...
 *         supabase secrets set STRIPE_PRICE_MONTHLY=price_...
 * ─────────────────────────────────────────────────────────────────────────────
 */

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  const secret = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secret) {
    /* Absent is the shipping state today. Say so plainly rather than 500ing:
       the button's job is to report "not switched on yet", not to look broken. */
    console.warn('create-checkout: STRIPE_SECRET_KEY is not set');
    return json({ error: { code: 'not_configured', message: 'Card payment is not switched on yet.' } }, 503);
  }

  // ---- who is asking -------------------------------------------------------
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) {
    return json({ error: { code: 'unauthorized', message: 'Sign in first.' } }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return json({ error: 'server_error' }, 500);

  const { createClient } = await import('npm:@supabase/supabase-js@2');
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: auth_, error: authErr } = await supabase.auth.getUser();
  const user = auth_?.user;
  if (authErr || !user) {
    return json({ error: { code: 'unauthorized', message: 'That session has expired.' } }, 401);
  }

  // ---- which plan ----------------------------------------------------------
  let plan = 'annual';
  try {
    const body = await req.json();
    if (body?.plan === 'monthly' || body?.plan === 'annual') plan = body.plan;
  } catch {
    /* an empty body is the annual default, which is what the sheet preselects */
  }

  const price =
    plan === 'monthly'
      ? Deno.env.get('STRIPE_PRICE_MONTHLY')
      : Deno.env.get('STRIPE_PRICE_ANNUAL');
  if (!price) {
    console.warn(`create-checkout: no price id configured for ${plan}`);
    return json({ error: { code: 'not_configured', message: 'That plan is not set up yet.' } }, 503);
  }

  const site = Deno.env.get('SITE_URL') ?? 'https://halfpast-mauve.vercel.app';

  // ---- the session ---------------------------------------------------------
  /* Form-encoded against the REST API rather than the npm SDK: one fetch, no
     bundle, and nothing to keep in step with a major version. */
  const form = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    /* Two static pages whose only job is to bounce to `pepstack://`, because
       Stripe requires https here and will reject a custom scheme. These used
       to be `${site}/?checkout=done`, which left anybody who paid from the app
       sitting on a website with no way back. Neither page grants anything —
       see public/pro-success.html. */
    success_url: `${site}/pro-success.html`,
    cancel_url: `${site}/pro-cancel.html`,
    /* The only link between a Stripe payment and an account. The webhook reads
       it back — without it a completed payment cannot be attributed to anyone. */
    client_reference_id: user.id,
    'metadata[user_id]': user.id,
    'subscription_data[metadata][user_id]': user.id,
  });
  if (user.email) form.set('customer_email', user.email);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });

  if (!res.ok) {
    /* Stripe's message can name the account and the key prefix, so it is
       logged and not returned. */
    console.error('create-checkout: stripe rejected the session', await res.text());
    return json({ error: { code: 'server_error', message: 'Could not start checkout.' } }, 502);
  }

  const session = await res.json();
  if (!session?.url) {
    console.error('create-checkout: stripe returned no url');
    return json({ error: { code: 'server_error', message: 'Could not start checkout.' } }, 502);
  }
  return json({ url: session.url });
});
