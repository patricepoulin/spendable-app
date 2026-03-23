/**
 * supabase.ts
 *
 * All data API calls go through this file.
 * When VITE_MOCK_AUTH=true, every call is routed to mockStore.ts (works offline).
 * When VITE_MOCK_AUTH is unset/false, real Supabase is used.
 */

import { createClient } from '@supabase/supabase-js';
import type {
  UserSettings, IncomeEvent, RecurringExpense,
  UpcomingExpense, IncomeFormData, ExpenseFormData, SettingsFormData,
  UserSubscription, SubscriptionPlan, SubscriptionStatus,
} from '../types';
import {
  mockSettingsApi, mockIncomeApi, mockExpensesApi, mockUpcomingApi, mockAuth, mockSubscriptionApi,
} from './mockStore';

// ─── Mode flag ────────────────────────────────────────────────────────────────

// IS_MOCK is only active in development mode AND when VITE_MOCK_AUTH=true.
// In production builds (import.meta.env.PROD), mock mode is always disabled
// regardless of the env var, preventing accidental activation.
export const IS_MOCK =
  !import.meta.env.PROD &&
  import.meta.env.VITE_MOCK_AUTH === 'true';

// ─── Supabase client (lazy — only used when IS_MOCK is false) ─────────────────

function createSupabase() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  );
}

// Singleton — created once, only when needed
let _sb: ReturnType<typeof createSupabase> | null = null;
function sb() {
  if (!_sb) _sb = createSupabase();
  return _sb;
}

// Export the raw client for the auth hook's onAuthStateChange listener
// Lazy getter — never evaluated at import time, only when first accessed
export const supabase = IS_MOCK ? null : sb();

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export const auth = {
  signIn: (email: string, password: string) =>
    IS_MOCK
      ? mockAuth.signIn(email, password)
      : sb().auth.signInWithPassword({ email, password }),

  signUp: (email: string, password: string) =>
    IS_MOCK
      ? mockAuth.signUp(email, password)
      : sb().auth.signUp({ email, password }),

  signOut: () =>
    IS_MOCK
      ? mockAuth.signOut()
      : sb().auth.signOut(),

  getSession: () =>
    IS_MOCK
      ? Promise.resolve({ data: { session: null }, error: null })
      : sb().auth.getSession(),
};

// ─── Settings API ─────────────────────────────────────────────────────────────

export const settingsApi = {
  async get(userId: string): Promise<UserSettings | null> {
    if (IS_MOCK) return mockSettingsApi.get(userId);
    const { data, error } = await sb()
      .from('user_settings').select('*').eq('user_id', userId).single();
    if (error) return null;
    return data as UserSettings;
  },

  async upsert(userId: string, settings: SettingsFormData): Promise<UserSettings> {
    if (IS_MOCK) return mockSettingsApi.upsert(userId, settings);
    const { data, error } = await sb()
      .from('user_settings')
      .upsert(
        { user_id: userId, ...settings, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select().single();
    if (error) throw error;
    return data as UserSettings;
  },

  defaults(): SettingsFormData {
    return { tax_rate: 0.25, emergency_buffer_months: 3, starting_balance: 0, currency: 'USD', tax_schedule: 'annual' };
  },
};

// ─── Income API ───────────────────────────────────────────────────────────────

export const incomeApi = {
  async list(userId: string): Promise<IncomeEvent[]> {
    if (IS_MOCK) return mockIncomeApi.list(userId);
    const { data, error } = await sb()
      .from('income_events').select('*').eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as IncomeEvent[];
  },

  /** Fetches income events from a start date (inclusive) to today, newest first. */
  async listByDateRange(userId: string, fromDate: string): Promise<IncomeEvent[]> {
    if (IS_MOCK) return mockIncomeApi.list(userId);
    const { data, error } = await sb()
      .from('income_events')
      .select('*')
      .eq('user_id', userId)
      .gte('date', fromDate)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as IncomeEvent[];
  },

  /** Returns distinct years that have income entries, newest first. */
  async listYears(userId: string): Promise<number[]> {
    if (IS_MOCK) {
      const all = await mockIncomeApi.list(userId);
      const years = [...new Set(all.map(e => new Date(e.date).getFullYear()))];
      return years.sort((a, b) => b - a);
    }
    const { data, error } = await sb()
      .from('income_events')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) throw error;
    const years = [...new Set((data ?? []).map(r => new Date(r.date).getFullYear()))];
    return years.sort((a, b) => b - a);
  },

  /** Fetches all income entries for a specific calendar year. */
  async listByYear(userId: string, year: number): Promise<IncomeEvent[]> {
    if (IS_MOCK) {
      const all = await mockIncomeApi.list(userId);
      return all.filter(e => new Date(e.date).getFullYear() === year);
    }
    const { data, error } = await sb()
      .from('income_events')
      .select('*')
      .eq('user_id', userId)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data ?? []) as IncomeEvent[];
  },

  async create(userId: string, form: IncomeFormData): Promise<IncomeEvent> {
    if (IS_MOCK) return mockIncomeApi.create(userId, form);
    const { data, error } = await sb()
      .from('income_events').insert({ user_id: userId, ...form }).select().single();
    if (error) throw error;
    return data as IncomeEvent;
  },

  async update(id: string, form: IncomeFormData): Promise<IncomeEvent> {
    if (IS_MOCK) return mockIncomeApi.update(id, form);
    const { data, error } = await sb()
      .from('income_events').update(form).eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Update returned no rows — check RLS policies');
    return data[0] as IncomeEvent;
  },

  async delete(id: string): Promise<void> {
    if (IS_MOCK) return mockIncomeApi.delete(id);
    const { error } = await sb().from('income_events').delete().eq('id', id);
    if (error) throw error;
  },

  async count(userId: string): Promise<number> {
    if (IS_MOCK) return (await mockIncomeApi.list(userId)).length;
    const { count, error } = await sb()
      .from('income_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throw error;
    return count ?? 0;
  },

  async batchInsert(
    rows: Array<{ user_id: string; date: string; source: string; amount: number; notes: string }>,
  ): Promise<number> {
    if (IS_MOCK) return mockIncomeApi.batchInsert(rows);
    const { data, error } = await sb()
      .from('income_events')
      .insert(rows)
      .select('id');
    if (error) throw error;
    return (data ?? []).length;
  },
};

// ─── Expenses API ─────────────────────────────────────────────────────────────

export const expensesApi = {
  async list(userId: string): Promise<RecurringExpense[]> {
    if (IS_MOCK) return mockExpensesApi.list(userId);
    const { data, error } = await sb()
      .from('recurring_expenses').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as RecurringExpense[];
  },

  async create(userId: string, form: ExpenseFormData): Promise<RecurringExpense> {
    if (IS_MOCK) return mockExpensesApi.create(userId, form);
    const { data, error } = await sb()
      .from('recurring_expenses')
      .insert({ user_id: userId, ...form, is_active: true }).select().single();
    if (error) throw error;
    return data as RecurringExpense;
  },

  async update(id: string, updates: Partial<RecurringExpense>): Promise<RecurringExpense> {
    if (IS_MOCK) return mockExpensesApi.update(id, updates);
    const { data, error } = await sb()
      .from('recurring_expenses').update(updates).eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Update returned no rows — check RLS policies');
    return data[0] as RecurringExpense;
  },

  async delete(id: string): Promise<void> {
    if (IS_MOCK) return mockExpensesApi.delete(id);
    const { error } = await sb().from('recurring_expenses').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── Upcoming Expenses API ────────────────────────────────────────────────────

export const upcomingApi = {
  async list(userId: string): Promise<UpcomingExpense[]> {
    if (IS_MOCK) return mockUpcomingApi.list(userId);
    const { data, error } = await sb()
      .from('upcoming_expenses').select('*').eq('user_id', userId)
      .order('due_date', { ascending: true });
    if (error) throw error;
    return (data ?? []) as UpcomingExpense[];
  },

  async markPaid(id: string): Promise<void> {
    if (IS_MOCK) return mockUpcomingApi.markPaid(id);
    const { error } = await sb()
      .from('upcoming_expenses').update({ is_paid: true }).eq('id', id);
    if (error) throw error;
  },

  async update(id: string, data: { name: string; amount: number; due_date: string }): Promise<void> {
    if (IS_MOCK) return mockUpcomingApi.update(id, data);
    const { error } = await sb()
      .from('upcoming_expenses').update(data).eq('id', id);
    if (error) throw error;
  },

  async create(userId: string, data: { name: string; amount: number; due_date: string }): Promise<void> {
    if (IS_MOCK) return mockUpcomingApi.create(userId, data);
    const { error } = await sb()
      .from('upcoming_expenses').insert({ user_id: userId, ...data, is_paid: false });
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    if (IS_MOCK) return mockUpcomingApi.delete(id);
    const { error } = await sb()
      .from('upcoming_expenses').delete().eq('id', id);
    if (error) throw error;
  },
};

// ─── Subscription API ─────────────────────────────────────────────────────────

export const subscriptionApi = {
  async get(userId: string): Promise<UserSubscription | null> {
    if (IS_MOCK) return mockSubscriptionApi.get(userId);
    const { data, error } = await sb()
      .from('user_subscriptions').select('*').eq('user_id', userId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return (data as UserSubscription) ?? null;
  },

  async upsertFree(userId: string): Promise<void> {
    if (IS_MOCK) return;
    const { error } = await sb().from('user_subscriptions').upsert(
      { user_id: userId, subscription_plan: 'free' },
      { onConflict: 'user_id' }
    );
    if (error) throw error;
  },
};
