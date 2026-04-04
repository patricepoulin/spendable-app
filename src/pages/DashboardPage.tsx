import {
  Box, SimpleGrid, HStack, VStack, Text,
  Alert, AlertIcon, Progress, Skeleton, SkeletonText, Icon, useToast, Tooltip, Button, IconButton,
} from '@chakra-ui/react';
import { RiInformationLine, RiSignalWifiErrorLine, RiCloseLine, RiArrowRightLine } from 'react-icons/ri';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  RiWallet3Line, RiTimeLine, RiLineChartLine,
  RiArrowUpLine, RiShieldCheckLine,
} from 'react-icons/ri';
import { PageHeader } from '../components/ui/PageHeader';
import { LastUpdatedIndicator } from '../components/ui/LastUpdatedIndicator';
import { IncomeTrendChart } from '../components/dashboard/IncomeTrendChart';
import { BalanceBreakdown } from '../components/dashboard/BalanceBreakdown';
import { RecentIncomeList } from '../components/dashboard/RecentIncomeList';
import { useFinancials } from '../hooks/useFinancials';
import { usePageTitle } from '../hooks/usePageTitle';
import { OnboardingEmptyState } from '../components/dashboard/OnboardingEmptyState';
import { PAGE_BG } from '../theme';
import {
  formatCurrency, formatRunway,
  getRunwayColor, getConfidenceLabel,
} from '../utils/calculations';

// ─── YNAB Color Map ───────────────────────────────────────────────────────────
const colors = {
  positive: '#27AE60',
  caution:  '#D4A800',
  negative: '#EB5757',
  brand:    '#4C5FD5',
  navy:     '#1C2B3A',
  pageBg:   '#F5F4EF',
  surface:  '#FFFFFF',
  border:   '#E8E8E3',
  surface2: '#F0EFE9',
  text:     '#1C2B3A',
  muted:    '#5a6a7a',
  subtle:   '#8a9aaa',
};

const RUNWAY_HEX: Record<string, string> = {
  green:  '#27AE60',
  yellow: '#D4A800',
  red:    '#EB5757',
  gray:   '#8a9aaa',
};

// ─── Hero ─────────────────────────────────────────────────────────────────────

function SafeToSpendHero({
  safeToSpend, currency, status, isLoading,
}: {
  safeToSpend: number;
  currency: string;
  status: { label: string; color: string; description: string; tier: string };
  isLoading: boolean;
}) {
  return (
    <Box
      bg="linear-gradient(135deg, #1C2B3A 0%, #253344 100%)"
      borderRadius="16px" p={8} mb={5}
      position="relative" overflow="hidden"
      boxShadow="0 20px 48px rgba(28,43,58,0.18), 0 4px 16px rgba(28,43,58,0.10)"
    >
      {/* Subtle grid texture — same as landing page mockup */}
      <Box
        position="absolute" inset={0} opacity={0.04} pointerEvents="none"
        backgroundImage="repeating-linear-gradient(0deg, transparent, transparent 20px, white 20px, white 21px), repeating-linear-gradient(90deg, transparent, transparent 20px, white 20px, white 21px)"
      />
      {/* Soft indigo glow top-right */}
      <Box
        position="absolute" top="-60px" right="-60px"
        w="240px" h="240px" borderRadius="full" pointerEvents="none"
        bg="radial-gradient(circle, rgba(76,95,213,0.18) 0%, transparent 70%)"
      />

      <Box position="relative">
        <Text fontSize="11px" fontWeight="700" color="#6b84f5"
          textTransform="uppercase" letterSpacing="1px" mb={2}>
          Safe to Spend Right Now
        </Text>

        {isLoading ? (
          <Skeleton h="72px" w="320px" borderRadius="10px" mb={4} startColor="#253344" endColor="#2e3f52" />
        ) : (
          <Text
            fontSize={{ base: '52px', md: '72px' }}
            fontWeight="800"
            letterSpacing="-4px"
            lineHeight="1"
            color="white"
            mb={4}

          >
            {formatCurrency(safeToSpend, currency)}
          </Text>
        )}

        <HStack spacing={3} flexWrap="wrap">
          {/* Status pill — green for healthy/strong, amber for caution, red for risk/critical */}
          <Box
            display="inline-flex" alignItems="center"
            px={3} py={1} borderRadius="full"
            bg={status.tier === 'good'
              ? 'rgba(39,174,96,0.2)'
              : status.tier === 'caution'
              ? 'rgba(212,168,0,0.2)'
              : 'rgba(235,87,87,0.2)'}
            border="1px solid"
            borderColor={status.tier === 'good'
              ? 'rgba(39,174,96,0.4)'
              : status.tier === 'caution'
              ? 'rgba(212,168,0,0.4)'
              : 'rgba(235,87,87,0.4)'}
          >
            <Text fontSize="12px" fontWeight="700"
              color={status.tier === 'good' ? '#4eca80' : status.tier === 'caution' ? '#f0c429' : '#f07070'}>
              ● {status.label}
            </Text>
          </Box>
          <Text fontSize="13px" color="#8FABBF">{status.description}</Text>
        </HStack>
      </Box>
    </Box>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, subtext, icon, accentHex, isLoading, progressValue, progressHex,
}: {
  label: string; value: string; subtext: string;
  icon: React.ElementType; accentHex: string;
  isLoading: boolean; progressValue?: number; progressHex?: string;
}) {
  return (
    <Box
      bg={colors.surface} border="1px solid" borderColor={colors.border}
      borderRadius="12px" p={5}
      _hover={{ borderColor: accentHex + '70', boxShadow: `0 0 0 1px ${accentHex}20` }}
      transition="border-color 0.15s, box-shadow 0.15s"
    >
      <HStack justify="space-between" mb={4}>
        <Text fontSize="10px" fontWeight="700" color={colors.muted}
          textTransform="uppercase" letterSpacing="0.8px">
          {label}
        </Text>
        <Box
          w={7} h={7} borderRadius="7px"
          bg={accentHex + '15'}
          display="flex" alignItems="center" justifyContent="center"
        >
          <Icon as={icon} color={accentHex} boxSize="14px" />
        </Box>
      </HStack>

      {isLoading ? (
        <>
          <Skeleton h="26px" w="120px" mb={1.5} borderRadius="6px" />
          <Skeleton h="13px" w="80px"  borderRadius="6px" />
        </>
      ) : (
        <>
          <Text fontSize="22px" fontWeight="700" letterSpacing="-0.8px" lineHeight="1.1" mb={1} color={colors.text}>
            {value}
          </Text>
          <Text fontSize="12px" color={colors.subtle}>{subtext}</Text>
          {progressValue !== undefined && progressHex && (
            <Box mt={3} bg={colors.surface2} borderRadius="full" h="5px" overflow="hidden">
              <Box
                h="5px" borderRadius="full" bg={progressHex}
                w={`${Math.min(100, progressValue)}%`}
                transition="width 0.6s ease"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

// ─── Confidence Score ─────────────────────────────────────────────────────────

function ConfidenceScoreCard({ score, isLoading }: { score: number; isLoading: boolean }) {
  const conf = getConfidenceLabel(score);

  const pillars = [
    { label: 'Tax Reserve',    pct: score >= 20 ? 100 : 0,                          tip: 'Are you setting aside enough for your tax bill? Based on your tax rate setting.' },
    { label: 'Buffer',         pct: score >= 40 ? 100 : score >= 30 ? 50 : 0,       tip: 'Do you have the emergency buffer months you configured? Protects against dry spells.' },
    { label: 'Runway',         pct: Math.min(100, (score / 40) * 100),              tip: 'How many months can you sustain your lifestyle at current income and expenses?' },
    { label: 'Income History', pct: score >= 80 ? 100 : score >= 60 ? 60 : 20,     tip: 'How consistent and well-documented is your income history? More entries = higher score.' },
  ];

  return (
    <Box
      bg={colors.surface} border="1px solid" borderColor={colors.border}
      borderRadius="12px" p={5}
    >
      <HStack justify="space-between" mb={4}>
        <HStack spacing={1.5}>
          <Text fontSize="10px" fontWeight="700" color={colors.muted}
            textTransform="uppercase" letterSpacing="0.8px">
            Financial Confidence
          </Text>
          <Tooltip
            label="A 0–100 score across four pillars: tax reserve coverage, emergency buffer, runway length, and income consistency. Higher = more financially resilient."
            fontSize="12px" borderRadius="8px" p={3} maxW="260px"
            bg="#1C2B3A" color="white" hasArrow
          >
            <Box cursor="help" display="flex" alignItems="center">
              <Icon as={RiInformationLine} color={colors.subtle} boxSize="13px" />
            </Box>
          </Tooltip>
        </HStack>
        <Icon as={RiShieldCheckLine} color={conf.color} boxSize="16px" />
      </HStack>

      {isLoading ? (
        <Skeleton h="36px" w="90px" mb={3} borderRadius="8px" />
      ) : (
        <HStack align="baseline" spacing={2} mb={3}>
          <Text fontSize="36px" fontWeight="800" letterSpacing="-1.5px" lineHeight="1" color={conf.color}>
            {score}
          </Text>
          <Text fontSize="15px" color={colors.subtle} fontWeight="500">/100</Text>
          <Box
            ml={1} px={2.5} py={0.5} borderRadius="full"
            bg={conf.color + '18'} border="1px solid" borderColor={conf.color + '40'}
          >
            <Text fontSize="11px" fontWeight="700" color={conf.color}>{conf.label}</Text>
          </Box>
        </HStack>
      )}

      {/* Master progress bar */}
      <Box mb={5} bg={colors.surface2} borderRadius="full" h="6px" overflow="hidden">
        <Box
          h="6px" borderRadius="full"
          style={{ background: `linear-gradient(90deg, #4C5FD5, ${conf.color})` }}
          w={isLoading ? '0%' : `${score}%`}
          transition="width 0.8s ease"
        />
      </Box>

      {/* Pillar bars */}
      <VStack spacing={2.5} align="stretch">
        {pillars.map(p => (
          <HStack key={p.label} spacing={3}>
            <Tooltip label={p.tip} fontSize="12px" borderRadius="8px" p={3} maxW="220px"
              bg="#1C2B3A" color="white" hasArrow placement="left">
              <Text fontSize="11px" color={colors.muted} w="95px" fontWeight="500" cursor="help"
                _hover={{ color: colors.brand }} transition="color 0.15s">{p.label}</Text>
            </Tooltip>
            <Box flex={1} bg={colors.surface2} borderRadius="full" h="5px" overflow="hidden">
              <Box
                h="5px" borderRadius="full"
                bg={isLoading ? colors.border : (p.pct >= 100 ? colors.positive : p.pct >= 50 ? colors.caution : colors.negative)}
                w={isLoading ? '0%' : `${p.pct}%`}
                transition="width 0.6s ease"
              />
            </Box>
          </HStack>
        ))}
      </VStack>
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  usePageTitle('Dashboard');
  const { metrics, income, expenses, upcoming, settings, loading, initialLoad, error, lastUpdated, liveFailedWithCache } = useFinancials();
  const currency = settings?.currency ?? 'USD';
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const upgradedToastShown = useRef(false);

  // First-run explainer — dismissed permanently in localStorage
  const EXPLAINER_KEY = 'spendable_explainer_dismissed';
  const [showExplainer, setShowExplainer] = useState(() => {
    try { return localStorage.getItem(EXPLAINER_KEY) !== 'true'; } catch { return true; }
  });
  const dismissExplainer = () => {
    setShowExplainer(false);
    try { localStorage.setItem(EXPLAINER_KEY, 'true'); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (searchParams.get('upgraded') === 'true' && !upgradedToastShown.current) {
      upgradedToastShown.current = true;
      setSearchParams({}, { replace: true });
      toast({
        title: '🎉 Welcome to Pro!',
        description: 'Your subscription is now active. Enjoy unlimited income tracking and CSV exports.',
        status: 'success',
        duration: 6000,
        isClosable: true,
        position: 'top',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (error) {
    return (
      <Box p={8}>
        <Alert status="error" borderRadius="10px"><AlertIcon />{error}</Alert>
      </Box>
    );
  }

  // Show blank only during the very first load before any data (cached or live) has
  // arrived. Using initialLoad rather than loading prevents a blank flash on every
  // background refresh for returning users who have a localStorage cache.
  if (initialLoad) {
    return <Box minH="100vh" bg={PAGE_BG} />;
  }

  // Show onboarding when no income has been recorded.
  // Expenses without income produce meaningless numbers (£0 safe-to-spend with no context),
  // so we treat income as the prerequisite for the dashboard to be useful.
  const showOnboarding = !initialLoad && income.length === 0;
  if (showOnboarding) {
    return <OnboardingEmptyState />;
  }

  const conf         = metrics ? getConfidenceLabel(metrics.confidenceScore) : null;
  const confWithTier = conf ? { ...conf, tier: conf.label === 'Strong' || conf.label === 'Healthy' ? 'good' : conf.label === 'Caution' ? 'caution' : 'bad' } : null;
  const runwayColor  = metrics ? getRunwayColor(metrics.monthlyRunway) : 'gray';
  const runwayPct    = metrics ? Math.min(100, (metrics.monthlyRunway / 12) * 100) : 0;

  // Stale income warning — show if most recent income entry is older than 42 days
  const daysSinceLastIncome = (() => {
    if (income.length === 0) return null;
    const latest = income.reduce((a, b) => a.date > b.date ? a : b);
    const diff   = Date.now() - new Date(latest.date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  })();
  const showStaleWarning = !loading && daysSinceLastIncome !== null && daysSinceLastIncome > 42;

  return (
    <Box>
      <PageHeader
        title={greeting()}
        subtitle="Here's your financial snapshot"
        action={<Box display={{ base: 'none', md: 'flex' }}><LastUpdatedIndicator lastUpdated={lastUpdated} isLoading={loading} /></Box>}
      />

      {liveFailedWithCache && (
        <HStack px={4} py={2} bg="#fef9c3" borderBottom="1px solid #fde68a" spacing={2}>
          <Icon as={RiSignalWifiErrorLine} color="#b45309" boxSize="14px" flexShrink={0} />
          <Text fontSize="12px" fontWeight="600" color="#b45309">
            Showing saved data — couldn't reach the server. Figures may be slightly out of date.
          </Text>
        </HStack>
      )}

      {showStaleWarning && (
        <HStack px={4} py={2.5} bg="#f8fafc" borderBottom="1px solid #e2e8f0"
          spacing={3} justify="space-between" flexWrap="wrap">
          <HStack spacing={2}>
            <Icon as={RiTimeLine} color="#8a9aaa" boxSize="14px" flexShrink={0} />
            <Text fontSize="12px" color="#5a6a7a">
              Last income recorded{' '}
              <Text as="span" fontWeight="600">{daysSinceLastIncome} days ago</Text>
              {' '}— your figures may not reflect recent earnings.
            </Text>
          </HStack>
          <Button
            size="xs" variant="outline" borderRadius="6px"
            borderColor="#c7d0f5" color="#4C5FD5" fontWeight="600" fontSize="11px"
            h="26px" px={3} flexShrink={0}
            _hover={{ bg: '#eef0fb', borderColor: '#4C5FD5' }}
            onClick={() => navigate('/income?add=true')}
          >
            Log income →
          </Button>
        </HStack>
      )}

      {/* Landing-page hero background — warm base + radial blobs */}
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

        <Box px={{ base: 4, md: 8 }} py={6} position="relative">

        {/* Hero */}
        <SafeToSpendHero
          safeToSpend={metrics?.safeToSpend ?? 0}
          currency={currency}
          status={confWithTier ?? { label: 'Loading…', color: colors.subtle, description: '', tier: 'good' }}
          isLoading={loading}
        />

        {/* First-run explainer — shown once until dismissed */}
        {showExplainer && !loading && income.length > 0 && (
          <Box
            bg="white" border="1px solid #c7d0f5" borderRadius="12px"
            p={4} mb={5} position="relative"
          >
            <HStack align="flex-start" spacing={3}>
              <Box
                w={8} h={8} borderRadius="8px" bg="#eef0fb" border="1px solid #c7d0f5"
                display="flex" alignItems="center" justifyContent="center" flexShrink={0} mt={0.5}
              >
                <Icon as={RiInformationLine} color="#4C5FD5" boxSize="15px" />
              </Box>
              <Box flex={1}>
                <Text fontSize="13px" fontWeight="700" color="#1C2B3A" mb={1}>
                  How your Safe to Spend is calculated
                </Text>
                <Text fontSize="12px" color="#5a6a7a" lineHeight="1.7" mb={3}>
                  Your number = <Text as="span" fontWeight="600" color="#1C2B3A">Current Balance</Text>
                  {' '}−{' '}<Text as="span" fontWeight="600" color="#D4A800">Tax Reserve</Text>
                  {' '}−{' '}<Text as="span" fontWeight="600" color="#4C5FD5">Emergency Buffer</Text>
                  {' '}−{' '}<Text as="span" fontWeight="600" color="#EB5757">Upcoming Bills</Text>
                  {' '}= <Text as="span" fontWeight="700" color="#27AE60">what you can safely spend</Text>.
                  It updates automatically as you log income and expenses.
                </Text>
                <HStack spacing={3} flexWrap="wrap">
                  <Button
                    size="xs" bg="#4C5FD5" color="white" borderRadius="6px"
                    fontWeight="600" fontSize="11px" h="26px" px={3}
                    rightIcon={<Icon as={RiArrowRightLine} boxSize="10px" />}
                    _hover={{ bg: '#3D4FBF' }}
                    onClick={() => navigate('/settings')}
                  >
                    Review your settings
                  </Button>
                  <Button
                    size="xs" variant="ghost" color="#8a9aaa" borderRadius="6px"
                    fontWeight="600" fontSize="11px" h="26px" px={2}
                    _hover={{ color: '#5a6a7a' }}
                    onClick={dismissExplainer}
                  >
                    Got it, don't show again
                  </Button>
                </HStack>
              </Box>
              <IconButton
                aria-label="Dismiss" icon={<Icon as={RiCloseLine} boxSize="14px" />}
                size="xs" variant="ghost" color="#8a9aaa" borderRadius="6px"
                _hover={{ color: '#5a6a7a', bg: '#f8fafc' }}
                onClick={dismissExplainer}
                flexShrink={0}
              />
            </HStack>
          </Box>
        )}

        {/* Stat cards */}
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4} mb={5}>
          <StatCard
            label="Balance"
            value={metrics ? formatCurrency(metrics.currentBalance, currency) : '—'}
            subtext="Total available"
            icon={RiWallet3Line}
            accentHex={colors.brand}
            isLoading={loading}
          />
          <StatCard
            label="Weekly Budget"
            value={metrics ? formatCurrency(metrics.weeklySpendAllowance, currency) : '—'}
            subtext="Safe to spend / week"
            icon={RiArrowUpLine}
            accentHex={colors.positive}
            isLoading={loading}
          />
          <StatCard
            label="Runway"
            value={metrics ? formatRunway(metrics.monthlyRunway) : '—'}
            subtext="Until funds run out"
            icon={RiTimeLine}
            accentHex={RUNWAY_HEX[runwayColor]}
            isLoading={loading}
            progressValue={runwayPct}
            progressHex={RUNWAY_HEX[runwayColor]}
          />
          <StatCard
            label="Avg Income"
            value={metrics ? formatCurrency(metrics.smoothedMonthlyIncome, currency) : '—'}
            subtext={
              settings?.expected_monthly_income && settings.expected_monthly_income > 0
                ? `Floor: ${formatCurrency(settings.expected_monthly_income, currency)}/mo applied`
                : '6-month rolling avg'
            }
            icon={RiLineChartLine}
            accentHex="#8B5CF6"
            isLoading={loading}
          />
        </SimpleGrid>

        {/* Chart + Confidence */}
        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4} mb={5}>
          <Box gridColumn={{ lg: 'span 2' }}>
            <IncomeTrendChart income={income} currency={currency} />
          </Box>
          <ConfidenceScoreCard score={metrics?.confidenceScore ?? 0} isLoading={loading} />
        </SimpleGrid>

        {/* Breakdown + Recent */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
          {loading ? (
            <Box bg={colors.surface} border="1px solid" borderColor={colors.border} borderRadius="12px" p={5}>
              <Skeleton h="14px" w="120px" mb={4} borderRadius="6px" />
              <SkeletonText noOfLines={5} spacing={3} skeletonHeight="12px" />
            </Box>
          ) : metrics ? (
            <BalanceBreakdown metrics={metrics} currency={currency} />
          ) : null}
          {loading ? (
            <Box bg={colors.surface} border="1px solid" borderColor={colors.border} borderRadius="12px" p={5}>
              <Skeleton h="14px" w="100px" mb={4} borderRadius="6px" />
              <SkeletonText noOfLines={4} spacing={4} skeletonHeight="14px" />
            </Box>
          ) : (
            <RecentIncomeList income={income} currency={currency} />
          )}
        </SimpleGrid>

        </Box>
      </Box>
    </Box>
  );
}
