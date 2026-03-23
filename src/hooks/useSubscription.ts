import { useSubscriptionContext } from './useSubscriptionContext';
import { FREE_INCOME_LIMIT, FREE_EXPENSE_LIMIT, FREE_UPCOMING_LIMIT } from '../services/stripe';
import type { SubscriptionPlan } from '../types';

export const EXPORT_GRACE_DAYS = 30;

interface UseSubscriptionReturn {
  subscription:       ReturnType<typeof useSubscriptionContext>['subscription'];
  plan:               SubscriptionPlan;
  isPro:              boolean;
  isInGracePeriod:    boolean;
  graceDaysRemaining: number;
  canExportCsv:       boolean;
  loading:            boolean;
  totalIncomeCount:   number;
  isAtIncomeLimit:    boolean;
  isAtExpenseLimit:   boolean;
  isAtUpcomingLimit:  boolean;
  freeExpenseLimit:   number;
  freeUpcomingLimit:  number;
  isPaymentFailing:   boolean;
  refresh:            () => Promise<void>;
}

export function useSubscription(
  incomeEvents: { date: string }[] = [],
  expenseCount: number = 0,
  upcomingCount: number = 0,
  totalIncomeOverride?: number,  // pass a real DB count to bypass incomeEvents.length
): UseSubscriptionReturn {
  // Read the single shared subscription row from context — no per-component fetch
  const { subscription, loading, refresh } = useSubscriptionContext();

  const plan: SubscriptionPlan = subscription?.subscription_plan ?? 'free';

  const isPro =
    plan === 'pro' &&
    (subscription?.subscription_status === 'active' ||
     subscription?.subscription_status === 'trialing');

  // ── Grace period ──────────────────────────────────────────────────────────
  const graceDaysRemaining = (() => {
    if (isPro) return 0;
    if (subscription?.subscription_status !== 'canceled') return 0;
    if (!subscription.subscription_current_period_end) return 0;

    const periodEnd = new Date(subscription.subscription_current_period_end);
    const graceEnd  = new Date(periodEnd.getTime() + EXPORT_GRACE_DAYS * 24 * 60 * 60 * 1000);
    const msLeft    = graceEnd.getTime() - Date.now();

    if (msLeft <= 0) return 0;
    return Math.ceil(msLeft / (24 * 60 * 60 * 1000));
  })();

  const isInGracePeriod = graceDaysRemaining > 0;
  const canExportCsv    = isPro || isInGracePeriod;

  // ── Limit checks ──────────────────────────────────────────────────────────
  // totalIncomeOverride lets callers supply a real DB count (e.g. SettingsPage)
  // without having to construct a proxy array of the right length.
  const totalIncomeCount  = totalIncomeOverride ?? incomeEvents.length;
  const isAtIncomeLimit   = !loading && !isPro && totalIncomeCount >= FREE_INCOME_LIMIT;
  const isAtExpenseLimit  = !isPro && expenseCount >= FREE_EXPENSE_LIMIT;
  const isAtUpcomingLimit = !isPro && upcomingCount >= FREE_UPCOMING_LIMIT;
  const freeExpenseLimit  = FREE_EXPENSE_LIMIT;
  const freeUpcomingLimit = FREE_UPCOMING_LIMIT;

  // ── Payment failing ───────────────────────────────────────────────────────
  const isPaymentFailing =
    subscription?.subscription_plan === 'pro' &&
    (subscription?.subscription_status === 'past_due' ||
     subscription?.subscription_status === 'unpaid');

  return {
    subscription, plan, isPro,
    isInGracePeriod, graceDaysRemaining, canExportCsv,
    loading, totalIncomeCount, isAtIncomeLimit,
    isAtExpenseLimit, isAtUpcomingLimit,
    freeExpenseLimit, freeUpcomingLimit,
    isPaymentFailing, refresh,
  };
}
