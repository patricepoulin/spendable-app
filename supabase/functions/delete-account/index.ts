/**
 * delete-account Edge Function
 *
 * Permanently deletes the authenticated user's data and Supabase auth account.
 * Called from the Settings page Danger Zone.
 *
 * Security: JWT is verified via supabase.auth.getUser() — userId is never
 * trusted from the request body.
 *
 * Data deletion order:
 *   1. Cancel active Stripe subscription (if any) so the user isn't charged again
 *   2. Delete all user rows (cascades via ON DELETE CASCADE on all tables)
 *   3. Delete the Supabase auth user
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Verify JWT and extract userId ────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl     = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    // Verify the user's JWT using the anon key
    const supabaseUser = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    console.log('delete-account: starting for userId', userId);

    // Use service-role client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ── 1. Cancel Stripe subscription if active ──────────────────────────────
    if (stripeSecretKey) {
      try {
        const { data: subRow } = await supabaseAdmin
          .from('user_subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', userId)
          .single();

        if (subRow?.stripe_customer_id) {
          const stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2025-02-24.acacia',
            httpClient: Stripe.createFetchHttpClient(),
          });

          // List active subscriptions for this customer and cancel them
          const subscriptions = await stripe.subscriptions.list({
            customer: subRow.stripe_customer_id,
            status:   'active',
          });

          for (const sub of subscriptions.data) {
            await stripe.subscriptions.cancel(sub.id);
            console.log('delete-account: cancelled Stripe subscription', sub.id);
          }
        }
      } catch (stripeErr) {
        // Non-fatal — log but continue with account deletion
        console.error('delete-account: Stripe cancellation failed (continuing):', stripeErr);
      }
    }

    // ── 2. Delete user data rows ─────────────────────────────────────────────
    // All tables use ON DELETE CASCADE via auth.users FK, but we delete
    // explicitly here to be safe and to get accurate error reporting.
    const tables = [
      'income_events',
      'recurring_expenses',
      'upcoming_expenses',
      'user_subscriptions',
      'user_settings',
    ];

    for (const table of tables) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq('user_id', userId);
      if (error) {
        console.error(`delete-account: failed to delete ${table}:`, error);
        // Continue — auth user deletion below will cascade anyway
      }
    }

    // ── 3. Delete the Supabase auth user ────────────────────────────────────
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('delete-account: auth.admin.deleteUser failed:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete account' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('delete-account: complete for userId', userId);
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('delete-account: unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
