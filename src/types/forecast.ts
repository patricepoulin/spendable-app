export type BalanceTier = 'healthy' | 'low' | 'critical' | 'negative';

export interface ForecastMonth {
  month: string;        // "2025-04"
  label: string;        // "Apr 2025"
  projectedBalance: number;
  income: number;
  expenses: number;
  taxReserve: number;
  netChange: number;
  tier: BalanceTier;
}
