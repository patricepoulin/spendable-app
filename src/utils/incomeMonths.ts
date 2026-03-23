import type { IncomeEvent } from '../types';

// ─── Month / Year key helpers ─────────────────────────────────────────────────

export function toMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // "2026-04"
}

export function toYearKey(dateStr: string): string {
  return dateStr.slice(0, 4); // "2026"
}

export function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' });
}

export function formatYearLabel(key: string): string {
  return key; // "2026"
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IncomeMonth {
  key: string;           // "2026-04"
  label: string;         // "April"
  entries: IncomeEvent[];
  total: number;
  isEmpty: boolean;
}

export interface IncomeYear {
  year: string;          // "2026"
  months: IncomeMonth[];
  total: number;
}

// ─── Generate full month sequence between two keys ────────────────────────────

export function generateMonthsBetween(start: string, end: string): string[] {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  const months: string[] = [];
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

// ─── Build year-grouped timeline ─────────────────────────────────────────────

/**
 * Groups income into years, each containing a continuous month sequence.
 * Missing months are included as isEmpty=true.
 * Returns years newest-first, months within each year newest-first.
 */
export function buildIncomeTimeline(income: IncomeEvent[]): IncomeYear[] {
  if (income.length === 0) return [];

  const keys     = income.map(e => toMonthKey(e.date));
  const earliest = [...keys].sort()[0];
  const latest   = [...keys].sort().reverse()[0];

  // Group entries by month key
  const grouped: Record<string, IncomeEvent[]> = {};
  for (const event of income) {
    const key = toMonthKey(event.date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(event);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => b.date.localeCompare(a.date));
  }

  // Full month sequence, grouped by year
  const allMonths = generateMonthsBetween(earliest, latest);
  const byYear: Record<string, IncomeMonth[]> = {};

  for (const key of allMonths) {
    const year    = toYearKey(key);
    const entries = grouped[key] ?? [];
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push({
      key,
      label:   formatMonthLabel(key),
      entries,
      total:   entries.reduce((s, e) => s + e.amount, 0),
      isEmpty: entries.length === 0,
    });
  }

  // Build IncomeYear array, newest year first, months newest first within
  return Object.entries(byYear)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, months]) => ({
      year,
      months: [...months].reverse(), // newest month first
      total:  months.reduce((s, m) => s + m.total, 0),
    }));
}
