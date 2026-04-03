// ─── Core Domain Types ───────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  tax_rate: number;              // e.g. 0.25 for 25%
  emergency_buffer_months: number; // e.g. 3
  starting_balance: number;
  currency: string;              // e.g. "USD"
  tax_schedule: 'annual' | 'quarterly'; // payment cadence for tax tracker
  expected_monthly_income: number; // optional retainer / floor income, 0 = not set
  updated_at: string;
}

export interface IncomeEvent {
  id: string;
  user_id: string;
  amount: number;
  date: string;                  // ISO date string
  source: string;
  notes?: string;
  created_at: string;
}

export interface RecurringExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  frequency: ExpenseFrequency;
  category: ExpenseCategory;
  is_active: boolean;
  created_at: string;
}

export type ExpenseFrequency = 'weekly' | 'monthly' | 'quarterly' | 'annually';
export type ExpenseCategory =
  | 'housing'
  | 'transport'
  | 'food'
  | 'health'
  | 'software'
  | 'insurance'
  | 'entertainment'
  | 'other';

export interface UpcomingExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  created_at: string;
}

// ─── Calculation / Dashboard Types ───────────────────────────────────────────

export interface FinancialMetrics {
  currentBalance: number;
  taxReserve: number;
  emergencyBuffer: number;
  upcomingExpensesTotal: number;
  safeToSpend: number;
  weeklySpendAllowance: number;
  monthlyRunway: number;
  smoothedMonthlyIncome: number;
  monthlyExpenses: number;
  confidenceScore: number; // 0–100
}

export interface MonthlyIncomeSummary {
  month: string;   // "2024-01"
  total: number;
  count: number;
}

// ─── Form Types ───────────────────────────────────────────────────────────────

export interface IncomeFormData {
  amount: number;
  date: string;
  source: string;
  notes?: string;
}

export interface ExpenseFormData {
  name: string;
  amount: number;
  frequency: ExpenseFrequency;
  category: ExpenseCategory;
}

export interface SettingsFormData {
  tax_rate: number;
  emergency_buffer_months: number;
  starting_balance: number;
  currency: string;
  tax_schedule: 'annual' | 'quarterly';
  expected_monthly_income: number;
}

// ─── Supabase Table Names ─────────────────────────────────────────────────────

export type TableName =
  | 'user_settings'
  | 'income_events'
  | 'recurring_expenses'
  | 'upcoming_expenses';

// ─── Subscription ─────────────────────────────────────────────────────────────

export type SubscriptionPlan   = 'free' | 'pro';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';

export interface UserSubscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  subscription_plan:   SubscriptionPlan;
  subscription_status: SubscriptionStatus | null;
  subscription_current_period_end: string | null;  // ISO timestamp
  updated_at: string;
}
