/**
 * RevenueCat -> profiles.subscription_tier
 *
 * The Apple half of what `stripe-webhook` does for cards, and it exists for the
 * same reason: nothing else writes the tier. Without it a purchase unlocks the
 * client and the server still believes the account is free, so the assistant
 * keeps enforcing the three-message cap on somebody who has just paid.
 *
 * RevenueCat sends no Supabase JWT, so this deploys with `--no-verify-jwt` and
 * authenticates on a shared secret instead:
 *
 *   supabase secrets set RC_WEBHOOK_SECRET=<the same string as the dashboard>
 *   supabase functions deploy revenuecat-webhook --no-verify-jwt
 */

/** Both ends of a subscription's life. Everything else is acknowledged and ignored. */
const GRANTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
]);

/* EXPIRATION only. CANCELLATION means "will not renew", not "access ends now" —
   somebody who cancels on day two of an annual plan has 363 days paid for, and
   taking them away is a refund request and a one-star review. BILLING_ISSUE is
   a retry in progress, not a lapse. */
const REVOKES = new Set(['EXPIRATION']);

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Use POST.', { status: 405 });

  const secret = Deno.env.get('RC_WEBHOOK_SECRET');
  const serviceKey = Deno.env.get('SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!secret || !serviceKey || !supabaseUrl) {
    console.error('revenuecat-webhook: not configured');
    return new Response('not configured', { status: 503 });
  }

  /* A mismatch is somebody trying to grant themselves a tier. Never fall
     through to the handler on a failed check. */
  if (req.headers.get('Authorization') !== secret) {
    console.warn('revenuecat-webhook: bad authorization, ignoring');
    return new Response('unauthorised', { status: 401 });
  }

  let body: { event?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  const event = body.event ?? {};
  const type = String(event.type ?? '');
  const userId = String(event.app_user_id ?? '');

  if (!userId) {
    console.error(`revenuecat-webhook: ${type} carried no app_user_id`);
    return new Response('no user', { status: 200 });
  }

  /* The single most useful line in this file. An anonymous id means
     `Purchases.configure` ran before the Supabase session resolved, so the
     purchase is attached to a RevenueCat user that corresponds to nobody. It
     cannot be repaired here — it has to be fixed in `setPurchasesUser`. */
  if (userId.startsWith('$RCAnonymousID')) {
    console.error(
      `revenuecat-webhook: ${type} for an anonymous user (${userId}). ` +
        'appUserID is not being set — see setPurchasesUser in src/lib/revenuecat.ts.',
    );
    return new Response('anonymous user', { status: 200 });
  }

  const grant = GRANTS.has(type);
  const revoke = REVOKES.has(type);
  if (!grant && !revoke) {
    console.log(`revenuecat-webhook: ${type} ignored for ${userId}`);
    return new Response('ignored', { status: 200 });
  }

  const { createClient } = await import('npm:@supabase/supabase-js@2');
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  /* Only clear a tier this system granted. Somebody who let an App Store
     subscription lapse and pays by card must not be downgraded by the expiry
     of the one they left behind. */
  if (revoke) {
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_source')
      .eq('id', userId)
      .single();
    if (profile && profile.subscription_source !== 'apple') {
      console.log(
        `revenuecat-webhook: ${type} for ${userId} ignored — tier came from ` +
          `${profile.subscription_source ?? 'nowhere'}`,
      );
      return new Response('not ours to revoke', { status: 200 });
    }
  }

  const { error } = await admin
    .from('profiles')
    .update({
      subscription_tier: grant ? 'pro' : 'free',
      subscription_source: grant ? 'apple' : null,
    })
    .eq('id', userId);

  if (error) {
    /* Non-200 so RevenueCat retries. A payment that never reached the column is
       the one failure here worth being noisy about. */
    console.error('revenuecat-webhook: could not set the tier', error);
    return new Response('write failed', { status: 500 });
  }

  console.log(`revenuecat-webhook: ${userId} -> ${grant ? 'pro' : 'free'} (${type})`);
  return new Response('ok', { status: 200 });
});
