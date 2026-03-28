import {
  Box, VStack, HStack, Text, Icon, SimpleGrid, Progress,
  Badge, Skeleton, Tooltip, Button, useDisclosure,
} from '@chakra-ui/react';
import {
  RiPercentLine, RiCalendarCheckLine, RiAlertLine,
  RiCheckboxCircleLine, RiInformationLine, RiArrowRightLine,
  RiSettings3Line, RiCheckLine,
} from 'react-icons/ri';
import { Link as RouterLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useFinancials } from '../hooks/useFinancials';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSubscription } from '../hooks/useSubscription';
import { usePrices } from '../hooks/usePrices';
import { UpgradeModal } from '../components/subscription/UpgradeModal';
import { PageHeader } from '../components/ui/PageHeader';
import { calcTaxTracker, daysUntilDeadline, getTaxYearStartIso } from '../utils/taxTracker';
import { calcTaxReserve } from '../utils/calculations';
import { formatCurrency } from '../utils/calculations';
import { incomeApi } from '../lib/supabase';
import type { IncomeEvent } from '../types';
import { PAGE_BG } from '../theme';

// ─── Colours ──────────────────────────────────────────────────────────────────

const C = {
  surface:  '#FFFFFF',
  border:   '#E8E8E3',
  surface2: '#F0EFE9',
  text:     '#1C2B3A',
  muted:    '#5a6a7a',
  subtle:   '#8a9aaa',
  amber:    '#D4A800',
  amberBg:  '#fffbeb',
  amberBdr: '#fde68a',
  green:    '#27AE60',
  greenBg:  '#f0fdf4',
  red:      '#DC2626',
  redBg:    '#fef2f2',
  redBdr:   '#fecaca',
  brand:    '#4C5FD5',
  brandBg:  '#eef0fb',
  brandBdr: '#c7d0f5',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatTile({
  label, value, sub, color = C.text, bg = C.surface, icon,
}: {
  label: string; value: string; sub?: string;
  color?: string; bg?: string; icon: React.ElementType;
}) {
  return (
    <Box bg={bg} border="1px solid" borderColor={C.border} borderRadius="12px" p={5}>
      <HStack justify="space-between" mb={3}>
        <Text fontSize="10px" fontWeight="700" color={C.subtle}
          textTransform="uppercase" letterSpacing="0.8px">
          {label}
        </Text>
        <Box w={7} h={7} borderRadius="7px" bg={C.surface2}
          display="flex" alignItems="center" justifyContent="center">
          <Icon as={icon} color={C.brand} boxSize="14px" />
        </Box>
      </HStack>
      <Text fontSize="22px" fontWeight="700" letterSpacing="-0.8px" color={color} lineHeight="1.1">
        {value}
      </Text>
      {sub && <Text fontSize="11px" color={C.subtle} mt={1}>{sub}</Text>}
    </Box>
  );
}

function DeadlineRow({ payment, currency, isPaid, onToggle }: {
  payment: ReturnType<typeof calcTaxTracker>['payments'][0];
  currency: string;
  isPaid: boolean;
  onToggle: (id: string) => void;
}) {
  const days       = daysUntilDeadline(payment.dueDate);
  const isOverdue  = !isPaid && payment.status === 'overdue';
  const isUpcoming = !isPaid && payment.status === 'upcoming';
  const isSoon     = isUpcoming && days <= 60;

  // Paid rows get a clean green treatment regardless of date
  const borderColor = isPaid
    ? '#b7efd1'
    : payment.isPrimary
      ? (isOverdue ? C.redBdr : C.brandBdr)
      : C.border;
  const bg = isPaid
    ? C.greenBg
    : payment.isPrimary
      ? (isOverdue ? C.redBg : C.brandBg)
      : C.surface;

  let countdownText = '';
  if (isPaid)              countdownText = 'Marked as paid';
  else if (isOverdue)      countdownText = `${Math.abs(days)} days overdue`;
  else if (days === 0)     countdownText = 'Due today';
  else                     countdownText = `${days} days away`;

  const countdownColor = isPaid ? C.green : isOverdue ? C.red : isSoon ? C.amber : C.subtle;

  return (
    <HStack
      px={4} py={3} borderRadius="10px"
      bg={bg} border="1px solid" borderColor={borderColor}
      spacing={3} align="flex-start"
    >
      <Box mt="2px" flexShrink={0}>
        {isPaid ? (
          <Icon as={RiCheckLine} color={C.green} boxSize="16px" />
        ) : isOverdue ? (
          <Icon as={RiAlertLine} color={C.red} boxSize="16px" />
        ) : (
          <Icon as={RiCalendarCheckLine} color={payment.isPrimary ? C.brand : C.subtle} boxSize="16px" />
        )}
      </Box>
      <Box flex={1} minW={0}>
        <HStack justify="space-between" flexWrap="wrap" gap={1}>
          <Text fontSize="13px"
            fontWeight={payment.isPrimary ? '700' : '600'}
            color={isPaid ? C.green : C.text}
            textDecoration={isPaid ? 'line-through' : 'none'}
            opacity={isPaid ? 0.8 : 1}>
            {payment.label}
          </Text>
          <HStack spacing={2}>
            <Text fontSize="11px" fontWeight="600" color={countdownColor}>
              {countdownText}
            </Text>
            {payment.isPrimary && !isPaid && (
              <Badge fontSize="9px" fontWeight="700" px={1.5} py={0.5}
                borderRadius="5px" bg={isOverdue ? C.red : C.brand} color="white"
                textTransform="uppercase" letterSpacing="0.4px">
                Next
              </Badge>
            )}
          </HStack>
        </HStack>
        <Text fontSize="11px" color={C.muted} mt={0.5}>{payment.description}</Text>
        <HStack mt={1.5} justify="space-between" align="center">
          <Text fontSize="12px" fontWeight="600" color={isPaid ? C.muted : C.text}>
            ~{formatCurrency(payment.estimatedAmount, currency)}
            <Text as="span" fontSize="10px" fontWeight="400" color={C.subtle} ml={1}>
              estimated
            </Text>
          </Text>
          <Button
            size="xs" variant="ghost"
            h="24px" px={2}
            fontSize="11px" fontWeight="600"
            color={isPaid ? C.muted : C.brand}
            _hover={{ bg: isPaid ? '#f1f5f9' : C.brandBg }}
            onClick={() => onToggle(payment.id)}
          >
            {isPaid ? 'Mark unpaid' : 'Mark as paid'}
          </Button>
        </HStack>
      </Box>
    </HStack>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <Box bg={C.surface} border="1px solid" borderColor={C.border} borderRadius="14px"
      p={12} textAlign="center">
      <Box w="64px" h="64px" mx="auto" mb={4} borderRadius="18px"
        bg="linear-gradient(135deg, #eef0fb 0%, #e4e8fa 100%)"
        border="1px solid #d0d6f5"
        display="flex" alignItems="center" justifyContent="center">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="6" width="24" height="20" rx="3" fill="#c7d0f5" />
          <rect x="6" y="11" width="20" height="13" rx="2" fill="#eef0fb" />
          <rect x="4" y="6" width="24" height="7" rx="3" fill="#7b8fe8" />
          <text x="16" y="21" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#4C5FD5">%</text>
        </svg>
      </Box>
      <Text fontSize="15px" fontWeight="600" color={C.text} mb={2}>
        No income recorded yet
      </Text>
      <Text fontSize="13px" color={C.muted} maxW="320px" mx="auto" mb={5} lineHeight="1.6">
        Add your income entries and the Tax Tracker will automatically calculate your estimated
        bill and payment deadlines.
      </Text>
      <HStack justify="center" spacing={2} fontSize="12px" color={C.brand} fontWeight="600"
        as={RouterLink} to="/income" cursor="pointer" _hover={{ opacity: 0.8 }}>
        <Text>Add income</Text>
        <Icon as={RiArrowRightLine} boxSize="14px" />
      </HStack>
    </Box>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TaxTrackerPage() {
  usePageTitle('Tax Tracker');
  const { user }                         = useAuth();
  const { settings, loading: finLoading } = useFinancials();
  const { isPro, loading: subLoading }   = useSubscription();
  const { label: priceLabel }            = usePrices();
  const { isOpen: isUpgradeOpen, onOpen: onUpgradeOpen, onClose: onUpgradeClose } = useDisclosure();

  const currency    = settings?.currency ?? 'USD';
  const taxRate     = settings?.tax_rate ?? 0.25;
  const taxSchedule = settings?.tax_schedule ?? 'annual';

  // ── Fetch full tax-year income directly ───────────────────────────────────
  // useFinancials only loads a 12-month rolling window, which can miss income
  // recorded earlier in the tax year (e.g. April–November for a UK user checking
  // in March). We fetch from the exact tax year start date instead.
  const [taxYearIncome, setTaxYearIncome] = useState<IncomeEvent[]>([]);
  const [incomeLoading, setIncomeLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIncomeLoading(true);
    const fromDate = getTaxYearStartIso(taxSchedule);
    incomeApi.listByDateRange(user.id, fromDate)
      .then(setTaxYearIncome)
      .catch(() => setTaxYearIncome([]))
      .finally(() => setIncomeLoading(false));
  }, [user, taxSchedule]);

  const loading = finLoading || incomeLoading;

  // ── Paid deadlines — persisted to localStorage per user ──────────────────
  const storageKey = user ? `spendable_tax_paid_${user.id}` : null;

  const [paidIds, setPaidIds] = useState<Set<string>>(() => {
    if (!storageKey) return new Set();
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch { return new Set(); }
  });

  // Persist whenever paidIds changes
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify([...paidIds]));
    } catch { /* storage full — ignore */ }
  }, [paidIds, storageKey]);

  const handleTogglePaid = (id: string) => {
    setPaidIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // reserved = tax_rate × tax-year income (matches the YTD bill calculation exactly)
  const reserved = calcTaxReserve(taxYearIncome, taxRate);

  const data = calcTaxTracker(taxYearIncome, taxRate, taxSchedule, currency, reserved);

  const hasIncome    = taxYearIncome.length > 0;
  const isSurplus    = data.shortfall <= 0;
  const shortfallAbs = Math.abs(data.shortfall);

  const scheduleLabel = (() => {
    if (taxSchedule === 'quarterly') {
      const labels: Record<string, string> = {
        USD: 'Quarterly estimated tax (IRS)',
        CAD: 'Quarterly instalments (CRA)',
        AUD: 'Quarterly PAYG instalments (ATO)',
        EUR: 'Quarterly instalments',
      };
      return labels[currency.toUpperCase()] ?? 'Quarterly instalments';
    }
    // Annual — GBP is unambiguously UK self-assessment; others get a generic label
    if (currency.toUpperCase() === 'GBP') return 'Annual (UK self-assessment)';
    return 'Annual payment schedule';
  })();

  // Blank while subscription loads — prevents free-plan gate flashing for Pro users
  if (subLoading) {
    return <Box minH="100vh" bg={PAGE_BG} />;
  }

  if (!isPro) {
    return (
      <Box>
        <Box position="relative" overflow="hidden" bg={PAGE_BG} minH="100vh">
          <Box position="absolute" top="-120px" right="-120px" w="520px" h="520px" borderRadius="full"
            bg="radial-gradient(circle, rgba(212,168,0,0.07) 0%, transparent 70%)" pointerEvents="none" />
          <Box position="relative" display="flex" alignItems="center" justifyContent="center" minH="70vh">
            <Box maxW="420px" w="full" mx="auto" px={6} textAlign="center">
              <Box w={16} h={16} borderRadius="16px" bg="#fffbeb" border="1px solid #fde68a"
                display="flex" alignItems="center" justifyContent="center" mx="auto" mb={6}>
                <Icon as={RiPercentLine} color="#D4A800" boxSize={7} />
              </Box>
              <Text fontSize="24px" fontWeight="800" letterSpacing="-0.8px" color="#1C2B3A" mb={3}>
                Tax Tracker
              </Text>
              <Text fontSize="15px" color="#5a6a7a" lineHeight="1.65" mb={6}>
                Track your tax pot, see your estimated bill, and stay on top of every payment deadline — with the right schedule for your country.
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
          <UpgradeModal isOpen={isUpgradeOpen} onClose={onUpgradeClose} reason="manual" userCurrency={currency} />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box position="relative" overflow="hidden" bg={PAGE_BG} minH="100vh">
        {/* Blobs */}
        <Box position="absolute" top="-120px" right="-120px" w="520px" h="520px"
          borderRadius="full" pointerEvents="none"
          bg="radial-gradient(circle, rgba(212,168,0,0.07) 0%, transparent 70%)" />
        <Box position="absolute" bottom="-80px" left="-80px" w="420px" h="420px"
          borderRadius="full" pointerEvents="none"
          bg="radial-gradient(circle, rgba(76,95,213,0.05) 0%, transparent 70%)" />

        <Box position="relative">
          <PageHeader
            title="Tax Tracker"
            subtitle={`Tax year ${data.taxYearLabel} · ${scheduleLabel}`}
          />

          <Box px={{ base: 4, md: 8 }} py={6}>
            {loading ? (
              <VStack spacing={4} align="stretch">
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
                  {[1, 2, 3].map(i => <Skeleton key={i} h="100px" borderRadius="12px" />)}
                </SimpleGrid>
                <Skeleton h="140px" borderRadius="14px" />
                <Skeleton h="200px" borderRadius="14px" />
              </VStack>
            ) : !hasIncome ? (
              <EmptyState />
            ) : (
              <VStack spacing={5} align="stretch">

                {/* ── Stat tiles ── */}
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
                  <StatTile
                    label="YTD Income"
                    value={formatCurrency(data.ytdIncome, currency)}
                    sub={`Tax year ${data.taxYearLabel}`}
                    icon={RiPercentLine}
                  />
                  <StatTile
                    label="Estimated Tax Bill"
                    value={formatCurrency(data.estimatedBill, currency)}
                    sub={`At ${Math.round(taxRate * 100)}% effective rate`}
                    icon={RiCalendarCheckLine}
                    color={C.amber}
                  />
                  <StatTile
                    label="Reserved So Far"
                    value={formatCurrency(reserved, currency)}
                    sub={`${Math.round(taxRate * 100)}% of tax-year income`}
                    icon={RiCheckboxCircleLine}
                    color={C.green}
                  />
                </SimpleGrid>

                {/* ── Pot progress ── */}
                <Box bg={C.surface} border="1px solid" borderColor={C.border}
                  borderRadius="14px" p={6}>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="13px" fontWeight="700" color={C.text}>
                      Tax Pot Progress
                    </Text>
                    <Text fontSize="13px" fontWeight="700"
                      color={isSurplus ? C.green : data.potPct >= 75 ? C.amber : C.red}>
                      {data.potPct}%
                    </Text>
                  </HStack>
                  <Text fontSize="12px" color={C.muted} mb={4}>
                    {formatCurrency(reserved, currency)} reserved of {formatCurrency(data.estimatedBill, currency)} estimated bill
                  </Text>

                  <Box mb={5}>
                    <Progress
                      value={data.potPct} size="md" borderRadius="full"
                      bg={C.surface2}
                      sx={{
                        '& > div': {
                          background: isSurplus ? C.green
                            : data.potPct >= 75 ? C.amber
                            : C.red,
                          transition: 'width 0.8s ease',
                        },
                      }}
                    />
                  </Box>

                  {/* Shortfall / surplus callout */}
                  {isSurplus ? (
                    <HStack px={4} py={3} borderRadius="10px" bg={C.greenBg}
                      border="1px solid" borderColor="#b7efd1" spacing={3}>
                      <Icon as={RiCheckboxCircleLine} color={C.green} boxSize="16px" flexShrink={0} />
                      <Box>
                        <Text fontSize="13px" fontWeight="700" color="#166534">
                          You have a surplus of {formatCurrency(shortfallAbs, currency)}
                        </Text>
                        <Text fontSize="11px" color="#166534" opacity={0.8} mt={0.5}>
                          You've reserved more than your estimated bill. Great position to be in.
                        </Text>
                      </Box>
                    </HStack>
                  ) : (
                    <HStack px={4} py={3} borderRadius="10px"
                      bg={data.potPct >= 75 ? C.amberBg : C.redBg}
                      border="1px solid" borderColor={data.potPct >= 75 ? C.amberBdr : C.redBdr}
                      spacing={3}>
                      <Icon as={RiAlertLine}
                        color={data.potPct >= 75 ? C.amber : C.red}
                        boxSize="16px" flexShrink={0} />
                      <Box>
                        <Text fontSize="13px" fontWeight="700"
                          color={data.potPct >= 75 ? '#92400e' : '#991b1b'}>
                          Shortfall of {formatCurrency(shortfallAbs, currency)}
                        </Text>
                        <Text fontSize="11px" mt={0.5}
                          color={data.potPct >= 75 ? '#92400e' : '#991b1b'} opacity={0.8}>
                          {data.potPct >= 75
                            ? 'You\'re most of the way there — keep adding to your reserve.'
                            : 'You may need to set aside more before your next deadline.'}
                        </Text>
                      </Box>
                    </HStack>
                  )}
                </Box>

                {/* ── Payment schedule ── */}
                <Box bg={C.surface} border="1px solid" borderColor={C.border}
                  borderRadius="14px" p={6}>
                  <HStack justify="space-between" mb={1}>
                    <Text fontSize="13px" fontWeight="700" color={C.text}>
                      Payment Schedule
                    </Text>
                    <Tooltip
                      label="Amounts shown are estimates based on your YTD income and tax rate. Actual bills may vary."
                      fontSize="12px" borderRadius="8px" p={3} maxW="240px"
                      bg={C.text} color="white" hasArrow>
                      <Box cursor="help" display="flex">
                        <Icon as={RiInformationLine} color={C.subtle} boxSize="13px" />
                      </Box>
                    </Tooltip>
                  </HStack>
                  <Text fontSize="12px" color={C.muted} mb={5}>
                    Estimated deadlines and amounts for tax year {data.taxYearLabel}
                  </Text>

                  <VStack spacing={2.5} align="stretch">
                    {data.payments.map((p) => (
                      <DeadlineRow
                        key={p.id}
                        payment={p}
                        currency={currency}
                        isPaid={paidIds.has(p.id)}
                        onToggle={handleTogglePaid}
                      />
                    ))}
                  </VStack>
                </Box>

                {/* ── Explainer note ── */}
                <Box bg={C.brandBg} border="1px solid" borderColor={C.brandBdr}
                  borderRadius="12px" p={4}>
                  <HStack spacing={2.5} align="flex-start">
                    <Icon as={RiInformationLine} color={C.brand} boxSize="15px" mt={0.5} flexShrink={0} />
                    <Box>
                      <Text fontSize="12px" fontWeight="700" color="#2d3ea8" mb={1}>
                        How {taxSchedule === 'annual'
                        ? (currency.toUpperCase() === 'GBP' ? 'UK self-assessment' : 'annual tax payments')
                        : `${currency.toUpperCase()} quarterly instalments`} work
                      </Text>
                      <Text fontSize="12px" color="#3d4faf" lineHeight="1.6">
                        {data.scheduleNote}
                      </Text>
                    </Box>
                  </HStack>
                </Box>

                {/* ── Settings nudge ── */}
                <HStack px={4} py={3} borderRadius="10px" bg={C.surface}
                  border="1px solid" borderColor={C.border} spacing={2}>
                  <Icon as={RiSettings3Line} color={C.subtle} boxSize="13px" flexShrink={0} />
                  <Text fontSize="11px" color={C.muted}>
                    Tax rate and payment schedule can be adjusted in{' '}
                    <Text as="span" color={C.brand} fontWeight="600"
                      cursor="pointer" textDecoration="underline"
                      textDecorationStyle="dotted">
                      <RouterLink to="/settings">Settings → Tax & Self-Employment</RouterLink>
                    </Text>.
                    {' '}Amounts are estimates — always consult a qualified tax adviser.
                  </Text>
                </HStack>

              </VStack>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
