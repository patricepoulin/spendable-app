import { Box, Text, VStack, HStack } from '@chakra-ui/react';
import { formatCurrency } from '../../utils/calculations';
import type { FinancialMetrics } from '../../types';

const colors = {
  surface: '#FFFFFF', border: '#E8E8E3', surface2: '#F0EFE9',
  text: '#1C2B3A', muted: '#5a6a7a', subtle: '#8a9aaa',
  brand: '#4C5FD5', positive: '#27AE60',
};

export function BalanceBreakdown({ metrics, currency = 'USD' }: { metrics: FinancialMetrics; currency?: string }) {
  const total = metrics.currentBalance || 1;

  const items = [
    { label: 'Tax Reserve',    value: metrics.taxReserve,            color: '#F2C94C', note: 'Set aside for taxes'    },
    { label: 'Emergency Buffer', value: metrics.emergencyBuffer,     color: '#4C5FD5', note: 'Safety net reserve'     },
    { label: 'Upcoming Bills', value: metrics.upcomingExpensesTotal, color: '#EB5757', note: 'All unpaid upcoming'    },
    { label: 'Safe to Spend',  value: metrics.safeToSpend,           color: '#27AE60', note: '← Your number', highlight: true },
  ];

  return (
    <Box bg={colors.surface} border="1px solid" borderColor={colors.border} borderRadius="12px" p={5}>
      <Box mb={5}>
        <Text fontWeight="600" fontSize="13px" color={colors.text}>Balance Allocation</Text>
        <Text fontSize="12px" color={colors.muted} mt={0.5}>
          How your {formatCurrency(metrics.currentBalance, currency)} is divided
        </Text>
      </Box>

      {/* Stacked bar — YNAB style */}
      <HStack h="10px" borderRadius="full" overflow="hidden" mb={6} spacing={0} bg={colors.surface2}>
        {items.map(item => (
          <Box
            key={item.label}
            h="100%"
            w={`${Math.max(1, (item.value / total) * 100)}%`}
            bg={item.color}
            transition="width 0.6s ease"
          />
        ))}
      </HStack>

      <VStack spacing={3} align="stretch">
        {items.map(item => (
          <HStack
            key={item.label}
            justify="space-between"
            p={item.highlight ? 3 : 0}
            bg={item.highlight ? '#f0fdf4' : 'transparent'}
            borderRadius={item.highlight ? '8px' : '0'}
            border={item.highlight ? '1px solid #b7efd1' : 'none'}
          >
            <HStack spacing={2.5}>
              <Box w="10px" h="10px" borderRadius="3px" bg={item.color} flexShrink={0} mt="1px" />
              <Box>
                <HStack spacing={2}>
                  <Text fontSize="13px" fontWeight={item.highlight ? '600' : '500'} color={colors.text}>
                    {item.label}
                  </Text>
                  {item.highlight && (
                    <Box px={1.5} py={0.5} borderRadius="4px" bg="#dcfce7">
                      <Text fontSize="10px" color="#166534" fontWeight="700">YOUR NUMBER</Text>
                    </Box>
                  )}
                </HStack>
                <Text fontSize="11px" color={colors.subtle}>{item.note}</Text>
              </Box>
            </HStack>
            <Text fontSize="13px" fontWeight={item.highlight ? '700' : '600'}
              color={item.highlight ? colors.positive : colors.text}>
              {formatCurrency(item.value, currency)}
            </Text>
          </HStack>
        ))}
      </VStack>
    </Box>
  );
}
