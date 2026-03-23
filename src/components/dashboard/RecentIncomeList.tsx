import { Box, Text, VStack, HStack, Icon } from '@chakra-ui/react';
import { RiArrowRightLine, RiMoneyDollarCircleLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/calculations';
import type { IncomeEvent } from '../../types';

const colors = {
  surface: '#FFFFFF', border: '#E8E8E3', surface2: '#F0EFE9',
  text: '#1C2B3A', muted: '#5a6a7a', subtle: '#8a9aaa',
  brand: '#4C5FD5', positive: '#27AE60',
};

export function RecentIncomeList({ income, currency = 'USD', limit = 5 }:
  { income: IncomeEvent[]; currency?: string; limit?: number }) {
  const recent = income.slice(0, limit);

  return (
    <Box bg={colors.surface} border="1px solid" borderColor={colors.border} borderRadius="12px" overflow="hidden">
      <HStack px={5} py={4} justify="space-between" borderBottom="1px solid" borderColor={colors.border}>
        <Box>
          <Text fontWeight="600" fontSize="13px" color={colors.text}>Recent Income</Text>
          <Text fontSize="12px" color={colors.muted} mt={0.5}>{income.length} total events</Text>
        </Box>
        <Link to="/income">
          <HStack spacing={1} color={colors.brand} fontSize="12px" fontWeight="600"
            _hover={{ opacity: 0.75 }} transition="opacity 0.1s">
            <Text>View all</Text>
            <Icon as={RiArrowRightLine} boxSize="12px" />
          </HStack>
        </Link>
      </HStack>

      {recent.length === 0 ? (
        <Box px={5} py={10} textAlign="center">
          <Text color={colors.subtle} fontSize="13px" fontWeight="500">No income recorded yet</Text>
          <Text color={colors.subtle} fontSize="12px" mt={1}>Add your first income event to get started</Text>
        </Box>
      ) : (
        <VStack spacing={0} align="stretch">
          {recent.map((event, i) => (
            <HStack
              key={event.id} px={5} py={3.5} justify="space-between"
              _hover={{ bg: colors.surface2 }} transition="background 0.1s"
              borderBottom={i < recent.length - 1 ? '1px solid' : 'none'}
              borderColor={colors.border}
            >
              <HStack spacing={3}>
                <Box w={8} h={8} borderRadius="8px" bg="#eef0fb"
                  display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                  <Icon as={RiMoneyDollarCircleLine} color={colors.brand} boxSize="15px" />
                </Box>
                <Box>
                  <Text fontSize="13px" fontWeight="500" color={colors.text}>{event.source}</Text>
                  <Text fontSize="11px" color={colors.subtle}>
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </Box>
              </HStack>
              <Text fontSize="13px" fontWeight="700" color={colors.positive}>
                +{formatCurrency(event.amount, currency)}
              </Text>
            </HStack>
          ))}
        </VStack>
      )}
    </Box>
  );
}
