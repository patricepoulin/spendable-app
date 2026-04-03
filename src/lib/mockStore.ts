/**
 * mockStore.ts
 *
 * In-memory data store used when VITE_MOCK_AUTH=true.
 * Mirrors the exact API shape of the Supabase helpers so the rest
 * of the app needs zero changes.
 *
 * Data persists for the browser session via localStorage so you
 * don't lose work if you hot-reload during a flight.
 */

import type {
  UserSettings,
  IncomeEvent,
  RecurringExpense,
  UpcomingExpense,
  IncomeFormData,
  ExpenseFormData,
  SettingsFormData,
  UserSubscription,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_USER_ID = 'mock-user-offline-001';
const STORAGE_KEY = 'spendable_mock_store';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function today(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split('T')[0];
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_SETTINGS: UserSettings = {
  id: uuid(),
  user_id: MOCK_USER_ID,
  tax_rate: 0.25,
  emergency_buffer_months: 3,
  starting_balance: 18500,
  currency: 'USD',
  tax_schedule: 'annual',
  expected_monthly_income: 0,
  updated_at: new Date().toISOString(),
};

const SEED_INCOME: IncomeEvent[] = [
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    amount: 8400,
    date: today(-5),
    source: 'Client Project',
    notes: 'Acme Corp — Q4 design sprint',
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    amount: 3200,
    date: monthsAgo(1),
    source: 'Consulting',
    notes: 'Strategy session x4',
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    amount: 5900,
    date: monthsAgo(1),
    source: 'Freelance Contract',
    notes: 'Frontend build — startup client',
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    amount: 1200,
    date: monthsAgo(2),
    source: 'Royalty',
    notes: 'Plugin sales — Sept',
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    amount: 9800,
    date: monthsAgo(2),
    source: 'Client Project',
    notes: 'Full brand identity project',
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    amount: 4100,
    date: monthsAgo(3),
    source: 'Freelance Contract',
    notes: 'React component library',
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    amount: 2600,
    date: monthsAgo(3),
    source: 'Consulting',
    notes: 'Tech audit',
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    amount: 7200,
    date: monthsAgo(4),
    source: 'Client Project',
    notes: 'E-commerce redesign',
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    amount: 950,
    date: monthsAgo(4),
    source: 'Product Sale',
    notes: 'Template pack launch',
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    amount: 5500,
    date: monthsAgo(5),
    source: 'Client Project',
    notes: 'Mobile app UI',
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    amount: 3800,
    date: monthsAgo(5),
    source: 'Freelance Contract',
    notes: 'API integration work',
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    amount: 6100,
    date: monthsAgo(6),
    source: 'Client Project',
    notes: 'SaaS dashboard build',
    created_at: new Date().toISOString(),
  },
];

const SEED_EXPENSES: RecurringExpense[] = [
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    name: 'Rent',
    amount: 2200,
    frequency: 'monthly',
    category: 'housing',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    name: 'Health Insurance',
    amount: 380,
    frequency: 'monthly',
    category: 'health',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    name: 'Internet',
    amount: 80,
    frequency: 'monthly',
    category: 'software',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    name: 'Figma',
    amount: 15,
    frequency: 'monthly',
    category: 'software',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    name: 'GitHub',
    amount: 4,
    frequency: 'monthly',
    category: 'software',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    name: 'Car Insurance',
    amount: 1400,
    frequency: 'annually',
    category: 'insurance',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    name: 'Gym',
    amount: 55,
    frequency: 'monthly',
    category: 'health',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: uuid(),
    user_id: MOCK_USER_ID,
    name: 'Netflix',
    amount: 18,
    frequency: 'monthly',
    category: 'entertainment',
    is_active: false,
    created_at: new Date().toISOString(),
  },
];

const SEED_UPCOMING: UpcomingExpense[] = [];

// ─── Store Shape ──────────────────────────────────────────────────────────────

interface StoreShape {
  settings: UserSettings;
  income: IncomeEvent[];
  expenses: RecurringExpense[];
  upcoming: UpcomingExpense[];
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadStore(): StoreShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoreShape;
  } catch {
    /* ignore */
  }
  return {
    settings: SEED_SETTINGS,
    income: [...SEED_INCOME],
    expenses: [...SEED_EXPENSES],
    upcoming: [...SEED_UPCOMING],
  };
}

function saveStore(store: StoreShape): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage full — ignore */
  }
}

// Mutable store object — loaded once on import
const store: StoreShape = loadStore();

function persist() {
  saveStore(store);
}

// ─── Mock Auth ────────────────────────────────────────────────────────────────

export const MOCK_USER_ID_EXPORT = MOCK_USER_ID;

export const mockAuth = {
  async signIn(_email: string, _password: string) {
    // Accept any credentials offline
    return { error: null };
  },
  async signUp(_email: string, _password: string) {
    return { error: null };
  },
  async signOut() {
    return { error: null };
  },
};

// ─── Mock Settings API ────────────────────────────────────────────────────────

export const mockSettingsApi = {
  async get(_userId: string): Promise<UserSettings | null> {
    return { ...store.settings };
  },

  async upsert(_userId: string, form: SettingsFormData): Promise<UserSettings> {
    store.settings = {
      ...store.settings,
      ...form,
      updated_at: new Date().toISOString(),
    };
    persist();
    return { ...store.settings };
  },

  defaults(): SettingsFormData {
    return {
      tax_rate: 0.25,
      emergency_buffer_months: 3,
      starting_balance: 0,
      currency: 'USD',
      tax_schedule: 'annual',
      expected_monthly_income: 0,
    };
  },
};

// ─── Mock Income API ──────────────────────────────────────────────────────────

export const mockIncomeApi = {
  async list(_userId: string): Promise<IncomeEvent[]> {
    return [...store.income].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  },

  async create(_userId: string, form: IncomeFormData): Promise<IncomeEvent> {
    const event: IncomeEvent = {
      id: uuid(),
      user_id: MOCK_USER_ID,
      ...form,
      created_at: new Date().toISOString(),
    };
    store.income.unshift(event);
    persist();
    return { ...event };
  },

  async update(id: string, form: IncomeFormData): Promise<IncomeEvent> {
    const idx = store.income.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Income event not found');
    store.income[idx] = { ...store.income[idx], ...form };
    persist();
    return { ...store.income[idx] };
  },

  async delete(id: string): Promise<void> {
    store.income = store.income.filter((e) => e.id !== id);
    persist();
  },

  async batchInsert(
    rows: Array<{
      user_id: string;
      date: string;
      source: string;
      amount: number;
      notes: string;
    }>,
  ): Promise<number> {
    const events = rows.map((r) => ({
      id: uuid(),
      user_id: MOCK_USER_ID,
      date: r.date,
      source: r.source,
      amount: r.amount,
      notes: r.notes ?? '',
      created_at: new Date().toISOString(),
    }));
    store.income.unshift(...events);
    persist();
    return events.length;
  },
};

// ─── Mock Expenses API ────────────────────────────────────────────────────────

export const mockExpensesApi = {
  async list(_userId: string): Promise<RecurringExpense[]> {
    return [...store.expenses].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  },

  async create(
    _userId: string,
    form: ExpenseFormData,
  ): Promise<RecurringExpense> {
    const expense: RecurringExpense = {
      id: uuid(),
      user_id: MOCK_USER_ID,
      ...form,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    store.expenses.unshift(expense);
    persist();
    return { ...expense };
  },

  async update(
    id: string,
    updates: Partial<RecurringExpense>,
  ): Promise<RecurringExpense> {
    const idx = store.expenses.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Expense not found');
    store.expenses[idx] = { ...store.expenses[idx], ...updates };
    persist();
    return { ...store.expenses[idx] };
  },

  async delete(id: string): Promise<void> {
    store.expenses = store.expenses.filter((e) => e.id !== id);
    persist();
  },
};

// ─── Mock Upcoming API ────────────────────────────────────────────────────────

export const mockUpcomingApi = {
  async list(_userId: string): Promise<UpcomingExpense[]> {
    return [...store.upcoming].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
    );
  },

  async markPaid(id: string): Promise<void> {
    const idx = store.upcoming.findIndex((e) => e.id === id);
    if (idx !== -1) {
      store.upcoming[idx].is_paid = true;
      persist();
    }
  },

  async update(
    id: string,
    data: { name: string; amount: number; due_date: string },
  ): Promise<void> {
    const idx = store.upcoming.findIndex((e) => e.id === id);
    if (idx !== -1) {
      store.upcoming[idx] = { ...store.upcoming[idx], ...data };
      persist();
    }
  },

  async create(
    _userId: string,
    data: { name: string; amount: number; due_date: string },
  ): Promise<void> {
    store.upcoming.push({
      id: `upcoming-${Date.now()}`,
      user_id: _userId,
      name: data.name,
      amount: data.amount,
      due_date: data.due_date,
      is_paid: false,
      created_at: new Date().toISOString(),
    });
    persist();
  },

  async delete(id: string): Promise<void> {
    store.upcoming = store.upcoming.filter((e) => e.id !== id);
    persist();
  },
};

// ─── Subscription API (mock — always returns free plan) ──────────────────────

export const mockSubscriptionApi = {
  async get(_userId: string): Promise<UserSubscription | null> {
    // In mock mode there is no Stripe, so always return a free-plan record.
    return {
      id: 'mock-sub-001',
      user_id: _userId,
      stripe_customer_id: null,
      subscription_plan: 'free',
      subscription_status: null,
      subscription_current_period_end: null,
      updated_at: new Date().toISOString(),
    } as unknown as UserSubscription;
  },
};

// ─── Reset helper (useful during testing) ────────────────────────────────────

export function resetMockStore(): void {
  localStorage.removeItem(STORAGE_KEY);
  store.settings = { ...SEED_SETTINGS };
  store.income = [...SEED_INCOME];
  store.expenses = [...SEED_EXPENSES];
  store.upcoming = [...SEED_UPCOMING];
}
