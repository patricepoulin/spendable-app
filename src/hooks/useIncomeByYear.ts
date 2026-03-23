import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { incomeApi } from '../lib/supabase';
import type { IncomeEvent } from '../types';

interface YearState {
  year:    number;
  entries: IncomeEvent[];
  loading: boolean;
  loaded:  boolean;
}

interface UseIncomeByYearReturn {
  /** All loaded income entries across all expanded years — for metrics/calculations */
  allLoadedIncome: IncomeEvent[];
  years:           YearState[];
  availableYears:  number[];
  loadYear:        (year: number) => Promise<void>;
  refresh:         () => Promise<void>;
  initialLoading:  boolean;
}

export function useIncomeByYear(): UseIncomeByYearReturn {
  const { user } = useAuth();

  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [yearStates, setYearStates]         = useState<Map<number, YearState>>(new Map());
  const [initialLoading, setInitialLoading] = useState(true);

  // ── Load a single year's entries ──────────────────────────────────────────

  const loadYear = useCallback(async (year: number) => {
    if (!user) return;

    // Mark as loading
    setYearStates(prev => {
      const next = new Map(prev);
      next.set(year, { year, entries: prev.get(year)?.entries ?? [], loading: true, loaded: false });
      return next;
    });

    try {
      const entries = await incomeApi.listByYear(user.id, year);
      setYearStates(prev => {
        const next = new Map(prev);
        next.set(year, { year, entries, loading: false, loaded: true });
        return next;
      });
    } catch {
      setYearStates(prev => {
        const next = new Map(prev);
        next.set(year, { year, entries: [], loading: false, loaded: false });
        return next;
      });
    }
  }, [user]);

  // ── Initial bootstrap: load available years + current year ────────────────

  const bootstrap = useCallback(async () => {
    if (!user) return;
    setInitialLoading(true);
    try {
      const years = await incomeApi.listYears(user.id);
      setAvailableYears(years);

      // Auto-load current year (or most recent year if user has no current-year data)
      const currentYear = new Date().getFullYear();
      const yearToLoad  = years.includes(currentYear) ? currentYear : years[0];
      if (yearToLoad) await loadYear(yearToLoad);
    } finally {
      setInitialLoading(false);
    }
  }, [user, loadYear]);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  // ── Refresh: re-fetch all currently loaded years ──────────────────────────

  const refresh = useCallback(async () => {
    if (!user) return;
    // Re-fetch available years in case new ones appeared
    const years = await incomeApi.listYears(user.id);
    setAvailableYears(years);

    // Re-load every year that was already expanded
    const loadedYears = [...yearStates.entries()]
      .filter(([, s]) => s.loaded)
      .map(([y]) => y);

    if (loadedYears.length > 0) {
      await Promise.all(loadedYears.map(loadYear));
    } else if (years.length > 0) {
      // Nothing was expanded yet (e.g. first income entry just added from empty state).
      // Auto-expand the current year, falling back to the most recent available year.
      const currentYear = new Date().getFullYear();
      const yearToLoad  = years.includes(currentYear) ? currentYear : years[0];
      await loadYear(yearToLoad);
    }
  }, [user, yearStates, loadYear]);

  // ── Derive flat list of all loaded entries ────────────────────────────────

  const allLoadedIncome = [...yearStates.values()]
    .filter(s => s.loaded)
    .flatMap(s => s.entries)
    .sort((a, b) => b.date.localeCompare(a.date));

  const years = availableYears.map(year => yearStates.get(year) ?? {
    year, entries: [], loading: false, loaded: false,
  });

  return { allLoadedIncome, years, availableYears, loadYear, refresh, initialLoading };
}
