import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { IS_MOCK, supabase, auth, subscriptionApi } from '../lib/supabase';

// ─── Mock user (mirrors Supabase User shape) ──────────────────────────────────

const MOCK_USER = {
  id: 'mock-user-offline-001',
  email: 'offline@spendable.finance',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isMockMode: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_MOCK) {
      // Persist login across hot-reloads within the same browser session
      const wasLoggedIn = sessionStorage.getItem('spendable_mock_logged_in');
      if (wasLoggedIn) setUser(MOCK_USER);
      setLoading(false);
      return;
    }

    // Real Supabase — set initial session then subscribe to changes
    supabase!.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase!.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      // When a user confirms their email and signs in for the first time,
      // Supabase fires SIGNED_IN. We ensure a free-plan row exists so limit
      // checks and webhook upserts always have a row to work with.
      if (event === 'SIGNED_IN' && session?.user) {
        subscriptionApi.upsertFree(session.user.id).catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await auth.signIn(email, password);
    if (error) throw error;
    if (IS_MOCK) {
      sessionStorage.setItem('spendable_mock_logged_in', 'true');
      setUser({ ...MOCK_USER, email });
    }
  };

  const signUp = async (email: string, password: string) => {
    const { error, data } = await auth.signUp(email, password) as { error: Error | null; data: { user?: { id: string } | null } };
    if (error) throw error;
    if (IS_MOCK) {
      sessionStorage.setItem('spendable_mock_logged_in', 'true');
      setUser({ ...MOCK_USER, email });
    } else if (data?.user?.id) {
      // Create the free-plan subscription row immediately so all limit
      // checks and webhook upserts have a row to work with from day one.
      await subscriptionApi.upsertFree(data.user.id).catch(() => {});
    }
  };

  const signOut = async () => {
    await auth.signOut();
    if (IS_MOCK) sessionStorage.removeItem('spendable_mock_logged_in');
    // Clear the financials cache so the next user (or re-login) never sees stale data
    try { localStorage.removeItem('spendable_financials_cache'); } catch { /* ignore */ }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isMockMode: IS_MOCK, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
