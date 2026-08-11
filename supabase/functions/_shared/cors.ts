/**
 * Shared CORS allowlist for all Edge Functions.
 *
 * Access-Control-Allow-Origin can only ever be a single value, so we check
 * the request's Origin against a fixed allowlist and echo it back on a
 * match. Anything else falls back to the primary app origin — a value that
 * will never match an untrusted caller's actual Origin, so the browser
 * still blocks the response from being read.
 */

const ALLOWED_ORIGINS = new Set([
  'https://app.spendable.finance',
  'https://spendable.finance',
  'http://localhost:5173',
  'http://localhost:4173',
]);

const DEFAULT_ORIGIN = 'https://app.spendable.finance';

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : DEFAULT_ORIGIN;

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}
