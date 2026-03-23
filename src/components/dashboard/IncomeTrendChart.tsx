import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Box, Text, HStack } from '@chakra-ui/react';
import { groupIncomeByMonth, formatCurrency, calcSmoothedMonthlyIncome } from '../../utils/calculations';
import type { IncomeEvent } from '../../types';

const colors = {
  surface: '#FFFFFF', border: '#E8E8E3', surface2: '#F0EFE9',
  brand: '#4C5FD5', positive: '#27AE60', muted: '#5a6a7a', subtle: '#8a9aaa',
};

export function IncomeTrendChart({ income, currency = 'USD' }: { income: IncomeEvent[]; currency?: string }) {
  const smoothed = calcSmoothedMonthlyIncome(income);

  const data = groupIncomeByMonth(income).map(m => ({
    month: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    income: m.total,
  }));

  if (data.length === 0) {
    return (
      <Box bg={colors.surface} border="1px solid" borderColor={colors.border} borderRadius="12px"
        p={6} textAlign="center" minH="220px" display="flex" alignItems="center" justifyContent="center">
        <Box>
          <Text color={colors.muted} fontSize="13px" fontWeight="500">No income history yet</Text>
          <Text color={colors.subtle} fontSize="12px" mt={1}>Add your first income event to see the trend</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box bg={colors.surface} border="1px solid" borderColor={colors.border} borderRadius="12px" p={5}>
      <HStack justify="space-between" mb={5}>
        <Box>
          <Text fontWeight="600" fontSize="13px" color="#1C2B3A">Income Trend</Text>
          <Text fontSize="12px" color={colors.muted} mt={0.5}>Monthly income over time</Text>
        </Box>
        {smoothed > 0 && (
          <Box textAlign="right">
            <Text fontSize="10px" color={colors.muted} textTransform="uppercase" letterSpacing="0.5px" fontWeight="600">6mo avg</Text>
            <Text fontSize="14px" fontWeight="700" color={colors.positive}>{formatCurrency(smoothed, currency)}</Text>
          </Box>
        )}
      </HStack>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={colors.brand} stopOpacity={0.12} />
              <stop offset="95%" stopColor={colors.brand} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.surface2} vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: colors.subtle }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: colors.subtle }} axisLine={false} tickLine={false}
            tickFormatter={v => {
              const symbol = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 })
                .formatToParts(0).find(p => p.type === 'currency')?.value ?? '$';
              return `${symbol}${(v / 1000).toFixed(0)}k`;
            }}
            width={42} />
          {smoothed > 0 && (
            <ReferenceLine y={smoothed} stroke={colors.positive} strokeDasharray="4 4" strokeOpacity={0.6} />
          )}
          <Tooltip
            formatter={(value: number) => [formatCurrency(value, currency), 'Income']}
            contentStyle={{
              background: colors.surface, border: `1px solid ${colors.border}`,
              borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            cursor={{ stroke: colors.brand, strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Area type="monotone" dataKey="income" stroke={colors.brand} strokeWidth={2}
            fill="url(#incomeGrad)" dot={false}
            activeDot={{ r: 4, fill: colors.brand, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
