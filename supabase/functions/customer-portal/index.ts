// @ts-nocheck
/**
 * Supabase Edge Function: customer-portal
 *
 * Auth: verifies the Supabase JWT from the Authorization header.
 * userId is extracted server-side — never trusted from the request body.
 */

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-02-24.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // ── 1. Verify JWT and extract user ──────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const userId = user.id;

    // ── 2. Admin client for DB reads ────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── 3. Parse body ───────────────────────────────────────────────────────
    const { returnUrl, flow } = await req.json();

    // ── 4. Look up Stripe customer ──────────────────────────────────────────
    const { data: sub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (!sub?.stripe_customer_id) throw new Error('No Stripe customer found');

    // ── 5. Create Portal session ────────────────────────────────────────────
    const sessionParams: Record<string, unknown> = {
      customer:   sub.stripe_customer_id,
      return_url: returnUrl,
    };

    // If a specific flow is requested (e.g. payment_method_update), land there directly
    if (flow === 'payment_method_update') {
      sessionParams.flow_data = { type: 'payment_method_update' };
    }

    const session = await stripe.billingPortal.sessions.create(sessionParams as any);

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
