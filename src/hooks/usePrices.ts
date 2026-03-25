/**
 * usePrices
 *
 * Fetches live Pro subscription prices from the get-prices Edge Function.
 * Amounts come back in minor units (cents/pence) — e.g. 1000 = $10.00.
 * Cached in module-level memory so only one fetch fires per browser session
 * regardless of how many components use this hook.
 */

import { useState, useEffect } from 'react';

export type CurrencyKey = 'usd' | 'gbp' | 'eur' | 'cad' | 'aud';

export interface PriceMap {
  usd: number | null;
  gbp: number | null;
  eur: number | null;
  cad: number | null;
  aud: number | null;
}

// Fallback prices in minor units if the fetch fails
const FALLBACK: PriceMap = {
  usd: 1000,
  gbp:  800,
  eur: 1000,
  cad: 1300,
  aud: 1500,
};

const CURRENCY_SYMBOLS: Record<CurrencyKey, string> = {
  usd: '$',
  gbp: '£',
  eur: '€',
  cad: 'C$',
  aud: 'A$',
};

/** Format a minor-unit amount (e.g. 1000) as a display string (e.g. "$10") */
export function formatPrice(amount: number | null, currency: CurrencyKey): string {
  if (amount === null) return '—';
  const sym = CURRENCY_SYMBOLS[currency];
  const major = amount / 100;
  // Show whole number if no cents, otherwise 2dp
  return `${sym}${major % 1 === 0 ? major.toFixed(0) : major.toFixed(2)}`;
}

// Module-level cache so the fetch only fires once per session
let _cache: PriceMap | null = null;
let _promise: Promise<PriceMap> | null = null;

function fetchPrices(): Promise<PriceMap> {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-prices`;

  _promise = fetch(url)
    .then(r => r.ok ? r.json() : Promise.reject(r.status))
    .then((data: PriceMap) => {
      _cache = data;
      return data;
    })
    .catch(() => {
      _promise = null; // allow retry on next mount
      return FALLBACK;
    });

  return _promise;
}

interface UsePricesReturn {
  prices: PriceMap;
  loading: boolean;
  /** Get formatted price for a given currency, e.g. "$10" */
  format: (currency: CurrencyKey) => string;
  /** Get price per month label for a currency, e.g. "$10/mo" */
  label: (currency: CurrencyKey) => string;
}

export function usePrices(): UsePricesReturn {
  const [prices, setPrices] = useState<PriceMap>(_cache ?? FALLBACK);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) return; // already have it
    fetchPrices().then(p => {
      setPrices(p);
      setLoading(false);
    });
  }, []);

  return {
    prices,
    loading,
    format: (currency: CurrencyKey) => formatPrice(prices[currency], currency),
    label:  (currency: CurrencyKey) => `${formatPrice(prices[currency], currency)}/mo`,
  };
}
