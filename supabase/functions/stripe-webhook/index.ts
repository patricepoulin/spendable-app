/**
 * Supabase Edge Function: stripe-webhook
 *
 * Receives Stripe webhook events and updates user_subscriptions in Supabase.
 *
 * Deploy:
 *   supabase functions deploy stripe-webhook --project-ref wrzvsnejifvhjtyaupyj
 *
 * Required secrets (set in Supabase Dashboard → Settings → Edge Functions):
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET   ← whsec_ from `stripe listen` output
 *   SUPABASE_URL            ← auto-injected by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY ← auto-injected by Supabase
 */

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  // Use the latest API version — matches what Stripe CLI 2026 sends
  apiVersion: '2025-02-24.acacia' as any,
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Resolve userId ────────────────────────────────────────────────────────────
// Primary:  session/subscription metadata.userId  (set by create-checkout)
// Fallback: look up by stripe_customer_id in user_subscriptions

async function resolveUserId(
  metaUserId: string | null | undefined,
  customerId: string | null | undefined,
): Promise<string | null> {
  if (metaUserId) return metaUserId;

  if (!customerId) return null;

  // Fallback: find user by their Stripe customer ID
  const { data } = await supabase
    .from('user_subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (data?.user_id) {
    console.log('Resolved userId via customer lookup:', data.user_id);
    return data.user_id;
  }

  return null;
}

// ─── Upsert subscription row ──────────────────────────────────────────────────

async function upsertSubscription(userId: string, data: Record<string, unknown>) {
  const { error } = await supabase
    .from('user_subscriptions')
    .upsert(
      { user_id: userId, ...data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) {
    console.error('upsertSubscription error:', error);
    throw error;
  }
  console.log('Upserted subscription for userId:', userId, data);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const sig    = req.headers.get('stripe-signature');
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const body   = await req.text();

  // Log environment state to help debug secret issues
  console.log('Webhook received — sig present:', !!sig, '| secret present:', !!secret, '| secret prefix:', secret?.slice(0, 12));

  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set!');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  if (!sig) {
    console.error('Missing stripe-signature header');
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret);
  } catch (err) {
    const msg = (err as Error).message;
    console.error('Signature verification failed:', msg);
    return new Response(`Webhook signature verification failed: ${msg}`, { status: 400 });
  }

  console.log('Event verified:', event.type, event.id);

  try {
    switch (event.type) {

      // ── Payment completed → activate Pro ────────────────────────────────
      case 'checkout.session.completed': {
        const session    = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string | null;
        const userId     = await resolveUserId(session.metadata?.userId, customerId);

        if (!userId) {
          console.error('checkout.session.completed: could not resolve userId', { metadata: session.metadata, customerId });
          break;
        }

        const subscriptionId = session.subscription as string;
        const subscription   = await stripe.subscriptions.retrieve(subscriptionId);

        await upsertSubscription(userId, {
          stripe_customer_id:              customerId,
          subscription_plan:               'pro',
          subscription_status:             subscription.status,
          subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });
        break;
      }

      // ── Subscription updated (renewal, status change) ────────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId   = subscription.customer as string;
        const userId       = await resolveUserId(subscription.metadata?.userId, customerId);

        if (!userId) {
          console.error('customer.subscription.updated: could not resolve userId', { metadata: subscription.metadata, customerId });
          break;
        }

        const isActive = ['active', 'trialing'].includes(subscription.status);

        await upsertSubscription(userId, {
          subscription_plan:               isActive ? 'pro' : 'free',
          subscription_status:             subscription.status,
          subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });
        break;
      }

      // ── Subscription deleted / canceled → downgrade to Free ──────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId   = subscription.customer as string;
        const userId       = await resolveUserId(subscription.metadata?.userId, customerId);

        if (!userId) {
          console.error('customer.subscription.deleted: could not resolve userId', { metadata: subscription.metadata, customerId });
          break;
        }

        await upsertSubscription(userId, {
          subscription_plan:               'free',
          subscription_status:             'canceled',
          subscription_current_period_end: null,
        });
        break;
      }

      // ── Payment failed → mark past_due (belt-and-suspenders alongside sub.updated) ──
      case 'invoice.payment_failed': {
        const invoice    = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId     = await resolveUserId(null, customerId);

        if (!userId) {
          console.error('invoice.payment_failed: could not resolve userId', { customerId });
          break;
        }

        console.log('Payment failed for userId:', userId);
        await upsertSubscription(userId, {
          subscription_status: 'past_due',
        });
        break;
      }

      // ── Payment succeeded → clear past_due flag (belt-and-suspenders alongside sub.updated) ──
      case 'invoice.payment_succeeded': {
        const invoice    = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Only act if this is a subscription invoice (not a one-off)
        if (!invoice.subscription) break;

        const userId = await resolveUserId(null, customerId);
        if (!userId) {
          console.error('invoice.payment_succeeded: could not resolve userId', { customerId });
          break;
        }

        // Retrieve the current subscription to get accurate status + period_end
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const isActive     = ['active', 'trialing'].includes(subscription.status);

        console.log('Payment succeeded for userId:', userId, 'status:', subscription.status);
        await upsertSubscription(userId, {
          subscription_plan:               isActive ? 'pro' : 'free',
          subscription_status:             subscription.status,
          subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });
        break;
      }

      default:
        // Unhandled event — return 200 so Stripe doesn't retry
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
