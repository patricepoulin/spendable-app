/**
 * Spendable — Stripe Billing Service
 *
 * All Stripe calls go through Supabase Edge Functions so the secret key
 * never touches the browser.
 *
 * Auth: the user's live Supabase JWT is sent in the Authorization header.
 * The Edge Function verifies the token and extracts the userId server-side —
 * we never trust a userId supplied by the client body.
 */

// Imported lazily inside getSessionToken() to avoid triggering Supabase
// client initialisation at module load time (before env vars are ready).
// Do NOT import supabase at the top level here.

// ─── Plan definitions ─────────────────────────────────────────────────────────

export const FREE_INCOME_LIMIT    = 5;  // total all-time income entries
export const FREE_EXPENSE_LIMIT   = 3;  // total recurring expenses on free plan
export const FREE_UPCOMING_LIMIT  = 3;  // total upcoming expenses on free plan

export const PLANS = {
  free: {
    id:       'free' as const,
    name:     'Free',
    price:    0,
    limits:   { incomePerMonth: FREE_INCOME_LIMIT },
    features: [
      'Safe-to-spend calculation',
      'Tax reserve tracking',
      'Financial confidence score',
      `Up to ${FREE_INCOME_LIMIT} income entries`,
      `Up to ${FREE_EXPENSE_LIMIT} recurring expenses`,
      `Up to ${FREE_UPCOMING_LIMIT} upcoming expenses`,
    ],
  },
  pro: {
    id:       'pro' as const,
    name:     'Pro',
    price:    9,
    priceIds: {
      usd: import.meta.env.VITE_STRIPE_PRICE_USD as string,
      gbp: import.meta.env.VITE_STRIPE_PRICE_GBP as string,
      eur: import.meta.env.VITE_STRIPE_PRICE_EUR as string,
      cad: import.meta.env.VITE_STRIPE_PRICE_CAD as string,
      aud: import.meta.env.VITE_STRIPE_PRICE_AUD as string,
    },
    limits:   { incomePerMonth: Infinity },
    features: [
      'Unlimited income & expense tracking',
      '6-month financial forecast',
      'CSV & XLSX export',
      'Income smoothing & runway analysis',
      'Unlimited upcoming expenses',
      'Priority support',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function edgeFn(name: string) {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
}

/** Gets the live session JWT — throws if the user is not authenticated. */
async function getSessionToken(): Promise<string> {
  // Dynamic import avoids triggering Supabase client creation at module load time
  const { supabase } = await import('../lib/supabase');
  const { data, error } = await supabase!.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Not authenticated — please sign in again');
  }
  return data.session.access_token;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getSessionToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

/**
 * Creates a Stripe Checkout session and redirects the user to Stripe.
 * The userId is derived server-side from the JWT — not passed in the body.
 */
export async function createCheckoutSession(
  currency: 'usd' | 'gbp' | 'eur' | 'cad' | 'aud' = 'usd',
): Promise<void> {
  const priceId = PLANS.pro.priceIds[currency];

  const res = await fetch(edgeFn('create-checkout'), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      priceId,
      successUrl: `${window.location.origin}/?upgraded=true`,
      cancelUrl:  `${window.location.origin}/settings`,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Failed to create checkout session');
  }

  const { url } = await res.json();
  window.location.href = url;
}

// ─── Customer Portal ──────────────────────────────────────────────────────────

/** Redirects to Stripe Customer Portal for managing subscription. */
export async function openCustomerPortal(): Promise<void> {
  const res = await fetch(edgeFn('customer-portal'), {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      returnUrl: `${window.location.origin}/settings`,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Failed to open customer portal');
  }

  const { url } = await res.json();
  window.location.href = url;
}
