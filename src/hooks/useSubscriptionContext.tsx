/**
 * SubscriptionContext
 *
 * Fetches the user_subscriptions row exactly once per session and makes it
 * available to every component via context. This replaces the per-component
 * Supabase fetch that previously fired independently in AppShell, ForecastPage,
 * IncomePage, ExpensesPage, UpcomingPage, and SettingsPage.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { subscriptionApi } from '../lib/supabase';
import type { UserSubscription } from '../types';

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  loading:      boolean;
  refresh:      () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading]           = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const sub = await subscriptionApi.get(user.id);
      setSubscription(sub);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
    } else {
      refresh();
    }
  }, [user, refresh]);

  return (
    <SubscriptionContext.Provider value={{ subscription, loading, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscriptionContext must be used within <SubscriptionProvider>');
  return ctx;
}
