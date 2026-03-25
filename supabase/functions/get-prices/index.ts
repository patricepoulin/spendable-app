/**
 * Supabase Edge Function: get-prices
 *
 * Fetches the current unit_amount for each Pro price ID from Stripe.
 * No auth required — price data is public information.
 * Called by both the app (UpgradeModal) and the landing page (PricingSection).
 *
 * Returns:
 *   { usd: 1000, gbp: 800, eur: 1000, cad: 1300, aud: 1500 }
 *   (amounts in minor units — cents/pence — matching Stripe's format)
 */

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-02-24.acacia' as any,
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const priceIds: Record<string, string> = {
      usd: Deno.env.get('STRIPE_PRICE_USD') ?? '',
      gbp: Deno.env.get('STRIPE_PRICE_GBP') ?? '',
      eur: Deno.env.get('STRIPE_PRICE_EUR') ?? '',
      cad: Deno.env.get('STRIPE_PRICE_CAD') ?? '',
      aud: Deno.env.get('STRIPE_PRICE_AUD') ?? '',
    };

    // Fetch all 5 prices in parallel
    const entries = await Promise.all(
      Object.entries(priceIds).map(async ([currency, id]) => {
        if (!id) return [currency, null];
        try {
          const price = await stripe.prices.retrieve(id);
          return [currency, price.unit_amount];
        } catch {
          return [currency, null];
        }
      })
    );

    const prices = Object.fromEntries(entries);

    return new Response(JSON.stringify(prices), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });

  } catch (err) {
    console.error('get-prices error:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch prices' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
