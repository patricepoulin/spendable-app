import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { Box, Text,
} from '@chakra-ui/react';
import type { ForecastMonth } from '../../types/forecast';
import { TIER_CONFIG } from '../../utils/forecast';

interface Props {
  forecast: ForecastMonth[];
  currency: string;
  months: number;
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    maximumFractionDigits: 0,
  }).format(n);
}

// Custom dot — colour-coded by tier
function TieredDot(props: {
  cx?: number; cy?: number; payload?: ForecastMonth;
}) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;
  const color = TIER_CONFIG[payload.tier].color;
  return (
    <circle
      cx={cx} cy={cy} r={5}
      fill={color} stroke="white" strokeWidth={2}
    />
  );
}

// Custom tooltip
function CustomTooltip({ active, payload, currency }: {
  active?: boolean;
  payload?: { payload: ForecastMonth }[];
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const tc = TIER_CONFIG[d.tier];

  return (
    <Box
      bg="white" border="1px solid #E8E8E3"
      borderRadius="10px" p={3}
      boxShadow="0 4px 16px rgba(28,43,58,0.10)"
      minW="180px"
    >
      <Text fontSize="11px" fontWeight="700" color="#5a6a7a" mb={2} textTransform="uppercase" letterSpacing="0.5px">
        {d.label}
      </Text>
      <Text fontSize="18px" fontWeight="800" letterSpacing="-0.5px" color={tc.color} mb={2}>
        {fmt(d.projectedBalance, currency)}
      </Text>
      <Box fontSize="11px" color="#8a9aaa">
        <Box display="flex" justifyContent="space-between" mb={0.5}>
          <Text>+ Income</Text><Text fontWeight="600" color="#27AE60">{fmt(d.income, currency)}</Text>
        </Box>
        <Box display="flex" justifyContent="space-between" mb={0.5}>
          <Text>− Expenses</Text><Text fontWeight="600" color="#EB5757">{fmt(d.expenses, currency)}</Text>
        </Box>
        <Box display="flex" justifyContent="space-between">
          <Text>− Tax reserve</Text><Text fontWeight="600" color="#D4A800">{fmt(d.taxReserve, currency)}</Text>
        </Box>
      </Box>
    </Box>
  );
}

export function ForecastChart({ forecast, currency, months }: Props) {
  const border  = '#E8E8E3';
  const surface = '#ffffff';
  const muted   = '#8a9aaa';

  const hasNegative = forecast.some(m => m.projectedBalance < 0);

  return (
    <Box bg={surface} border="1px solid" borderColor={border} borderRadius="14px" p={5}>
      <Text fontSize="13px" fontWeight="700" color="#1C2B3A" mb={1}>Balance Projection</Text>
      <Text fontSize="12px" color={muted} mb={5}>Projected balance over the next {months} months</Text>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={forecast} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4C5FD5" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#4C5FD5" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={border} vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: muted }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: muted }}
            axisLine={false} tickLine={false}
            tickFormatter={v => fmt(v, currency)}
            width={72}
          />

          <Tooltip content={<CustomTooltip currency={currency} />} />

          {/* Zero line — only shown if balance goes negative */}
          {hasNegative && (
            <ReferenceLine y={0} stroke="#EB5757" strokeDasharray="4 3" strokeWidth={1.5} />
          )}

          <Area
            type="monotone"
            dataKey="projectedBalance"
            stroke="#4C5FD5"
            strokeWidth={2.5}
            fill="url(#forecastGrad)"
            dot={<TieredDot />}
            activeDot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
