/**
 * POST /functions/v1/stripe-webhook — the only thing that grants Pro.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RULE. The tier is set here and nowhere else. A client returning from
 * Checkout saying "I paid" is not evidence — the browser can be closed before
 * it returns, and the URL can be typed by hand. Stripe telling the server
 * directly, with a signature, is the only account of a payment worth acting on.
 *
 * `verify_jwt` must be FALSE for this function: Stripe calls it, and Stripe
 * does not have a Supabase JWT. The signature below is what authenticates it
 * instead, and it is not optional — without it this endpoint is "anyone on the
 * internet can grant themselves Pro".
 *
 * DEPLOY: supabase functions deploy stripe-webhook --no-verify-jwt
 *         supabase secrets set STRIPE_SECRET_KEY=sk_live_...
 *         supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
 *         supabase secrets set SERVICE_ROLE_KEY=...   (see below)
 *
 * This is the one function that legitimately needs the service role: it writes
 * a tier for a user who is not the caller, so it cannot run on their JWT. It is
 * read from the environment, never logged, and used for exactly one update.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Constant-time compare, so a signature cannot be guessed a byte at a time. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signatureValid(raw: string, header: string, secret: string): Promise<boolean> {
  /* Stripe's scheme: `t=<unix>,v1=<hex hmac of "t.payload">`. */
  const parts = Object.fromEntries(
    header.split(',').map((kv) => kv.split('=', 2) as [string, string]),
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;

  /* Five minutes, so a captured request cannot be replayed tomorrow. */
  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(age) || age > 300) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return safeEqual(hex, v1);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Use POST.', { status: 405 });

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const serviceKey = Deno.env.get('SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!webhookSecret || !serviceKey || !supabaseUrl) {
    console.error('stripe-webhook: not configured');
    return new Response('not configured', { status: 503 });
  }

  /* The raw body, before any parsing — the signature is over the exact bytes
     Stripe sent, so `await req.json()` first would make it unverifiable. */
  const raw = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';
  if (!(await signatureValid(raw, sig, webhookSecret))) {
    console.warn('stripe-webhook: bad signature, ignoring');
    return new Response('bad signature', { status: 400 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('bad json', { status: 400 });
  }

  /* Both ends of a subscription's life. Anything else is acknowledged and
     ignored — returning non-200 makes Stripe retry an event we do not want. */
  const GRANTS = new Set(['checkout.session.completed', 'customer.subscription.updated']);
  const REVOKES = new Set(['customer.subscription.deleted']);
  const type = event.type ?? '';
  if (!GRANTS.has(type) && !REVOKES.has(type)) return new Response('ignored', { status: 200 });

  const obj = event.data?.object ?? {};
  const meta = (obj.metadata ?? {}) as Record<string, string>;
  const userId = (obj.client_reference_id as string) || meta.user_id;
  if (!userId) {
    console.error(`stripe-webhook: ${type} carried no user id`);
    return new Response('no user', { status: 200 });
  }

  /* An updated subscription can be past_due or cancelled as easily as active,
     so the status decides rather than the event name. */
  const status = (obj.status as string) ?? 'active';
  const grant = GRANTS.has(type) && (type === 'checkout.session.completed' || status === 'active');
  const tier = grant ? 'pro' : 'free';

  const { createClient } = await import('npm:@supabase/supabase-js@2');
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  /* A downgrade may only clear a tier this system granted. Once RevenueCat is
     wired there are two writers of this column, and without the guard a Stripe
     cancellation would revoke an App Store subscriber — access they are still
     paying Apple for. When the source cannot be read (migration 0040 not
     applied) the tier is left alone: a few days of already-paid access is a
     cheaper mistake than taking a paying customer's features away. */
  if (!grant) {
    const { data, error: readErr } = await admin
      .from('profiles')
      .select('subscription_source')
      .eq('id', userId)
      .single();
    if (readErr) {
      if (/column .* does not exist|subscription_source/i.test(readErr.message ?? '')) {
        console.warn('stripe-webhook: subscription_source missing (0040 not applied) — not downgrading');
        return new Response('ok', { status: 200 });
      }
      console.error('stripe-webhook: could not read the source', readErr);
      return new Response('read failed', { status: 500 });
    }
    if (data?.subscription_source !== 'stripe') {
      console.log(`stripe-webhook: ${userId} downgrade ignored — granted by ${data?.subscription_source ?? 'unknown'}`);
      return new Response('ok', { status: 200 });
    }
  }

  let { error } = await admin
    .from('profiles')
    .update({ subscription_tier: tier, subscription_source: grant ? 'stripe' : null })
    .eq('id', userId);

  /* Same fallback as revenuecat-webhook: an unapplied 0040 must not stop a
     payment reaching the tier column. */
  if (error && /column .* does not exist|subscription_source/i.test(error.message ?? '')) {
    console.warn('stripe-webhook: writing tier without source — migration 0040 is not applied');
    ({ error } = await admin.from('profiles').update({ subscription_tier: tier }).eq('id', userId));
  }

  if (error) {
    /* Non-200 so Stripe retries — a payment that did not reach the column is
       the one failure here worth being noisy about. */
    console.error('stripe-webhook: could not set the tier', error);
    return new Response('write failed', { status: 500 });
  }

  console.log(`stripe-webhook: ${userId} -> ${tier} (${type})`);
  return new Response('ok', { status: 200 });
});
