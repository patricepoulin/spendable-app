/**
 * taxTracker.ts
 *
 * Pure calculation functions for the Tax Tracker page.
 * Computes YTD income, estimated tax bill, reserved amount,
 * and a full payment-schedule timeline for annual (UK) or quarterly (US/CA/AU/EU) modes.
 */

import type { IncomeEvent } from '../types';

export type TaxSchedule = 'annual' | 'quarterly';

export interface TaxPayment {
  id:          string;        // stable key for localStorage — e.g. "2026-01-31"
  label: string;          // e.g. "31 January 2026 — Balancing payment"
  description: string;    // e.g. "Balancing payment + 1st payment on account"
  dueDate: Date;
  estimatedAmount: number;
  status: 'paid' | 'upcoming' | 'overdue';
  isPrimary: boolean;     // highlight the next key deadline
}

export interface TaxTrackerData {
  ytdIncome: number;          // income in the current tax year
  estimatedBill: number;      // ytdIncome × tax_rate
  reserved: number;           // what the app has already set aside (12-month rolling)
  shortfall: number;          // estimatedBill - reserved (negative = surplus)
  potPct: number;             // reserved / estimatedBill clamped 0–100
  payments: TaxPayment[];
  taxYearLabel: string;       // e.g. "2025–26" or "2025"
  taxYearStart: Date;
  taxYearEnd: Date;
  nextDeadline: TaxPayment | null;
  scheduleNote: string;       // explanatory copy for this region
}

// ─── Tax year helpers ─────────────────────────────────────────────────────────

/** UK tax year runs 6 April → 5 April */
function ukTaxYear(now: Date): { start: Date; end: Date; label: string } {
  const y = now.getFullYear();
  const april6 = new Date(y, 3, 6); // months are 0-indexed
  if (now >= april6) {
    return {
      start: new Date(y, 3, 6),
      end:   new Date(y + 1, 3, 5, 23, 59, 59),
      label: `${y}–${String(y + 1).slice(2)}`,
    };
  }
  return {
    start: new Date(y - 1, 3, 6),
    end:   new Date(y, 3, 5, 23, 59, 59),
    label: `${y - 1}–${String(y).slice(2)}`,
  };
}

/** Calendar tax year (US, CA, AU, EU) runs 1 Jan → 31 Dec */
function calendarTaxYear(now: Date): { start: Date; end: Date; label: string } {
  const y = now.getFullYear();
  return {
    start: new Date(y, 0, 1),
    end:   new Date(y, 11, 31, 23, 59, 59),
    label: String(y),
  };
}

function paymentStatus(due: Date, now: Date): 'paid' | 'upcoming' | 'overdue' {
  // We have no record of actual payments, so classify by date only.
  // A deadline in the past is shown as "overdue" as a reminder to the user.
  return due < now ? 'overdue' : 'upcoming';
}

// ─── Annual schedule (UK self-assessment) ────────────────────────────────────

function buildAnnualPayments(
  taxYear: { start: Date; end: Date; label: string },
  estimatedBill: number,
  now: Date,
): TaxPayment[] {
  // UK has two payment-on-account deadlines + a balancing payment.
  // Payment on account = 50% of previous year's bill.
  // For simplicity (no prior year data) we show the standard Jan/July dates
  // and use 50% of the estimated bill as each payment-on-account amount.

  const endYear  = taxYear.end.getFullYear(); // e.g. 2026 for 2025-26 tax year
  const prevYear = endYear - 1;              // e.g. 2025

  const halfBill = estimatedBill / 2;

  const payments: TaxPayment[] = [
    {
      id:              `${endYear}-01-31`,
      label:           `31 January ${endYear}`,
      description:     `Balancing payment for ${taxYear.label} + 1st payment on account for ${endYear}–${String(endYear + 1).slice(2)}`,
      dueDate:         new Date(endYear, 0, 31),
      estimatedAmount: estimatedBill + halfBill,
      status:          paymentStatus(new Date(endYear, 0, 31), now),
      isPrimary:       true,
    },
    {
      id:              `${endYear}-07-31`,
      label:           `31 July ${endYear}`,
      description:     `2nd payment on account for ${endYear}–${String(endYear + 1).slice(2)}`,
      dueDate:         new Date(endYear, 6, 31),
      estimatedAmount: halfBill,
      status:          paymentStatus(new Date(endYear, 6, 31), now),
      isPrimary:       false,
    },
    // Also show the previous January if it's still relevant (within the year)
    {
      id:              `${prevYear}-01-31`,
      label:           `31 January ${prevYear}`,
      description:     `Balancing payment for ${prevYear - 1}–${String(prevYear).slice(2)} + 1st payment on account for ${taxYear.label}`,
      dueDate:         new Date(prevYear, 0, 31),
      estimatedAmount: estimatedBill + halfBill,
      status:          paymentStatus(new Date(prevYear, 0, 31), now),
      isPrimary:       false,
    },
  ];

  return payments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

// ─── Quarterly schedule (US / CA / AU / EU) ──────────────────────────────────

interface QuarterlyConfig {
  months: number[];   // 0-indexed month of each due date
  days:   number[];   // day of month
  labels: string[];
  scheduleNote: string;
}

function getQuarterlyConfig(currency: string): QuarterlyConfig {
  switch (currency.toUpperCase()) {
    case 'USD':
      return {
        months: [3, 5, 8, 0],   // Apr, Jun, Sep, Jan(next year)
        days:   [15, 17, 16, 15],
        labels: ['Q1 estimated tax', 'Q2 estimated tax', 'Q3 estimated tax', 'Q4 estimated tax'],
        scheduleNote: 'US freelancers pay estimated taxes quarterly to the IRS (Form 1040-ES). Deadlines shift slightly each year — these are typical dates.',
      };
    case 'CAD':
      return {
        months: [2, 5, 8, 11],  // Mar, Jun, Sep, Dec
        days:   [15, 15, 15, 15],
        labels: ['Q1 instalment', 'Q2 instalment', 'Q3 instalment', 'Q4 instalment'],
        scheduleNote: 'Canadian self-employed individuals pay quarterly instalments to the CRA if annual tax owing exceeds $3,000.',
      };
    case 'AUD':
      return {
        months: [10, 1, 4, 7],  // Nov, Feb, May, Aug (Australian financial year)
        days:   [28, 28, 28, 28],
        labels: ['Q1 PAYG instalment', 'Q2 PAYG instalment', 'Q3 PAYG instalment', 'Q4 PAYG instalment'],
        scheduleNote: 'Australian sole traders pay PAYG (Pay As You Go) instalments quarterly to the ATO.',
      };
    default: // EUR and others
      return {
        months: [2, 5, 8, 11],  // Mar, Jun, Sep, Dec
        days:   [31, 30, 30, 31],
        labels: ['Q1 instalment', 'Q2 instalment', 'Q3 instalment', 'Q4 instalment'],
        scheduleNote: 'Self-employed individuals in the EU typically pay quarterly tax instalments. Exact dates vary by country — check with your local tax authority.',
      };
  }
}

function buildQuarterlyPayments(
  taxYear: { start: Date; end: Date; label: string },
  estimatedBill: number,
  currency: string,
  now: Date,
): TaxPayment[] {
  const config    = getQuarterlyConfig(currency);
  const perQ      = estimatedBill / 4;
  const baseYear  = taxYear.start.getFullYear();

  return config.months.map((month, i) => {
    // First assume the deadline falls within baseYear
    let year = baseYear;
    const candidateDate = new Date(year, month, config.days[i]);

    // If this deadline falls before Q1 (the first deadline in the sequence),
    // it belongs to the following year. This correctly handles USD Q4 in January,
    // where month=0 < taxYear.start.getMonth()=0 fails but the date is still wrong.
    const q1Date = new Date(baseYear, config.months[0], config.days[0]);
    if (i > 0 && candidateDate < q1Date) {
      year = baseYear + 1;
    }
    const dueDate = new Date(year, month, config.days[i]);

    const id = `${year}-${String(month + 1).padStart(2, '0')}-${String(config.days[i]).padStart(2, '0')}`;
    return {
      id,
      label:           dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      description:     config.labels[i],
      dueDate,
      estimatedAmount: perQ,
      status:          paymentStatus(dueDate, now),
      isPrimary:       false,
    };
  })
  .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function calcTaxTracker(
  incomeEvents: IncomeEvent[],
  taxRate: number,
  taxSchedule: TaxSchedule,
  currency: string,
  reserved: number,           // from calcTaxReserve (12-month rolling × tax_rate)
): TaxTrackerData {
  const now = new Date();

  const taxYear = taxSchedule === 'annual'
    ? ukTaxYear(now)
    : calendarTaxYear(now);

  // YTD income = all income within the current tax year
  const ytdIncome = incomeEvents
    .filter(e => {
      const d = new Date(e.date);
      return d >= taxYear.start && d <= taxYear.end;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const estimatedBill = ytdIncome * taxRate;
  const shortfall     = estimatedBill - reserved;
  const potPct        = estimatedBill > 0
    ? Math.min(100, Math.round((reserved / estimatedBill) * 100))
    : 100;

  const payments = taxSchedule === 'annual'
    ? buildAnnualPayments(taxYear, estimatedBill, now)
    : buildQuarterlyPayments(taxYear, estimatedBill, currency, now);

  // Mark the soonest upcoming (or most recent overdue) as primary
  const upcoming = payments.filter(p => p.status === 'upcoming');
  if (upcoming.length > 0) {
    upcoming[0].isPrimary = true;
  } else {
    // All overdue — highlight the most recent one
    const overdue = [...payments].filter(p => p.status === 'overdue').reverse();
    if (overdue.length > 0) overdue[0].isPrimary = true;
  }

  const nextDeadline = payments.find(p => p.isPrimary) ?? null;

  const scheduleNote = taxSchedule === 'annual'
    ? 'UK self-assessment works in two stages. You pay a "balancing payment" for the year just ended plus a first "payment on account" (50% of that bill) towards the next year — all due 31 January. A second payment on account falls on 31 July.'
    : getQuarterlyConfig(currency).scheduleNote;

  return {
    ytdIncome,
    estimatedBill,
    reserved,
    shortfall,
    potPct,
    payments,
    taxYearLabel: taxYear.label,
    taxYearStart: taxYear.start,
    taxYearEnd:   taxYear.end,
    nextDeadline,
    scheduleNote,
  };
}

/** Days until a date (negative = days overdue) */
export function daysUntilDeadline(due: Date): number {
  const now   = new Date();
  now.setHours(0, 0, 0, 0);
  const d     = new Date(due);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Returns the start date of the current tax year as an ISO date string (YYYY-MM-DD).
 * Used by TaxTrackerPage to fetch income from the right date rather than a fixed 12-month window.
 */
export function getTaxYearStartIso(taxSchedule: TaxSchedule): string {
  const now   = new Date();
  const start = taxSchedule === 'annual' ? ukTaxYear(now).start : calendarTaxYear(now).start;
  return start.toISOString().split('T')[0];
}
