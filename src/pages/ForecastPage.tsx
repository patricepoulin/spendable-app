import { Box, SimpleGrid, Text, Alert, AlertIcon, Skeleton, VStack, HStack, Button, Icon, useDisclosure,
} from '@chakra-ui/react';
import { RiLineChartLine, RiArrowRightLine, RiMoneyDollarCircleLine } from 'react-icons/ri';
import { Link as RouterLink } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { usePrices } from '../hooks/usePrices';
import { UpgradeModal } from '../components/subscription/UpgradeModal';
import { PageHeader } from '../components/ui/PageHeader';
import { ForecastChart } from '../components/forecast/ForecastChart';
import { ForecastTable } from '../components/forecast/ForecastTable';
import { RunwayCard } from '../components/forecast/RunwayCard';
import { useFinancials } from '../hooks/useFinancials';
import { usePageTitle } from '../hooks/usePageTitle';
import { calculateForecast } from '../utils/forecast';
import { PAGE_BG } from '../theme';

export function ForecastPage() {
  usePageTitle('Forecast');
  const { metrics, income, expenses, settings, loading, error } = useFinancials();
  const currency = settings?.currency ?? 'USD';
  const { isPro, loading: subLoading } = useSubscription();
  const { label: priceLabel } = usePrices();
  const { isOpen: isUpgradeOpen, onOpen: onUpgradeOpen, onClose: onUpgradeClose } = useDisclosure();

  const forecast = metrics && settings
    ? calculateForecast({
        currentBalance: metrics.safeToSpend,
        income,
        expenses,
        settings,
        months: 6,
      })
    : [];

  if (error) {
    return (
      <Box p={8}>
        <Alert status="error" borderRadius="10px"><AlertIcon />{error}</Alert>
      </Box>
    );
  }

  // Show blank page-bg while subscription status is still loading to prevent
  // the free-plan gate flashing briefly for Pro users on hard refresh
  if (subLoading) {
    return <Box minH="100vh" bg={PAGE_BG} />;
  }

  if (!isPro) {
    return (
      <Box>
        <Box position="relative" overflow="hidden" bg={PAGE_BG} minH="100vh">
          <Box position="absolute" top="-120px" right="-120px" w="520px" h="520px" borderRadius="full"
            bg="radial-gradient(circle, rgba(76,95,213,0.07) 0%, transparent 70%)" pointerEvents="none" />
          <Box position="relative" display="flex" alignItems="center" justifyContent="center" minH="70vh">
            <Box maxW="420px" w="full" mx="auto" px={6} textAlign="center">
              <Box w={16} h={16} borderRadius="16px" bg="#eef0fb" border="1px solid #c7d0f5"
                display="flex" alignItems="center" justifyContent="center" mx="auto" mb={6}>
                <Icon as={RiLineChartLine} color="#4C5FD5" boxSize={7} />
              </Box>
              <Text fontSize="24px" fontWeight="800"
                letterSpacing="-0.8px" color="#1C2B3A" mb={3}>
                6-Month Forecast
              </Text>
              <Text fontSize="15px" color="#5a6a7a" lineHeight="1.65" mb={6}>
                Project your income, expenses, and safe-to-spend forward six months.
                See exactly where you're headed — before you get there.
              </Text>
              <Button
                rightIcon={<Icon as={RiArrowRightLine} />}
                bg="#4C5FD5" color="white" borderRadius="10px"
                fontWeight="600" h="44px" px={6}
                _hover={{ bg: '#3D4FBF' }}
                onClick={onUpgradeOpen}
              >
                Unlock with Pro
              </Button>
              <Text fontSize="12px" color="#8a9aaa" mt={4}>From {priceLabel('usd')} · Cancel anytime</Text>
            </Box>
          </Box>
          <UpgradeModal isOpen={isUpgradeOpen} onClose={onUpgradeClose} reason="forecast" userCurrency={currency} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box position="relative" overflow="hidden" bg={PAGE_BG} minH="100vh">
        {/* Top-right indigo blob */}
        <Box
          position="absolute" top="-120px" right="-120px"
          w="520px" h="520px" borderRadius="full"
          bg="radial-gradient(circle, rgba(76,95,213,0.10) 0%, transparent 70%)"
          pointerEvents="none"
        />
        {/* Bottom-left green blob */}
        <Box
          position="absolute" bottom="-80px" left="-80px"
          w="420px" h="420px" borderRadius="full"
          bg="radial-gradient(circle, rgba(39,174,96,0.05) 0%, transparent 70%)"
          pointerEvents="none"
        />

        <Box position="relative">
          <PageHeader
            title="Forecast"
            subtitle="What will your money look like if nothing changes?"
          />

          <Box px={{ base: 4, md: 8 }} py={6}>
            {loading ? (
              <VStack spacing={4} align="stretch">
                <Skeleton h="280px" borderRadius="14px" />
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                  <Skeleton h="200px" borderRadius="14px" />
                  <Skeleton h="200px" borderRadius="14px" />
                </SimpleGrid>
              </VStack>
            ) : forecast.length === 0 ? (
              /* Empty state */
              <Box
                bg="white" border="1px solid #E8E8E3" borderRadius="14px"
                p={12} textAlign="center"
              >
                <Text fontSize="32px" mb={3}>📊</Text>
                <Text fontSize="15px" fontWeight="600" color="#1C2B3A" mb={2}>
                  Not enough data yet
                </Text>
                <Text fontSize="13px" color="#5a6a7a" maxW="360px" mx="auto" mb={5}>
                  Add at least one income entry and your recurring expenses to generate a forecast.
                </Text>
                <Button
                  as={RouterLink}
                  to="/income"
                  leftIcon={<Icon as={RiMoneyDollarCircleLine} />}
                  size="sm" borderRadius="8px"
                  bg="#4C5FD5" color="white"
                  fontWeight="600" fontSize="13px"
                  _hover={{ bg: '#3D4FBF' }}
                >
                  Add income
                </Button>
              </Box>
            ) : (
              <VStack spacing={4} align="stretch">

                {/* Assumptions banner */}
                <Box
                  bg="rgba(76,95,213,0.06)" border="1px solid rgba(76,95,213,0.15)"
                  borderRadius="10px" px={4} py={3}
                >
                  <HStack spacing={2} flexWrap="wrap">
                    <Text fontSize="11px" fontWeight="700" color="#4C5FD5"
                      textTransform="uppercase" letterSpacing="0.5px">
                      Assumptions
                    </Text>
                    <Text fontSize="12px" color="#5a6a7a">
                      Using your 6-month average income of{' '}
                      <Box as="span" fontWeight="700" color="#1C2B3A">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 })
                          .format(forecast[0]?.income ?? 0)}/mo
                      </Box>
                      , recurring expenses of{' '}
                      <Box as="span" fontWeight="700" color="#1C2B3A">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 })
                          .format(forecast[0]?.expenses ?? 0)}/mo
                      </Box>
                      , and a{' '}
                      <Box as="span" fontWeight="700" color="#1C2B3A">
                        {((settings?.tax_rate ?? 0) * 100).toFixed(0)}% tax reserve
                      </Box>
                      .
                    </Text>
                  </HStack>
                </Box>

                {/* Chart */}
                <ForecastChart forecast={forecast} currency={currency} />

                {/* Table + Runway side by side on large screens */}
                <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
                  <ForecastTable forecast={forecast} currency={currency} />
                  <RunwayCard    forecast={forecast} currency={currency} />
                </SimpleGrid>

              </VStack>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}


