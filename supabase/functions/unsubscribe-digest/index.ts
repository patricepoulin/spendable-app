/**
 * Supabase Edge Function: unsubscribe-digest
 *
 * Public, no-login unsubscribe link for the weekly digest email. Verifies a
 * per-user HMAC token (signed by weekly-digest using the same
 * EMAIL_UNSUBSCRIBE_SECRET) rather than requiring the user to sign in —
 * standard pattern for email unsubscribe links.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const UNSUB_SECRET = Deno.env.get('EMAIL_UNSUBSCRIBE_SECRET')!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function signUserId(userId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(UNSUB_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function page(message: string): Response {
  return new Response(
    `<!doctype html><html><body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background:#EEF1FA; margin:0; padding:60px 24px;">
      <div style="max-width: 440px; margin: 0 auto; background:#fff; border:1px solid #E8E8E3; border-radius:14px; padding:32px; text-align:center;">
        <div style="width:36px; height:36px; background:#4C5FD5; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; margin-bottom:16px;">
          <span style="color:#fff; font-size:16px; font-weight:700;">S</span>
        </div>
        <p style="font-size:15px; color:#1C2B3A; line-height:1.6;">${message}</p>
      </div>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } },
  );
}

serve(async (req: Request) => {
  const url = new URL(req.url);
  const userId = url.searchParams.get('user_id');
  const token = url.searchParams.get('token');

  if (!userId || !token) return page("This unsubscribe link is missing some information — check you copied the full link from the email.");

  const expected = await signUserId(userId);
  if (!timingSafeEqual(expected, token)) {
    return page("This unsubscribe link doesn't look valid. If you followed it directly from an email we sent, contact hello@spendable.finance and we'll take care of it.");
  }

  const { error } = await supabase.from('user_settings').update({ email_digest_enabled: false }).eq('user_id', userId);
  if (error) {
    return page("Something went wrong unsubscribing you — contact hello@spendable.finance and we'll take care of it manually.");
  }

  return page("You're unsubscribed from the weekly Spendable email. You can turn it back on anytime from Settings.");
});
