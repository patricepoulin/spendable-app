import type { IncomeEvent, RecurringExpense, UserSettings } from '../types';
import type { ForecastMonth, BalanceTier } from '../types/forecast';
import { calcSmoothedMonthlyIncome, calcMonthlyExpenses } from './calculations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7); // "2025-04"
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); // "Apr 2025"
}

function getTier(balance: number, monthlyExpenses: number): BalanceTier {
  if (balance < 0)                         return 'negative';
  if (balance < monthlyExpenses * 1)       return 'critical';
  if (balance < monthlyExpenses * 2)       return 'low';
  return 'healthy';
}

// ─── Main forecast function ───────────────────────────────────────────────────

export interface ForecastParams {
  currentBalance: number;
  income: IncomeEvent[];
  expenses: RecurringExpense[];
  settings: UserSettings;
  months?: number;   // default 6
}

export function calculateForecast({
  currentBalance,
  income,
  expenses,
  settings,
  months = 6,
}: ForecastParams): ForecastMonth[] {
  const avgMonthlyIncome  = calcSmoothedMonthlyIncome(income, 6);
  const monthlyExpenses   = calcMonthlyExpenses(expenses);
  const monthlyTaxReserve = avgMonthlyIncome * settings.tax_rate;
  const netMonthlyChange  = avgMonthlyIncome - monthlyExpenses - monthlyTaxReserve;

  const result: ForecastMonth[] = [];
  let balance = currentBalance;
  const now = new Date();

  for (let i = 1; i <= months; i++) {
    const date = addMonths(now, i);
    balance = balance + netMonthlyChange;

    result.push({
      month:            monthKey(date),
      label:            monthLabel(date),
      projectedBalance: Math.round(balance),
      income:           Math.round(avgMonthlyIncome),
      expenses:         Math.round(monthlyExpenses),
      taxReserve:       Math.round(monthlyTaxReserve),
      netChange:        Math.round(netMonthlyChange),
      tier:             getTier(balance, monthlyExpenses),
    });
  }

  return result;
}

// ─── Runway from forecast ─────────────────────────────────────────────────────

export function calculateRunwayFromForecast(forecast: ForecastMonth[]): number {
  // Find first month where balance goes negative — that's when runway ends
  const firstNegative = forecast.findIndex(m => m.projectedBalance < 0);
  if (firstNegative === -1) return Infinity; // never goes negative in window
  return firstNegative; // number of months until negative (0 = already negative next month)
}

// ─── Tier colours (shared by chart + table) ───────────────────────────────────

export const TIER_CONFIG: Record<BalanceTier, { color: string; bg: string; border: string; label: string }> = {
  healthy:  { color: '#27AE60', bg: 'rgba(39,174,96,0.10)',  border: 'rgba(39,174,96,0.25)',  label: 'Healthy'  },
  low:      { color: '#D4A800', bg: 'rgba(212,168,0,0.10)', border: 'rgba(212,168,0,0.25)', label: 'Low'      },
  critical: { color: '#EB5757', bg: 'rgba(235,87,87,0.10)', border: 'rgba(235,87,87,0.25)', label: 'Critical' },
  negative: { color: '#991B1B', bg: 'rgba(153,27,27,0.10)', border: 'rgba(153,27,27,0.25)', label: 'Negative' },
};
