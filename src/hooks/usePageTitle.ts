import { useEffect } from 'react';

const BASE = 'Spendable';

/**
 * Sets document.title to "<page> — Spendable" while the component is mounted,
 * then restores the base title on unmount.
 */
export function usePageTitle(page: string): void {
  useEffect(() => {
    document.title = `${page} — ${BASE}`;
    return () => {
      document.title = BASE;
    };
  }, [page]);
}
