import { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Button, Icon,
  FormControl, FormLabel, FormHelperText,
  Input, Select,
  NumberInput, NumberInputField,
  NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper,
  SimpleGrid, Alert, AlertIcon, useToast, useDisclosure, Tooltip,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
  Input as ChakraInput,
} from '@chakra-ui/react';
import { RiSave2Line, RiInformationLine, RiCalculatorLine, RiShieldLine, RiWalletLine, RiDeleteBin2Line, RiFileDownloadLine, RiDownload2Line, RiFlashlightLine, RiUserUnfollowLine, RiAlertLine } from 'react-icons/ri';
import { Link as RouterLink } from 'react-router-dom';
import { SubscriptionCard } from '../components/subscription/SubscriptionCard';
import { ShareSpendableCard } from '../components/settings/ShareSpendableCard';
import { UpgradeModal } from '../components/subscription/UpgradeModal';
import { useSubscription } from '../hooks/useSubscription';
import { PageHeader } from '../components/ui/PageHeader';
import { useFinancials } from '../hooks/useFinancials';
import { formatCurrency } from '../utils/calculations';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { settingsApi, incomeApi, IS_MOCK } from '../lib/supabase';
import { resetMockStore } from '../lib/mockStore';
import { exportFullSnapshotCsv, exportIncomeCsv, exportExpensesCsv, exportUpcomingCsv } from '../utils/exportCsv';
import { PAGE_BG } from '../theme';

function SettingSection({
  title, description, icon, iconColor, children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
}) {
  const surface = '#ffffff';
  const border  = '#e2e8f0';
  const muted   = '#64748b';

  return (
    <Box bg={surface} border="1px solid" borderColor={border} borderRadius="14px" p={6}>
      <HStack spacing={3} mb={5}>
        <Box
          w={9} h={9} borderRadius="10px"
          bg={iconColor + '12'}
          display="flex" alignItems="center" justifyContent="center"
          flexShrink={0}
        >
          <Icon as={icon} color={iconColor} boxSize="16px" />
        </Box>
        <Box>
          <Text fontWeight="600" fontSize="14px" letterSpacing="-0.2px">{title}</Text>
          <Text fontSize="12px" color={muted}>{description}</Text>
        </Box>
      </HStack>
      {children}
    </Box>
  );
}

export function SettingsPage() {
  usePageTitle('Settings');
  const { user, signOut } = useAuth();
  const { settings, metrics, income, expenses, upcoming, refresh } = useFinancials();
  const toast = useToast();

  // Fetch the real all-time income count from the DB so the usage bar in
  // SubscriptionCard is accurate even though useFinancials only loads 12 months.
  // Initialise from income.length so the bar shows a real number immediately
  // (correct for most users), then the DB count overwrites it once it arrives.
  const [dbIncomeCount, setDbIncomeCount] = useState(income.length);
  useEffect(() => {
    // Always sync to income.length as a fast baseline
    setDbIncomeCount(c => Math.max(c, income.length));
  }, [income.length]);
  useEffect(() => {
    if (!user || IS_MOCK) return;
    incomeApi.count(user.id).then(setDbIncomeCount).catch(() => {});
  }, [user]);

  const { subscription, isPro, isInGracePeriod, graceDaysRemaining, canExportCsv, totalIncomeCount } = useSubscription([], 0, 0, dbIncomeCount);
  const { isOpen: isUpgradeOpen, onOpen: onUpgradeOpen, onClose: onUpgradeClose } = useDisclosure();

  const [form, setForm] = useState({
    tax_rate: 25,
    emergency_buffer_months: 3,
    starting_balance: 0,
    currency: 'USD',
    tax_schedule: 'annual' as 'annual' | 'quarterly',
    expected_monthly_income: 0,
    paid_tax_deadline_ids: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  // Wrapper so any form change marks settings as dirty
  const updateForm = (updater: (prev: typeof form) => typeof form) => {
    setForm(updater);
    setIsDirty(true);
  };
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      // Delete all user data via Supabase RPC or cascading deletes
      // For now we sign out and show a message — full server-side deletion
      // should be done via a Supabase Edge Function in production
      // Grab the live JWT first, then fire the delete request
      const { supabase: sb } = await import('../lib/supabase');
      const { data: sessionData } = await sb!.auth.getSession();
      const token = sessionData.session?.access_token ?? '';
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }).catch(() => {}); // best-effort — sign out regardless
      await signOut();
    } catch {
      toast({ title: 'Failed to delete account. Please contact support.', status: 'error', duration: 4000 });
    } finally {
      setDeleting(false);
    }
  };

  const muted    = '#64748b';
  const infoBg   = '#f0fdf9';
  const infoBorder = '#99f6e0';

  useEffect(() => {
    if (settings) {
      setIsDirty(false);
      setForm({
        tax_rate: Math.round(settings.tax_rate * 100),
        emergency_buffer_months: settings.emergency_buffer_months,
        starting_balance: settings.starting_balance,
        currency: settings.currency,
        tax_schedule: settings.tax_schedule ?? 'annual',
        expected_monthly_income: settings.expected_monthly_income ?? 0,
        paid_tax_deadline_ids: settings.paid_tax_deadline_ids ?? [],
      });
    }
  }, [settings]);

  // Warn on browser/tab close when there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await settingsApi.upsert(user.id, {
        tax_rate: form.tax_rate / 100,
        emergency_buffer_months: form.emergency_buffer_months,
        starting_balance: form.starting_balance,
        currency: form.currency,
        tax_schedule: form.tax_schedule,
        expected_monthly_income: form.expected_monthly_income,
        paid_tax_deadline_ids: form.paid_tax_deadline_ids,
      });
      toast({ title: 'Settings saved', status: 'success', duration: 2000, isClosable: true });
      setIsDirty(false);
      await refresh();
    } catch {
      toast({ title: 'Failed to save settings', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const numInputProps = {
    borderRadius: '10px',
    h: '42px',
    fontSize: '14px',
  };

  return (
    <Box>
      <Box position="relative" overflow="hidden" bg={PAGE_BG} minH="100vh">
      {/* Top-right indigo blob */}
      <Box
        position="absolute" top="-120px" right="-120px"
        w="520px" h="520px" borderRadius="full"
        bg="radial-gradient(circle, rgba(76,95,213,0.07) 0%, transparent 70%)"
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
      <PageHeader title="Settings" subtitle="Configure your financial assumptions" />
      <Box px={{ base: 4, md: 8 }} py={6} maxW="680px">
        <VStack spacing={5} align="stretch">

          {/* Tax */}
          <SettingSection
            title="Tax & Self-Employment"
            description="Used to automatically reserve tax from income"
            icon={RiCalculatorLine}
            iconColor="#f59e0b"
          >
            <FormControl>
              <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1.5}>
                Effective Tax Rate (%)
              </FormLabel>
              <NumberInput
                value={form.tax_rate} min={0} max={65} step={1}
                onChange={val => updateForm(f => ({ ...f, tax_rate: Number(val) }))}
                maxW="200px"
              >
                <NumberInputField {...numInputProps} />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormHelperText fontSize="11px" color={muted} mt={1.5}>
                US freelancers: typically 25–30% (federal income + 15.3% self-employment tax)
              </FormHelperText>
            </FormControl>
            <FormControl mt={4}>
              <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1.5}>
                Tax Payment Schedule
              </FormLabel>
              <Select
                value={form.tax_schedule}
                onChange={e => updateForm(f => ({ ...f, tax_schedule: e.target.value as 'annual' | 'quarterly' }))}
                borderRadius="10px" h="42px" fontSize="14px" maxW="320px"
              >
                <option value="annual">Annual — one or two payments per year (UK self-assessment)</option>
                <option value="quarterly">Quarterly — four instalments per year (US, CA, AU, EU)</option>
              </Select>
              <FormHelperText fontSize="11px" color={muted} mt={1.5}>
                Used by the Tax Tracker page to show the right deadlines for your region.
              </FormHelperText>
            </FormControl>
          </SettingSection>

          {/* Buffer */}
          <SettingSection
            title="Emergency Buffer"
            description="Months of expenses kept as an untouchable safety net"
            icon={RiShieldLine}
            iconColor="#3b82f6"
          >
            <FormControl>
              <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1.5}>
                Buffer Months
              </FormLabel>
              <NumberInput
                value={form.emergency_buffer_months} min={0} max={24} step={1}
                onChange={val => updateForm(f => ({ ...f, emergency_buffer_months: Number(val) }))}
                maxW="200px"
              >
                <NumberInputField {...numInputProps} />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormHelperText fontSize="11px" color={muted} mt={1.5}>
                Recommendation: 3 months minimum, 6 months for income stability
              </FormHelperText>
            </FormControl>
          </SettingSection>

          {/* Balance & Currency */}
          <SettingSection
            title="Balance & Currency"
            description="Starting balance is used as the baseline for all calculations"
            icon={RiWalletLine}
            iconColor="#0d9488"
          >
            <SimpleGrid columns={2} spacing={4}>
              <FormControl>
                <HStack mb={1.5} spacing={1.5} align="center">
                  <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={0}>
                    Starting Balance
                  </FormLabel>
                  <Tooltip
                    label={
                      <Box fontSize="12px" lineHeight="1.6" maxW="220px" p={1}>
                        <Text fontWeight="700" mb={1}>How to set this correctly</Text>
                        <Text mb={1}>Use your <Text as="span" fontWeight="600">current account balance</Text>, minus any savings you don't want to touch — emergency fund, house deposit, etc.</Text>
                        <Text>Re-anchor it whenever a large payment lands or you want to sync back to reality.</Text>
                      </Box>
                    }
                    placement="top"
                    hasArrow
                    bg="#1C2B3A"
                    color="white"
                    borderRadius="8px"
                    px={3}
                    py={2}
                  >
                    <span>
                      <Icon as={RiInformationLine} color={muted} boxSize="14px" cursor="help" />
                    </span>
                  </Tooltip>
                </HStack>
                <NumberInput
                  value={form.starting_balance} min={0} step={100}
                  onChange={val => updateForm(f => ({ ...f, starting_balance: Number(val) }))}
                >
                  <NumberInputField {...numInputProps} />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <FormHelperText fontSize="11px" color={muted} mt={1.5}>
                  Current balance minus savings you don't want to spend. Update whenever a large payment lands.
                </FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1.5}>Currency</FormLabel>
                <Select
                  value={form.currency}
                  onChange={e => {
                    const newCurrency = e.target.value;
                    if (newCurrency !== settings?.currency && income.length > 0) {
                      toast({
                        title: 'Currency affects how amounts are displayed',
                        description: 'Your existing income entries will show the new currency symbol — the underlying amounts stay unchanged. Make sure your entries were recorded in the new currency.',
                        status: 'warning',
                        duration: 7000,
                        isClosable: true,
                      });
                    }
                    updateForm(f => ({ ...f, currency: newCurrency }));
                  }}
                  borderRadius="10px" h="42px" fontSize="14px"
                >
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                  <option value="AUD">AUD — Australian Dollar</option>
                </Select>
              </FormControl>
            </SimpleGrid>

            {/* Expected monthly income — full width below the 2-col grid */}
            <FormControl mt={4}>
              <HStack mb={1.5} spacing={1.5} align="center">
                <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={0}>
                  Expected Monthly Income
                </FormLabel>
                <Tooltip
                  label={
                    <Box fontSize="12px" lineHeight="1.6" maxW="220px" p={1}>
                      <Text fontWeight="700" mb={1}>Optional — acts as a floor</Text>
                      <Text mb={1}>Set this to your guaranteed retainer or minimum monthly income.</Text>
                      <Text>When your 6-month average dips below this amount (e.g. after a quiet patch), Spendable uses this value instead — keeping your runway and safe-to-spend realistic.</Text>
                    </Box>
                  }
                  placement="top" hasArrow bg="#1C2B3A" color="white" borderRadius="8px" px={3} py={2}
                >
                  <span>
                    <Icon as={RiInformationLine} color={muted} boxSize="14px" cursor="help" />
                  </span>
                </Tooltip>
              </HStack>
              <NumberInput
                value={form.expected_monthly_income} min={0} step={100}
                onChange={val => updateForm(f => ({ ...f, expected_monthly_income: Number(val) }))}
                maxW="240px"
              >
                <NumberInputField {...numInputProps} placeholder="0 — leave blank if variable" />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormHelperText fontSize="11px" color={muted} mt={1.5}>
                Set to your retainer or minimum monthly income. Leave at 0 if fully variable.
              </FormHelperText>
              {/* Floor status — only show when a floor is set */}
              {form.expected_monthly_income > 0 && metrics && (
                <Box mt={3} px={3} py={2.5} borderRadius="8px"
                  bg={metrics.smoothedMonthlyIncome <= form.expected_monthly_income ? '#eef0fb' : '#f0fdf4'}
                  border="1px solid"
                  borderColor={metrics.smoothedMonthlyIncome <= form.expected_monthly_income ? '#c7d0f5' : '#bbf7d0'}
                >
                  {metrics.smoothedMonthlyIncome <= form.expected_monthly_income ? (
                    <Text fontSize="12px" color="#4C5FD5" fontWeight="500">
                      ✓ Floor is <Text as="span" fontWeight="700">active</Text> — your 6-month average ({formatCurrency(metrics.smoothedMonthlyIncome, settings?.currency ?? 'USD')}/mo) is below your floor, so Spendable uses {formatCurrency(form.expected_monthly_income, settings?.currency ?? 'USD')}/mo instead.
                    </Text>
                  ) : (
                    <Text fontSize="12px" color="#166534" fontWeight="500">
                      Your 6-month average ({formatCurrency(metrics.smoothedMonthlyIncome, settings?.currency ?? 'USD')}/mo) is above your floor — the floor is not currently active.
                    </Text>
                  )}
                </Box>
              )}
            </FormControl>
          </SettingSection>

          {/* Info */}
          <Box bg="#f0f3ff" border="1px solid" borderColor="#c7d0f5" borderRadius="12px" p={4}>
            <HStack spacing={2.5} align="flex-start">
              <Icon as={RiInformationLine} color="#4C5FD5" boxSize="15px" mt={0.5} flexShrink={0} />
              <Text fontSize="12px" color={'#0f4940'} lineHeight="1.6" fontWeight="500">
                All calculations run client-side in real time. Your tax reserve is based on the
                last 12 months of recorded income. Update these settings whenever your financial
                situation changes.
              </Text>
            </HStack>
          </Box>

          <HStack spacing={4} align="center">
            <Button
              leftIcon={<Icon as={RiSave2Line} />}
              bg="#4C5FD5" color="white"
              borderRadius="10px" fontWeight="600" fontSize="13px"
              _hover={{ bg: '#3D4FBF' }}
              isLoading={saving}
              onClick={handleSave}
              alignSelf="flex-start"
              h="42px" px={6}
            >
              Save Settings
            </Button>
            {isDirty && (
              <Text fontSize="12px" color="#D4A800" fontWeight="600">
                Unsaved changes
              </Text>
            )}
          </HStack>

          {/* ── Data Export ── */}
          <SettingSection
            title="Export Data"
            description="Download your financial data as CSV files"
            icon={RiFileDownloadLine}
            iconColor="#8B5CF6"
          >
            <VStack spacing={3} align="stretch">
              {/* Full snapshot */}
              <HStack
                justify="space-between" align="center"
                p={4} borderRadius="10px"
                bg={PAGE_BG} border="1px solid #E8E8E3"
              >
                <Box>
                  <Text fontWeight="600" fontSize="13px" color="#1C2B3A" mb={0.5}>
                    Full Financial Snapshot
                  </Text>
                  <Text fontSize="12px" color="#5a6a7a">
                    All data in one file — dashboard summary, income, expenses, settings
                  </Text>
                </Box>
                <Button
                  leftIcon={<Icon as={RiDownload2Line} />}
                  size="sm" borderRadius="8px"
                  bg="#8B5CF6" color="white"
                  fontWeight="600" fontSize="12px"
                  _hover={{ bg: '#7C3AED' }}
                  flexShrink={0}
                  onClick={() => {
                    if (!canExportCsv) { onUpgradeOpen(); return; }
                    if (metrics && settings) {
                      exportFullSnapshotCsv({ income, expenses, upcoming, settings, metrics });
                    }
                  }}
                >
                  Download
                </Button>
              </HStack>

              {/* Income only */}
              <HStack
                justify="space-between" align="center"
                p={4} borderRadius="10px"
                bg={PAGE_BG} border="1px solid #E8E8E3"
              >
                <Box>
                  <Text fontWeight="600" fontSize="13px" color="#1C2B3A" mb={0.5}>
                    Income History
                  </Text>
                  <Text fontSize="12px" color="#5a6a7a">
                    {income.length} events with monthly breakdown summary
                  </Text>
                </Box>
                <Button
                  leftIcon={<Icon as={RiDownload2Line} />}
                  size="sm" borderRadius="8px"
                  variant="outline" borderColor="#E8E8E3"
                  bg="white" color="#5a6a7a"
                  fontWeight="600" fontSize="12px"
                  _hover={{ bg: '#F0EFE9' }}
                  flexShrink={0}
                  onClick={() => canExportCsv ? exportIncomeCsv(income, settings?.currency) : onUpgradeOpen()}
                >
                  Download
                </Button>
              </HStack>

              {/* Expenses only */}
              <HStack
                justify="space-between" align="center"
                p={4} borderRadius="10px"
                bg={PAGE_BG} border="1px solid #E8E8E3"
              >
                <Box>
                  <Text fontWeight="600" fontSize="13px" color="#1C2B3A" mb={0.5}>
                    Recurring Expenses
                  </Text>
                  <Text fontSize="12px" color="#5a6a7a">
                    {expenses.length} expenses with monthly equivalents
                  </Text>
                </Box>
                <Button
                  leftIcon={<Icon as={RiDownload2Line} />}
                  size="sm" borderRadius="8px"
                  variant="outline" borderColor="#E8E8E3"
                  bg="white" color="#5a6a7a"
                  fontWeight="600" fontSize="12px"
                  _hover={{ bg: '#F0EFE9' }}
                  flexShrink={0}
                  onClick={() => canExportCsv ? exportExpensesCsv(expenses, settings?.currency) : onUpgradeOpen()}
                >
                  Download
                </Button>
              </HStack>

              {/* Upcoming expenses */}
              <HStack
                justify="space-between" align="center"
                p={4} borderRadius="10px"
                bg={PAGE_BG} border="1px solid #E8E8E3"
              >
                <Box>
                  <Text fontWeight="600" fontSize="13px" color="#1C2B3A" mb={0.5}>
                    Upcoming Expenses
                  </Text>
                  <Text fontSize="12px" color="#5a6a7a">
                    {upcoming.length} one-off expense{upcoming.length !== 1 ? 's' : ''} with paid/unpaid status
                  </Text>
                </Box>
                <Button
                  leftIcon={<Icon as={RiDownload2Line} />}
                  size="sm" borderRadius="8px"
                  variant="outline" borderColor="#E8E8E3"
                  bg="white" color="#5a6a7a"
                  fontWeight="600" fontSize="12px"
                  _hover={{ bg: '#F0EFE9' }}
                  flexShrink={0}
                  onClick={() => canExportCsv ? exportUpcomingCsv(upcoming, settings?.currency) : onUpgradeOpen()}
                >
                  Download
                </Button>
              </HStack>
            </VStack>
          </SettingSection>

          {/* Subscription */}
          <SettingSection
            title="Subscription"
            description="Manage your Spendable plan"
            icon={RiFlashlightLine}
            iconColor="#4C5FD5"
          >
            <SubscriptionCard
              subscription={subscription}
              isPro={isPro}
              isInGracePeriod={isInGracePeriod}
              graceDaysRemaining={graceDaysRemaining}
              canExportCsv={canExportCsv}
              totalIncomeCount={totalIncomeCount}
              expenseCount={expenses.length}
              upcomingCount={upcoming.filter(e => !e.is_paid).length}
              userCurrency={settings?.currency}
              onExport={() => {
                if (metrics && settings) {
                  exportFullSnapshotCsv({ income, expenses, upcoming, settings, metrics });
                }
              }}
            />
          </SettingSection>

          <UpgradeModal isOpen={isUpgradeOpen} onClose={onUpgradeClose} reason="csv_export" userCurrency={settings?.currency} />

          {/* ── Share ───────────────────────────────────────────────────── */}
          <ShareSpendableCard />

          {/* ── Danger Zone ─────────────────────────────────────────────── */}
          <Box
            p={5} borderRadius="12px"
            border="1px solid #fecaca" bg="#fff5f5"
          >
            <HStack spacing={3} mb={4}>
              <Box w={9} h={9} borderRadius="10px" bg="#fef2f2" border="1px solid #fecaca"
                display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                <Icon as={RiAlertLine} color="#DC2626" boxSize="16px" />
              </Box>
              <Box>
                <Text fontWeight="600" fontSize="14px" color="#991b1b">Danger Zone</Text>
                <Text fontSize="12px" color="#b91c1c">Irreversible actions — proceed with caution</Text>
              </Box>
            </HStack>
            <HStack justify="space-between" align="center">
              <Box>
                <Text fontWeight="600" fontSize="13px" color="#991b1b" mb={0.5}>Delete my account</Text>
                <Text fontSize="12px" color="#b91c1c" maxW="360px">
                  Permanently deletes your account and all associated data including income, expenses, and settings. This cannot be undone.
                </Text>
              </Box>
              <Button
                leftIcon={<Icon as={RiUserUnfollowLine} />}
                size="sm" borderRadius="8px"
                bg="white" color="#DC2626"
                border="1px solid #fecaca"
                fontWeight="600" fontSize="12px"
                _hover={{ bg: '#fef2f2' }}
                flexShrink={0}
                onClick={onDeleteOpen}
              >
                Delete Account
              </Button>
            </HStack>
          </Box>

          {/* ── Account deletion confirmation modal ─────────────────────── */}
          <Modal isOpen={isDeleteOpen} onClose={() => { onDeleteClose(); setDeleteConfirm(''); }} size="md">
            <ModalOverlay bg="blackAlpha.200" backdropFilter="blur(6px)" />
            <ModalContent borderRadius="16px" border="1px solid #fecaca">
              <ModalHeader fontWeight="700" fontSize="16px" color="#991b1b" pb={2}>
                Delete account
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <Alert status="error" borderRadius="10px" mb={4} fontSize="13px">
                  <AlertIcon />
                  This will permanently delete all your data. This action cannot be undone.
                </Alert>
                <Text fontSize="13px" color="#5a6a7a" mb={3}>
                  Type <strong>DELETE</strong> to confirm:
                </Text>
                <ChakraInput
                  placeholder="DELETE"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  borderRadius="8px" h="42px" fontSize="14px"
                  borderColor={deleteConfirm === 'DELETE' ? '#DC2626' : '#e2e8f0'}
                  _focus={{ borderColor: '#DC2626', boxShadow: '0 0 0 1px #DC2626' }}
                />
              </ModalBody>
              <ModalFooter gap={2}>
                <Button variant="ghost" borderRadius="8px" fontWeight="600" fontSize="13px"
                  onClick={() => { onDeleteClose(); setDeleteConfirm(''); }}>
                  Cancel
                </Button>
                <Button
                  bg="#DC2626" color="white" borderRadius="8px"
                  fontWeight="600" fontSize="13px" _hover={{ bg: '#b91c1c' }}
                  isDisabled={deleteConfirm !== 'DELETE'}
                  isLoading={deleting}
                  leftIcon={<Icon as={RiUserUnfollowLine} />}
                  onClick={handleDeleteAccount}
                >
                  Delete my account
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* Offline mock data reset — only shown in mock mode */}
          {IS_MOCK && (
            <Box
              p={5} borderRadius="12px"
              border="1px solid #fde68a"
              bg="#fef9c3"
            >
              <HStack justify="space-between" align="center">
                <Box>
                  <Text fontWeight="600" fontSize="13px" color="#92400e" mb={0.5}>
                    Reset mock data
                  </Text>
                  <Text fontSize="12px" color="#b45309">
                    Wipes all offline data and restores the seed dataset. Useful when testing.
                  </Text>
                </Box>
                <Button
                  leftIcon={<Icon as={RiDeleteBin2Line} />}
                  size="sm" borderRadius="8px"
                  bg="white" color="#b45309"
                  border="1px solid #fde68a"
                  fontWeight="600" fontSize="12px"
                  _hover={{ bg: '#fef3c7' }}
                  flexShrink={0}
                  onClick={() => {
                    resetMockStore();
                    window.location.reload();
                  }}
                >
                  Reset
                </Button>
              </HStack>
            </Box>
          )}
        </VStack>

        {/* Legal links */}
        <HStack justify="center" spacing={4} pt={2} pb={8}>
          <RouterLink to="/terms">
            <Text fontSize="12px" color="#94a3b8" _hover={{ color: '#4C5FD5' }} transition="color 0.15s" fontWeight="500">
              Terms of Service
            </Text>
          </RouterLink>
          <Text fontSize="12px" color="#e2e8f0">·</Text>
          <RouterLink to="/privacy">
            <Text fontSize="12px" color="#94a3b8" _hover={{ color: '#4C5FD5' }} transition="color 0.15s" fontWeight="500">
              Privacy Policy
            </Text>
          </RouterLink>
        </HStack>
      </Box>
    </Box>
      </Box>
      </Box>
  );
}
