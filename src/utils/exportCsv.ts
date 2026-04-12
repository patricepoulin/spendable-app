/**
 * exportCsv.ts
 * Pure utility functions for exporting app data to CSV files.
 * No dependencies — works offline and online.
 */

import type {
  IncomeEvent,
  RecurringExpense,
  UpcomingExpense,
  UserSettings,
  FinancialMetrics,
} from '../types';
import { toMonthlyAmount, formatCurrency, groupIncomeByMonth } from './calculations';

// ─── Core CSV builder ─────────────────────────────────────────────────────────

/**
 * Escapes a single cell value for CSV:
 * - wraps in quotes if it contains commas, quotes, or newlines
 * - doubles any existing quote characters
 */
function escapeCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCell).join(',');
  const dataLines  = rows.map(row => row.map(escapeCell).join(','));
  return [headerLine, ...dataLines].join('\n');
}

/**
 * Triggers a browser download of a CSV string.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function todayStamp(): string {
  return new Date().toISOString().split('T')[0]; // "2025-03-07"
}

// ─── Income export ────────────────────────────────────────────────────────────

export function exportIncomeCsv(income: IncomeEvent[], currency = 'USD'): void {
  const headers = ['Date', 'Source', 'Amount', 'Currency', 'Notes', 'Created At'];

  const rows = income
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(e => [
      e.date,
      e.source,
      e.amount,
      currency,
      e.notes ?? '',
      e.created_at.split('T')[0],
    ]);

  // Summary rows at the bottom
  const total = income.reduce((s, e) => s + e.amount, 0);
  rows.push([]);
  rows.push(['SUMMARY', '', '', '', '', '']);
  rows.push(['Total Income', total, currency, '', '', '']);
  rows.push(['# Events', income.length, '', '', '', '']);

  // Monthly breakdown
  const monthly = groupIncomeByMonth(income);
  if (monthly.length > 0) {
    rows.push([]);
    rows.push(['MONTHLY BREAKDOWN', '', '', '', '', '']);
    rows.push(['Month', 'Total', 'Currency', '# Payments', '', '']);
    monthly
      .slice()
      .reverse()
      .forEach(m => rows.push([m.month, m.total, currency, m.count, '', '']));
  }

  downloadCsv(`spendable-income-${todayStamp()}.csv`, buildCsv(headers, rows));
}

// ─── Expenses export ──────────────────────────────────────────────────────────
// Note: CSV import is income-only — this export is for reference / accountant use.
// The 'Active' column (Yes/No) reflects whether the expense counts toward calculations.

export function exportExpensesCsv(expenses: RecurringExpense[], currency = 'USD'): void {
  const headers = [
    'Name', 'Category', 'Amount', 'Frequency',
    'Monthly Equivalent', 'Currency', 'Active', 'Created At',
  ];

  const rows = expenses
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(e => [
      e.name,
      e.category,
      e.amount,
      e.frequency,
      Number(toMonthlyAmount(e.amount, e.frequency).toFixed(2)),
      currency,
      e.is_active ? 'Yes' : 'No',
      e.created_at.split('T')[0],
    ]);

  // Totals
  const activeMonthly = expenses
    .filter(e => e.is_active)
    .reduce((s, e) => s + toMonthlyAmount(e.amount, e.frequency), 0);
  const totalMonthly = expenses
    .reduce((s, e) => s + toMonthlyAmount(e.amount, e.frequency), 0);

  rows.push([]);
  rows.push(['SUMMARY', '', '', '', '', '', '', '']);
  rows.push(['Active Monthly Total', '', '', '', Number(activeMonthly.toFixed(2)), currency, '', '']);
  rows.push(['All Monthly Total',    '', '', '', Number(totalMonthly.toFixed(2)),  currency, '', '']);
  rows.push(['Active Annual Est.',   '', '', '', Number((activeMonthly * 12).toFixed(2)), currency, '', '']);

  downloadCsv(`spendable-expenses-${todayStamp()}.csv`, buildCsv(headers, rows));
}

// ─── Upcoming expenses export ─────────────────────────────────────────────────

export function exportUpcomingCsv(upcoming: UpcomingExpense[], currency = 'USD'): void {
  const headers = ['Name', 'Due Date', 'Amount', 'Currency', 'Status'];

  const rows = upcoming
    .slice()
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .map(u => [
      u.name,
      u.due_date,
      u.amount,
      currency,
      u.is_paid ? 'Paid' : 'Unpaid',
    ]);

  const unpaidTotal = upcoming
    .filter(u => !u.is_paid)
    .reduce((s, u) => s + u.amount, 0);

  rows.push([]);
  rows.push(['SUMMARY', '', '', '', '']);
  rows.push(['Unpaid Total', '', Number(unpaidTotal.toFixed(2)), currency, '']);

  downloadCsv(`spendable-upcoming-${todayStamp()}.csv`, buildCsv(headers, rows));
}

// ─── Full financial snapshot export ──────────────────────────────────────────
// Downloads a single CSV with multiple sections — the "accountant export"

export function exportFullSnapshotCsv(params: {
  income: IncomeEvent[];
  expenses: RecurringExpense[];
  upcoming: UpcomingExpense[];
  settings: UserSettings;
  metrics: FinancialMetrics;
}): void {
  const { income, expenses, upcoming, settings, metrics } = params;
  const currency = settings.currency;
  const lines: string[] = [];

  // ── Header ──
  lines.push(`"Spendable — Financial Snapshot","Generated: ${new Date().toLocaleString()}"`);
  lines.push('');

  // ── Dashboard Summary ──
  lines.push('"=== DASHBOARD SUMMARY ==="');
  lines.push('"Metric","Value","Currency"');
  lines.push(`"Current Balance",${metrics.currentBalance},"${currency}"`);
  lines.push(`"Safe to Spend",${metrics.safeToSpend},"${currency}"`);
  lines.push(`"Weekly Allowance",${metrics.weeklySpendAllowance.toFixed(2)},"${currency}"`);
  lines.push(`"Monthly Runway (months)",${metrics.monthlyRunway === Infinity ? 'Unlimited' : metrics.monthlyRunway.toFixed(1)},`);
  lines.push(`"Tax Reserve",${metrics.taxReserve},"${currency}"`);
  lines.push(`"Emergency Buffer",${metrics.emergencyBuffer},"${currency}"`);
  lines.push(`"Smoothed Monthly Income",${metrics.smoothedMonthlyIncome.toFixed(2)},"${currency}"`);
  lines.push(`"Monthly Expenses",${metrics.monthlyExpenses.toFixed(2)},"${currency}"`);
  lines.push(`"Confidence Score",${metrics.confidenceScore},"/100"`);
  lines.push('');

  // ── Settings ──
  lines.push('"=== SETTINGS ==="');
  lines.push('"Setting","Value"');
  lines.push(`"Tax Rate","${(settings.tax_rate * 100).toFixed(0)}%"`);
  lines.push(`"Emergency Buffer Months",${settings.emergency_buffer_months}`);
  lines.push(`"Starting Balance",${settings.starting_balance}`);
  lines.push(`"Currency","${currency}"`);
  lines.push('');

  // ── Income Events ──
  lines.push('"=== INCOME EVENTS ==="');
  lines.push('"Date","Source","Amount","Currency","Notes"');
  income
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach(e => {
      lines.push(`"${e.date}","${e.source}",${e.amount},"${currency}","${(e.notes ?? '').replace(/"/g, '""')}"`);
    });
  const totalIncome = income.reduce((s, e) => s + e.amount, 0);
  lines.push(`"TOTAL","",${totalIncome},"${currency}",""`);
  lines.push('');

  // ── Monthly Income Summary ──
  lines.push('"=== MONTHLY INCOME SUMMARY ==="');
  lines.push('"Month","Total","Currency","# Payments"');
  groupIncomeByMonth(income)
    .slice()
    .reverse()
    .forEach(m => {
      lines.push(`"${m.month}",${m.total},"${currency}",${m.count}`);
    });
  lines.push('');

  // ── Recurring Expenses ──
  lines.push('"=== RECURRING EXPENSES ==="');
  lines.push('"Name","Category","Amount","Frequency","Monthly Equivalent","Currency","Active"');
  expenses
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(e => {
      const monthly = toMonthlyAmount(e.amount, e.frequency).toFixed(2);
      lines.push(`"${e.name}","${e.category}",${e.amount},"${e.frequency}",${monthly},"${currency}","${e.is_active ? 'Yes' : 'No'}"`);
    });
  const activeMonthly = expenses
    .filter(e => e.is_active)
    .reduce((s, e) => s + toMonthlyAmount(e.amount, e.frequency), 0);
  lines.push(`"ACTIVE MONTHLY TOTAL","","","",${activeMonthly.toFixed(2)},"${currency}",""`);
  lines.push('');

  // ── Upcoming Expenses ──
  if (upcoming.length > 0) {
    lines.push('"=== UPCOMING EXPENSES ==="');
    lines.push('"Name","Due Date","Amount","Currency","Paid"');
    upcoming
      .slice()
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .forEach(u => {
        lines.push(`"${u.name}","${u.due_date}",${u.amount},"${currency}","${u.is_paid ? 'Yes' : 'No'}"`);
      });
    lines.push('');
  }

  downloadCsv(`spendable-full-snapshot-${todayStamp()}.csv`, lines.join('\n'));
}
