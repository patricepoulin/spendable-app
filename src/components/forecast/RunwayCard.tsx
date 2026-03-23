import { Box, HStack, Text, Progress, SimpleGrid,
} from '@chakra-ui/react';
import type { ForecastMonth } from '../../types/forecast';
import { calculateRunwayFromForecast, TIER_CONFIG } from '../../utils/forecast';

interface Props {
  forecast: ForecastMonth[];
  currency: string;
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function RunwayCard({ forecast, currency }: Props) {
  const surface = '#ffffff';
  const border  = '#E8E8E3';
  const muted   = '#5a6a7a';
  const subtle  = '#8a9aaa';

  const runway    = calculateRunwayFromForecast(forecast);
  const isForever = runway === Infinity;
  const months    = isForever ? forecast.length : runway;
  const pct       = isForever ? 100 : Math.round((months / forecast.length) * 100);

  // Tier of the worst month in the window
  const tierOrder = ['healthy', 'low', 'critical', 'negative'] as const;
  const worstTier = forecast.reduce((worst, m) => {
    return tierOrder.indexOf(m.tier) > tierOrder.indexOf(worst) ? m.tier : worst;
  }, 'healthy' as (typeof tierOrder)[number]);
  const tc = TIER_CONFIG[worstTier];

  const runwayLabel = isForever
    ? `${forecast.length}+ months`
    : months === 0
    ? 'Under 1 month'
    : `~${months} month${months !== 1 ? 's' : ''}`;

  const runwayDesc = isForever
    ? 'Balance stays positive across the entire forecast window.'
    : months <= 1
    ? 'Your balance is projected to go negative very soon.'
    : `Your balance is projected to go negative around ${forecast[months - 1]?.label ?? ''}.`;

  // Summary stats
  const totalIncome   = forecast.reduce((s, m) => s + m.income,   0);
  const totalExpenses = forecast.reduce((s, m) => s + m.expenses, 0);
  const totalTax      = forecast.reduce((s, m) => s + m.taxReserve, 0);
  const endBalance    = forecast[forecast.length - 1]?.projectedBalance ?? 0;

  return (
    <Box bg={surface} border="1px solid" borderColor={border} borderRadius="14px" p={5}>
      <Text fontSize="13px" fontWeight="700" color="#1C2B3A" mb={1}>Runway Forecast</Text>
      <Text fontSize="12px" color={subtle} mb={5}>Based on your 6-month income average and current expenses</Text>

      {/* Main runway number */}
      <HStack
        p={4} borderRadius="12px"
        bg={tc.bg} border="1px solid" borderColor={tc.border}
        mb={4} spacing={4}
      >
        <Box flex={1}>
          <Text fontSize="11px" fontWeight="700" color={tc.color}
            textTransform="uppercase" letterSpacing="0.7px" mb={1}>
            Estimated runway
          </Text>
          <Text fontSize="28px" fontWeight="800" letterSpacing="-1.5px" color={tc.color} lineHeight="1">
            {runwayLabel}
          </Text>
          <Text fontSize="12px" color={muted} mt={1.5} lineHeight="1.4">
            {runwayDesc}
          </Text>
        </Box>
      </HStack>

      {/* Progress bar */}
      <Box mb={5}>
        <HStack justify="space-between" mb={1.5}>
          <Text fontSize="11px" color={subtle} fontWeight="500">Forecast window health</Text>
          <Text fontSize="11px" color={tc.color} fontWeight="700">{pct}%</Text>
        </HStack>
        <Progress
          value={pct} size="sm" borderRadius="full"
          bg={border}
          sx={{ '& > div': { background: tc.color } }}
        />
      </Box>

      {/* 6-month summary stats */}
      <SimpleGrid columns={2} spacing={3}>
        {[
          { label: '6-mo projected income', value: fmt(totalIncome,   currency), color: '#27AE60' },
          { label: '6-mo projected expenses', value: fmt(totalExpenses, currency), color: '#EB5757' },
          { label: '6-mo tax reserves',     value: fmt(totalTax,     currency), color: '#D4A800' },
          { label: 'Projected end balance', value: fmt(endBalance,    currency), color: endBalance >= 0 ? '#27AE60' : '#991B1B' },
        ].map(s => (
          <Box key={s.label} p={3} borderRadius="10px" bg={tc.bg} border="1px solid" borderColor={border}>
            <Text fontSize="10px" color={subtle} fontWeight="600" textTransform="uppercase"
              letterSpacing="0.5px" mb={1}>
              {s.label}
            </Text>
            <Text fontSize="15px" fontWeight="700" color={s.color} letterSpacing="-0.3px">
              {s.value}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
