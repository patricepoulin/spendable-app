import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  incomeApi,
  expensesApi,
  upcomingApi,
  settingsApi,
  IS_MOCK,
} from '../lib/supabase';
import { calcFinancialMetrics } from '../utils/calculations';
import type {
  IncomeEvent,
  RecurringExpense,
  UpcomingExpense,
  UserSettings,
  FinancialMetrics,
} from '../types';

interface UseFinancialsReturn {
  metrics: FinancialMetrics | null;
  income: IncomeEvent[];
  expenses: RecurringExpense[];
  upcoming: UpcomingExpense[];
  settings: UserSettings | null;
  loading: boolean;
  initialLoad: boolean; // true only on the very first mount before any data (cached or live) arrives
  error: string | null;
  liveFailedWithCache: boolean; // true only when live fetch actually failed and cache is being served
  lastUpdated: Date | null; // timestamp of the last successful live fetch
  refresh: () => Promise<void>;
}

const CACHE_KEY = 'spendable_financials_cache';

// Rolling window for calculations: 12 months covers tax reserve (12mo) and
// smoothed income (6mo). The IncomePage uses its own lazy-year loader for
// the full history view — this hook only needs the recent window.
const INCOME_WINDOW_MONTHS = 12;

const DEFAULT_SETTINGS: UserSettings = {
  id: '',
  user_id: '',
  tax_rate: 0.25,
  emergency_buffer_months: 3,
  starting_balance: 0,
  currency: 'USD',
  tax_schedule: 'annual',
  expected_monthly_income: 0,
  updated_at: new Date().toISOString(),
};

// ─── Cache helpers ────────────────────────────────────────────────────────────

function saveCache(data: {
  income: IncomeEvent[];
  expenses: RecurringExpense[];
  upcoming: UpcomingExpense[];
  settings: UserSettings;
}) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* storage full — ignore */
  }
}

function loadCache(): {
  income: IncomeEvent[];
  expenses: RecurringExpense[];
  upcoming: UpcomingExpense[];
  settings: UserSettings;
} | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** ISO date string N months ago from today */
function monthsAgoIso(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split('T')[0];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFinancials(): UseFinancialsReturn {
  const { user } = useAuth();
  const [income, setIncome] = useState<IncomeEvent[]>([]);
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingExpense[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true); // cleared once data first arrives
  const [error, setError] = useState<string | null>(null);
  const [liveFailedWithCache, setLiveFailedWithCache] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch income for the rolling window only — all other data is small enough
      // to always fetch in full. The IncomePage uses useIncomeByYear for the full
      // history view; this hook only needs recent data for metric calculations.
      const windowStart = monthsAgoIso(INCOME_WINDOW_MONTHS);
      const [inc, exp, upc, set] = await Promise.all([
        IS_MOCK
          ? incomeApi.list(user.id)
          : incomeApi.listByDateRange(user.id, windowStart),
        expensesApi.list(user.id),
        upcomingApi.list(user.id),
        settingsApi.get(user.id),
      ]);
      const resolvedSettings = set ?? DEFAULT_SETTINGS;
      setIncome(inc);
      setExpenses(exp);
      setUpcoming(upc);
      setSettings(resolvedSettings);
      setLiveFailedWithCache(false);
      setLastUpdated(new Date());
      setInitialLoad(false);

      // Persist to cache for offline use (skip in mock mode — mock has its own store)
      if (!IS_MOCK) {
        saveCache({
          income: inc,
          expenses: exp,
          upcoming: upc,
          settings: resolvedSettings,
        });
      }
    } catch (e) {
      // Network error — try to serve from cache
      const cached = IS_MOCK ? null : loadCache();
      if (cached) {
        setIncome(cached.income);
        setExpenses(cached.expenses);
        setUpcoming(cached.upcoming);
        setSettings(cached.settings);
        setLiveFailedWithCache(true);
        setError(null);
        setInitialLoad(false);
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // On mount, pre-populate from cache instantly so UI isn't blank while fetching
    if (!IS_MOCK) {
      const cached = loadCache();
      if (cached) {
        setIncome(cached.income);
        setExpenses(cached.expenses);
        setUpcoming(cached.upcoming);
        setSettings(cached.settings);
        setLoading(false);
        setInitialLoad(false);
      }
    }
    refresh();
  }, [refresh]);

  const resolvedSettings = settings ?? DEFAULT_SETTINGS;

  const currentBalance = (() => {
    const totalIncome = income.reduce((sum, e) => sum + e.amount, 0);
    const monthlyExpTotal = expenses
      .filter((e) => e.is_active)
      .reduce((sum, e) => {
        if (e.frequency === 'monthly') return sum + e.amount;
        if (e.frequency === 'weekly') return sum + e.amount * 4;
        if (e.frequency === 'quarterly') return sum + e.amount / 3;
        if (e.frequency === 'annually') return sum + e.amount / 12;
        return sum;
      }, 0);
    const now = new Date();
    const months =
      income.length > 0
        ? Math.max(
            1,
            Math.ceil(
              (now.getTime() -
                new Date(income[income.length - 1]?.date ?? now).getTime()) /
                (30 * 24 * 3600 * 1000),
            ),
          )
        : 1;
    return (
      resolvedSettings.starting_balance + totalIncome - monthlyExpTotal * months
    );
  })();

  const metrics: FinancialMetrics | null =
    settings === null && income.length === 0 && expenses.length === 0
      ? null
      : calcFinancialMetrics({
          currentBalance: Math.max(0, currentBalance),
          incomeEvents: income,
          recurringExpenses: expenses,
          upcomingExpenses: upcoming,
          settings: resolvedSettings,
        });

  return {
    metrics,
    income,
    expenses,
    upcoming,
    settings,
    loading,
    initialLoad,
    error,
    liveFailedWithCache,
    lastUpdated,
    refresh,
  };
}
