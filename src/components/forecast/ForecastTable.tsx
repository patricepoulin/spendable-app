import {
  Box, Table, Thead, Tbody, Tr, Th, Td,
  Text, Badge, HStack,
} from '@chakra-ui/react';
import type { ForecastMonth } from '../../types/forecast';
import { TIER_CONFIG } from '../../utils/forecast';

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

export function ForecastTable({ forecast, currency }: Props) {
  const surface = '#ffffff';
  const border  = '#E8E8E3';
  const theadBg = '#f8fafc';
  const muted   = '#8a9aaa';

  return (
    <Box bg={surface} border="1px solid" borderColor={border} borderRadius="14px" overflow="hidden">
      <Box px={5} pt={5} pb={3}>
        <Text fontSize="13px" fontWeight="700" color="#1C2B3A" mb={1}>Monthly Breakdown</Text>
        <Text fontSize="12px" color={muted}>Projected income, expenses and balance per month</Text>
      </Box>

      <Box overflowX="auto">
      <Table variant="simple" size="sm">
        <Thead bg={theadBg}>
          <Tr>
            {['Month', 'Avg Income', 'Expenses', 'Tax Reserve', 'Net', 'Balance', 'Status'].map(h => (
              <Th key={h} py={3} fontSize="10px" fontWeight="700" color={muted}
                textTransform="uppercase" letterSpacing="0.8px" borderColor={border}>
                {h}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {forecast.map(m => {
            const tc = TIER_CONFIG[m.tier];
            const isNeg = m.projectedBalance < 0;
            return (
              <Tr key={m.month} _hover={{ bg: theadBg }} transition="background 0.1s">
                <Td py={3} borderColor={border}>
                  <Text fontSize="13px" fontWeight="600" color="#1C2B3A">{m.label}</Text>
                </Td>
                <Td py={3} borderColor={border}>
                  <Text fontSize="12px" color="#27AE60" fontWeight="500">{fmt(m.income, currency)}</Text>
                </Td>
                <Td py={3} borderColor={border}>
                  <Text fontSize="12px" color="#EB5757" fontWeight="500">{fmt(-m.expenses, currency)}</Text>
                </Td>
                <Td py={3} borderColor={border}>
                  <Text fontSize="12px" color="#D4A800" fontWeight="500">{fmt(-m.taxReserve, currency)}</Text>
                </Td>
                <Td py={3} borderColor={border}>
                  <Text
                    fontSize="12px" fontWeight="600"
                    color={m.netChange >= 0 ? '#27AE60' : '#EB5757'}
                  >
                    {m.netChange >= 0 ? '+' : ''}{fmt(m.netChange, currency)}
                  </Text>
                </Td>
                <Td py={3} borderColor={border}>
                  <Text
                    fontSize="13px" fontWeight="700"
                    color={isNeg ? '#991B1B' : '#1C2B3A'}
                    letterSpacing="-0.3px"
                  >
                    {fmt(m.projectedBalance, currency)}
                  </Text>
                </Td>
                <Td py={3} borderColor={border}>
                  <HStack spacing={1.5}>
                    <Badge
                      px={2} py={0.5} borderRadius="6px"
                      fontSize="10px" fontWeight="700"
                      bg={tc.bg} color={tc.color}
                      border="1px solid" borderColor={tc.border}
                      textTransform="capitalize"
                    >
                      {tc.label}
                    </Badge>
                    {(m.tier === 'low' || m.tier === 'critical') && (
                      <Text fontSize="13px">⚠</Text>
                    )}
                    {m.tier === 'negative' && (
                      <Text fontSize="13px">🚨</Text>
                    )}
                  </HStack>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
      </Box>
    </Box>
  );
}
