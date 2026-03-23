import type {
  IncomeEvent,
  RecurringExpense,
  UpcomingExpense,
  UserSettings,
  FinancialMetrics,
  MonthlyIncomeSummary,
} from '../types';

// ─── Expense Normalization ────────────────────────────────────────────────────

/**
 * Converts any recurring expense frequency to a monthly amount.
 */
export function toMonthlyAmount(amount: number, frequency: RecurringExpense['frequency']): number {
  switch (frequency) {
    case 'weekly':    return amount * 52 / 12;
    case 'monthly':   return amount;
    case 'quarterly': return amount / 3;
    case 'annually':  return amount / 12;
  }
}

/**
 * Total monthly expenses from all active recurring expenses.
 */
export function calcMonthlyExpenses(expenses: RecurringExpense[]): number {
  return expenses
    .filter(e => e.is_active)
    .reduce((sum, e) => sum + toMonthlyAmount(e.amount, e.frequency), 0);
}

// ─── Income Smoothing ─────────────────────────────────────────────────────────

/**
 * Groups income events by month (YYYY-MM) and returns monthly totals.
 */
export function groupIncomeByMonth(events: IncomeEvent[]): MonthlyIncomeSummary[] {
  const map: Record<string, MonthlyIncomeSummary> = {};

  for (const event of events) {
    const month = event.date.slice(0, 7); // "2024-03"
    if (!map[month]) map[month] = { month, total: 0, count: 0 };
    map[month].total += event.amount;
    map[month].count += 1;
  }

  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Calculates smoothed average monthly income over the last N months.
 * Uses a rolling 6-month window by default.
 */
export function calcSmoothedMonthlyIncome(
  events: IncomeEvent[],
  windowMonths = 6
): number {
  const monthly = groupIncomeByMonth(events);
  const recent = monthly.slice(-windowMonths);
  if (recent.length === 0) return 0;
  const total = recent.reduce((sum, m) => sum + m.total, 0);
  return total / windowMonths; // divide by window (not actual months) for smoothing
}

// ─── Reserve Calculations ─────────────────────────────────────────────────────

/**
 * Tax reserve = total income (last 12 months) * tax rate
 */
export function calcTaxReserve(events: IncomeEvent[], taxRate: number): number {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const recentIncome = events
    .filter(e => new Date(e.date) >= oneYearAgo)
    .reduce((sum, e) => sum + e.amount, 0);

  return recentIncome * taxRate;
}

/**
 * Emergency buffer = average monthly expenses * buffer months
 */
export function calcEmergencyBuffer(
  monthlyExpenses: number,
  bufferMonths: number
): number {
  return monthlyExpenses * bufferMonths;
}

/**
 * Total of all unpaid upcoming expenses (no date window).
 * Every known future bill reduces safe-to-spend immediately so users
 * are never caught short as a due date approaches.
 */
export function calcUpcomingExpensesTotal(upcoming: UpcomingExpense[]): number {
  return upcoming
    .filter(u => !u.is_paid)
    .reduce((sum, u) => sum + u.amount, 0);
}

// ─── Safe-to-Spend & Runway ───────────────────────────────────────────────────

/**
 * Safe to spend = balance - tax_reserve - emergency_buffer - upcoming_expenses
 */
export function calcSafeToSpend(
  balance: number,
  taxReserve: number,
  emergencyBuffer: number,
  upcomingExpenses: number
): number {
  return Math.max(0, balance - taxReserve - emergencyBuffer - upcomingExpenses);
}

/**
 * Runway in months = safe balance / monthly expenses
 */
export function calcRunwayMonths(safeToSpend: number, monthlyExpenses: number): number {
  if (monthlyExpenses <= 0) return Infinity;
  return safeToSpend / monthlyExpenses;
}

/**
 * Weekly allowance = safe_to_spend / (runway_months * 4.33)
 * Capped at safeToSpend / 4 to prevent overspend
 */
export function calcWeeklyAllowance(safeToSpend: number, runwayMonths: number): number {
  if (runwayMonths === Infinity || runwayMonths <= 0) return safeToSpend / 4;
  return safeToSpend / (runwayMonths * 4.33);
}

// ─── Financial Confidence Score ───────────────────────────────────────────────

/**
 * Scores financial health 0–100 based on:
 * - Runway (40 pts): >= 6mo = 40, >= 3mo = 20, < 3mo = 0
 * - Tax reserve adequacy (20 pts): has a reserve = 20, partial = 10
 * - Emergency buffer (20 pts): >= 3mo = 20, >= 1mo = 10
 * - Income stability (20 pts): has 3+ months of income history = 20
 */
export function calcConfidenceScore(params: {
  runwayMonths: number;
  taxReserve: number;
  emergencyBuffer: number;
  emergencyBufferMonths: number;
  incomeMonthsCount: number;
}): number {
  const { runwayMonths, taxReserve, emergencyBuffer, emergencyBufferMonths, incomeMonthsCount } = params;

  let score = 0;

  // Runway component (40 pts)
  if (runwayMonths === Infinity) score += 40;
  else if (runwayMonths >= 6) score += 40;
  else if (runwayMonths >= 3) score += 25;
  else if (runwayMonths >= 1) score += 10;

  // Tax reserve (20 pts)
  if (taxReserve > 0) score += 20;

  // Emergency buffer (20 pts)
  if (emergencyBufferMonths >= 3 && emergencyBuffer > 0) score += 20;
  else if (emergencyBufferMonths >= 1 && emergencyBuffer > 0) score += 10;

  // Income history stability (20 pts)
  if (incomeMonthsCount >= 6) score += 20;
  else if (incomeMonthsCount >= 3) score += 12;
  else if (incomeMonthsCount >= 1) score += 5;

  return Math.min(100, score);
}

export function getConfidenceLabel(score: number): { label: string; color: string; description: string } {
  if (score >= 80) return { label: 'Strong', color: '#16A34A', description: 'Your finances are in great shape' };
  if (score >= 60) return { label: 'Healthy', color: '#65A30D', description: 'Good foundation, room to improve' };
  if (score >= 40) return { label: 'Caution', color: '#D97706', description: 'Some areas need attention' };
  if (score >= 20) return { label: 'At Risk', color: '#DC2626', description: 'Take action to stabilize' };
  return { label: 'Critical', color: '#991B1B', description: 'Immediate attention needed' };
}


// ─── Master Calculation ───────────────────────────────────────────────────────

/**
 * Derives all financial metrics from raw data + settings.
 */
export function calcFinancialMetrics(params: {
  currentBalance: number;
  incomeEvents: IncomeEvent[];
  recurringExpenses: RecurringExpense[];
  upcomingExpenses: UpcomingExpense[];
  settings: UserSettings;
}): FinancialMetrics {
  const { currentBalance, incomeEvents, recurringExpenses, upcomingExpenses, settings } = params;

  const monthlyExpenses = calcMonthlyExpenses(recurringExpenses);
  const taxReserve = calcTaxReserve(incomeEvents, settings.tax_rate);
  const emergencyBuffer = calcEmergencyBuffer(monthlyExpenses, settings.emergency_buffer_months);
  const upcomingTotal = calcUpcomingExpensesTotal(upcomingExpenses);
  const safeToSpend = calcSafeToSpend(currentBalance, taxReserve, emergencyBuffer, upcomingTotal);
  const monthlyRunway = calcRunwayMonths(safeToSpend, monthlyExpenses);
  const weeklySpendAllowance = calcWeeklyAllowance(safeToSpend, monthlyRunway);
  const smoothedMonthlyIncome = calcSmoothedMonthlyIncome(incomeEvents);
  const incomeMonthsCount = groupIncomeByMonth(incomeEvents).length;
  const confidenceScore = calcConfidenceScore({
    runwayMonths: monthlyRunway,
    taxReserve,
    emergencyBuffer,
    emergencyBufferMonths: settings.emergency_buffer_months,
    incomeMonthsCount,
  });

  return {
    currentBalance,
    taxReserve,
    emergencyBuffer,
    upcomingExpensesTotal: upcomingTotal,
    safeToSpend,
    weeklySpendAllowance,
    monthlyRunway,
    smoothedMonthlyIncome,
    monthlyExpenses,
    confidenceScore,
  };
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRunway(months: number): string {
  if (months === Infinity) return '∞';
  if (months < 1) return `${Math.round(months * 30)}d`;
  if (months < 12) return `${months.toFixed(1)}mo`;
  return `${(months / 12).toFixed(1)}yr`;
}

export function getRunwayColor(months: number): string {
  if (months === Infinity) return 'green';
  if (months >= 6) return 'green';
  if (months >= 3) return 'yellow';
  return 'red';
}

export function getSafeSpendStatus(safeToSpend: number, monthlyExpenses: number): {
  label: string;
  color: string;
} {
  const ratio = safeToSpend / (monthlyExpenses || 1);
  if (ratio >= 3) return { label: 'Healthy', color: 'green' };
  if (ratio >= 1) return { label: 'Caution', color: 'yellow' };
  return { label: 'Critical', color: 'red' };
}

