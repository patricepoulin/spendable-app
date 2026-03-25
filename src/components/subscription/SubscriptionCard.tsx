import {
  Box, HStack, VStack, Text, Button, Icon, Badge, useDisclosure, useToast,
} from '@chakra-ui/react';
import {
  RiFlashlightLine, RiExternalLinkLine, RiCheckLine,
  RiDownload2Line, RiTimeLine, RiAlertLine,
} from 'react-icons/ri';
import { UpgradeModal } from './UpgradeModal';
import { openCustomerPortal, PLANS, FREE_INCOME_LIMIT, FREE_EXPENSE_LIMIT, FREE_UPCOMING_LIMIT } from '../../services/stripe';
import { useAuth } from '../../hooks/useAuth';
import { usePrices, type CurrencyKey } from '../../hooks/usePrices';
import { EXPORT_GRACE_DAYS } from '../../hooks/useSubscription';
import { useState } from 'react';
import type { UserSubscription } from '../../types';

interface Props {
  subscription:       UserSubscription | null;
  isPro:              boolean;
  isInGracePeriod:    boolean;
  graceDaysRemaining: number;
  canExportCsv:       boolean;
  totalIncomeCount:   number;
  expenseCount?:      number;
  upcomingCount?:     number;
  userCurrency?:      string;
  onExport:           () => void;
}

export function SubscriptionCard({
  subscription, isPro, isInGracePeriod, graceDaysRemaining,
  canExportCsv, totalIncomeCount, expenseCount = 0, upcomingCount = 0, userCurrency, onExport,
}: Props) {
  const { user }  = useAuth();
  const toast     = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [portalLoading, setPortalLoading] = useState(false);
  const { label: priceLabel } = usePrices();

  const surface = '#ffffff';
  const border  = '#e2e8f0';
  const muted   = '#64748b';

  const handlePortal = async () => {
    if (!user) return;
    setPortalLoading(true);
    try {
      await openCustomerPortal();
    } catch (err) {
      toast({
        title: 'Could not open portal',
        description: err instanceof Error ? err.message : 'Please try again',
        status: 'error', duration: 4000, isClosable: true,
      });
      setPortalLoading(false);
    }
  };

  const periodEnd = subscription?.subscription_current_period_end
    ? new Date(subscription.subscription_current_period_end).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  // ── Header colours vary by state ──────────────────────────────────────────
  const headerGradient = isPro
    ? 'linear(135deg, #1C2B3A 0%, #253344 100%)'
    : isInGracePeriod
      ? 'linear(135deg, #451a03 0%, #78350f 100%)'
      : 'linear(135deg, #f8fafc 0%, #f1f5f9 100%)';

  const badgeLabel  = isPro ? 'Pro' : isInGracePeriod ? 'Grace Period' : 'Free';
  const badgeBg     = isPro ? 'rgba(76,95,213,0.25)' : isInGracePeriod ? 'rgba(251,191,36,0.2)' : '#eef0fb';
  const badgeColor  = isPro ? '#7b8fec' : isInGracePeriod ? '#fbbf24' : '#4C5FD5';
  const titleColor  = isPro || isInGracePeriod ? 'white' : '#1C2B3A';
  const subtitleColor = isPro ? '#8FABBF' : isInGracePeriod ? '#fcd34d' : muted;

  const headerSubtitle = isPro
    ? (periodEnd ? `Renews ${periodEnd}` : 'Active subscription')
    : isInGracePeriod
      ? `Export access expires in ${graceDaysRemaining} day${graceDaysRemaining !== 1 ? 's' : ''}`
      : `Up to ${FREE_INCOME_LIMIT} income entries`;

  return (
    <>
      <Box bg={surface} border="1px solid" borderColor={border} borderRadius="14px" overflow="hidden">

        {/* Header */}
        <Box
          px={6} py={5}
          bgGradient={headerGradient}
          borderBottom="1px solid" borderColor={border}
          position="relative" overflow="hidden"
        >
          {(isPro || isInGracePeriod) && (
            <Box
              position="absolute" top="-30px" right="-30px"
              w="140px" h="140px" borderRadius="full"
              bg={isPro
                ? 'radial-gradient(circle, rgba(76,95,213,0.25) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)'}
              pointerEvents="none"
            />
          )}
          <HStack justify="space-between" align="flex-start">
            <HStack spacing={3}>
              <Box
                w={9} h={9} borderRadius="10px"
                bg={isPro
                  ? 'rgba(76,95,213,0.25)'
                  : isInGracePeriod
                    ? 'rgba(251,191,36,0.2)'
                    : '#eef0fb'}
                display="flex" alignItems="center" justifyContent="center"
              >
                <Icon
                  as={isInGracePeriod ? RiTimeLine : RiFlashlightLine}
                  color={isPro ? '#7b8fec' : isInGracePeriod ? '#fbbf24' : '#4C5FD5'}
                  boxSize="18px"
                />
              </Box>
              <Box>
                <Text fontWeight="700" fontSize="15px" letterSpacing="-0.3px" color={titleColor}>
                  {isPro ? 'Spendable Pro' : isInGracePeriod ? 'Subscription Ended' : 'Free Plan'}
                </Text>
                <Text fontSize="12px" color={subtitleColor}>{headerSubtitle}</Text>
              </Box>
            </HStack>
            <Badge
              px={2.5} py={1} borderRadius="full"
              fontSize="10px" fontWeight="700"
              bg={badgeBg} color={badgeColor}
              textTransform="uppercase" letterSpacing="0.5px"
            >
              {badgeLabel}
            </Badge>
          </HStack>
        </Box>

        {/* Body */}
        <VStack spacing={4} align="stretch" px={6} py={5}>

          {/* ── Active Pro ── */}
          {isPro && (
            <>
              <VStack spacing={2} align="stretch">
                {PLANS.pro.features.map(f => (
                  <HStack key={f} spacing={2}>
                    <Icon as={RiCheckLine} color="#27AE60" boxSize="14px" flexShrink={0} />
                    <Text fontSize="13px" color="#1C2B3A">{f}</Text>
                  </HStack>
                ))}
              </VStack>
              <Button
                leftIcon={<Icon as={RiExternalLinkLine} />}
                variant="outline" borderColor={border}
                bg="white" color={muted}
                size="sm" borderRadius="8px" fontWeight="600" fontSize="12px"
                _hover={{ bg: '#f8fafc' }}
                isLoading={portalLoading} loadingText="Opening…"
                onClick={handlePortal}
              >
                Manage subscription
              </Button>
            </>
          )}

          {/* ── Payment failing (past_due / unpaid) ── */}
          {!isPro && !isInGracePeriod && (subscription?.subscription_status === 'past_due' || subscription?.subscription_status === 'unpaid') && (
            <Box p={4} borderRadius="10px" bg="#fff1f2" border="1px solid #fecdd3">
              <HStack spacing={2.5} mb={2}>
                <Icon as={RiAlertLine} color="#e11d48" boxSize="14px" flexShrink={0} />
                <Text fontSize="13px" fontWeight="700" color="#9f1239">
                  Payment issue
                </Text>
              </HStack>
              <Text fontSize="12px" color="#be123c" lineHeight="1.5" mb={3}>
                Your last payment failed. Update your billing details to restore full Pro access.
              </Text>
              <Button
                leftIcon={<Icon as={RiExternalLinkLine} />}
                size="sm" borderRadius="8px"
                bg="#e11d48" color="white"
                fontWeight="600" fontSize="12px"
                _hover={{ bg: '#be123c' }}
                isLoading={portalLoading} loadingText="Opening…"
                onClick={handlePortal}
              >
                Update billing
              </Button>
            </Box>
          )}

          {/* ── Grace period ── */}
          {isInGracePeriod && (
            <>
              {/* Amber notice box */}
              <Box
                p={4} borderRadius="10px"
                bg="#fffbeb" border="1px solid #fde68a"
              >
                <HStack spacing={2.5} mb={2}>
                  <Icon as={RiTimeLine} color="#d97706" boxSize="14px" flexShrink={0} />
                  <Text fontSize="13px" fontWeight="700" color="#92400e">
                    {graceDaysRemaining} day{graceDaysRemaining !== 1 ? 's' : ''} left to export your data
                  </Text>
                </HStack>
                <Text fontSize="12px" color="#b45309" lineHeight="1.5">
                  Your Pro subscription has ended. You have a {EXPORT_GRACE_DAYS}-day window to
                  export your income and expense data before CSV export is locked.
                </Text>
              </Box>

              {/* Export button */}
              <Button
                leftIcon={<Icon as={RiDownload2Line} />}
                bg="#d97706" color="white"
                size="sm" borderRadius="8px" fontWeight="600" fontSize="13px"
                _hover={{ bg: '#b45309' }}
                onClick={onExport}
              >
                Export my data now
              </Button>

              {/* Resubscribe CTA */}
              <Button
                leftIcon={<Icon as={RiFlashlightLine} />}
                variant="outline" borderColor="#E8E8E3"
                bg="white" color="#4C5FD5"
                size="sm" borderRadius="8px" fontWeight="600" fontSize="13px"
                _hover={{ bg: '#eef0fb', borderColor: '#4C5FD5' }}
                onClick={onOpen}
              >
                Resubscribe to Pro
              </Button>
            </>
          )}

          {/* ── Free plan ── */}
          {!isPro && !isInGracePeriod && (
            <>
              {/* ── Usage bars ── */}
              {[
                { label: 'Income entries', count: totalIncomeCount, limit: FREE_INCOME_LIMIT },
                { label: 'Expenses',       count: expenseCount,     limit: FREE_EXPENSE_LIMIT },
                { label: 'Upcoming',       count: upcomingCount,    limit: FREE_UPCOMING_LIMIT },
              ].map(({ label, count, limit }) => {
                const pct = Math.min(100, (count / limit) * 100);
                const barColor = pct >= 100 ? '#EB5757' : pct >= 67 ? '#f59e0b' : '#4C5FD5';
                const countColor = pct >= 100 ? '#EB5757' : '#1C2B3A';
                return (
                  <Box key={label}>
                    <HStack justify="space-between" mb={1.5}>
                      <Text fontSize="12px" color={muted} fontWeight="500">{label}</Text>
                      <Text fontSize="12px" fontWeight="700" color={countColor}>
                        {count} / {limit}
                      </Text>
                    </HStack>
                    <Box h="6px" borderRadius="full" bg="#f1f5f9" overflow="hidden">
                      <Box
                        h="full" borderRadius="full" transition="width 0.3s, background-color 0.3s"
                        w={`${pct}%`} bg={barColor}
                      />
                    </Box>
                  </Box>
                );
              })}
              {/* Free features */}
              <Box bg="#f8fafc" borderRadius="10px" p={3}>
                <Text fontSize="11px" fontWeight="700" color="#94a3b8"
                  textTransform="uppercase" letterSpacing="0.08em" mb={2.5}>
                  Included on Free
                </Text>
                <VStack spacing={1.5} align="stretch">
                  {PLANS.free.features.map(f => (
                    <HStack key={f} spacing={2}>
                      <Icon as={RiCheckLine} color="#27AE60" boxSize="13px" flexShrink={0} />
                      <Text fontSize="12px" color="#475569">{f}</Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>

              {/* Pro features */}
              <Box bg="#eef0fb" borderRadius="10px" p={3}>
                <Text fontSize="11px" fontWeight="700" color="#4C5FD5"
                  textTransform="uppercase" letterSpacing="0.08em" mb={2.5}>
                  {(() => {
                    const key = (userCurrency?.toLowerCase() ?? 'usd') as CurrencyKey;
                    return `Unlock with Pro — from ${priceLabel(key)}`;
                  })()}
                </Text>
                <VStack spacing={1.5} align="stretch">
                  {PLANS.pro.features.map(f => (
                    <HStack key={f} spacing={2}>
                      <Icon as={RiFlashlightLine} color="#4C5FD5" boxSize="13px" flexShrink={0} />
                      <Text fontSize="12px" color="#1C2B3A" fontWeight="500">{f}</Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>

              <Button
                leftIcon={<Icon as={RiFlashlightLine} />}
                bg="#4C5FD5" color="white"
                size="sm" h="38px" borderRadius="9px" fontWeight="700" fontSize="13px"
                _hover={{ bg: '#3D4FBF' }}
                onClick={onOpen}
              >
                Upgrade to Pro
              </Button>
            </>
          )}

        </VStack>
      </Box>

      <UpgradeModal isOpen={isOpen} onClose={onClose} reason="manual" userCurrency={userCurrency} />
    </>
  );
}
