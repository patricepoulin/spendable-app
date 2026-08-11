/**
 * Supabase Edge Function: create-checkout
 *
 * Auth: verifies the Supabase JWT from the Authorization header.
 * userId is extracted server-side — never trusted from the request body.
 */

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-02-24.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

// Minimum time between checkout session creations per user
const CHECKOUT_COOLDOWN_MS = 10_000;

serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // ── 1. Verify JWT and extract user ──────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    // Per-request client that validates the user's JWT
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const userId = user.id;

    // ── 2. Admin client for DB writes ───────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── 3. Parse request body (no userId — we got it from the JWT) ──────────
    const { priceId, successUrl, cancelUrl } = await req.json();
    if (!priceId) throw new Error('Missing priceId');

    // ── 4. Rate limit: reject repeated checkout attempts within the cooldown ──
    const { data: sub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id, last_checkout_attempt_at')
      .eq('user_id', userId)
      .single();

    const lastAttempt = sub?.last_checkout_attempt_at
      ? new Date(sub.last_checkout_attempt_at as string).getTime()
      : 0;

    if (Date.now() - lastAttempt < CHECKOUT_COOLDOWN_MS) {
      return new Response(
        JSON.stringify({ message: 'Please wait a moment before trying again.' }),
        { status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    await supabaseAdmin.from('user_subscriptions').upsert(
      { user_id: userId, last_checkout_attempt_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

    // ── 5. Look up or create Stripe customer ────────────────────────────────
    let customerId = sub?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;

      await supabaseAdmin.from('user_subscriptions').upsert(
        { user_id: userId, stripe_customer_id: customerId, subscription_plan: 'free' },
        { onConflict: 'user_id' }
      );
    }

    // ── 6. Create Checkout session ──────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url:  cancelUrl,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = (err as Error).message;
    const status  = message === 'Unauthorized' ? 401 : 400;
    return new Response(JSON.stringify({ message }), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
