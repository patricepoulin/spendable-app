import { useState, useRef, useEffect } from 'react';
import {
  Box, Button, VStack, HStack, Text, Icon, Spinner,
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  FormControl, FormLabel, Input, Textarea, Select,
  useDisclosure, useToast,
  Alert, AlertIcon,
  Tabs, TabList, Tab, TabPanels, TabPanel,
  Badge, Progress, SimpleGrid, IconButton,
} from '@chakra-ui/react';
import { RiAddLine, RiDownload2Line, RiArrowDownSLine, RiUpload2Line, RiDeleteBin2Line, RiCheckboxLine, RiCloseLine, RiPieChartLine } from 'react-icons/ri';
import { CsvImportModal } from '../components/income/CsvImportModal';
import { UpgradeModal } from '../components/subscription/UpgradeModal';
import { useSubscription } from '../hooks/useSubscription';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useIncomeByYear } from '../hooks/useIncomeByYear';
import { incomeApi, IS_MOCK } from '../lib/supabase';
import { PageHeader } from '../components/ui/PageHeader';
import { IncomeYearGroup } from '../components/income/IncomeYearGroup';
import { useFinancials } from '../hooks/useFinancials';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSearchParams } from 'react-router-dom';
import { formatCurrency } from '../utils/calculations';
import { exportIncomeCsv } from '../utils/exportCsv';
import { buildIncomeTimeline } from '../utils/incomeMonths';
import type { IncomeEvent } from '../types';
import { PAGE_BG } from '../theme';

const INCOME_SOURCES = [
  'Client Project', 'Freelance Contract', 'Consulting',
  'Product Sale', 'Subscription', 'Royalty', 'Invoice', 'Other',
];

const EMPTY_FORM = {
  amount: '',
  date:   new Date().toISOString().split('T')[0],
  source: 'Client Project',
  notes:  '',
};

export function IncomePage() {
  usePageTitle('Income');
  const { user }                  = useAuth();
  const { settings }              = useFinancials();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast    = useToast();
  const currency = settings?.currency ?? 'USD';
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open add modal when navigated here with ?add=true
  // (e.g. from the stale income warning CTA on the dashboard)
  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      onOpen();
      // Remove the query param so refreshing the page doesn't re-open the modal
      setSearchParams({}, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isOnline = useOnlineStatus();
  const {
    allLoadedIncome, years, availableYears,
    loadYear, refresh, initialLoading,
  } = useIncomeByYear();

  const { isPro, isAtIncomeLimit, canExportCsv } = useSubscription(allLoadedIncome);
  const { isOpen: isUpgradeOpen, onOpen: onUpgradeOpen, onClose: onUpgradeClose } = useDisclosure();
  const { isOpen: isCsvOpen, onOpen: onCsvOpen, onClose: onCsvClose } = useDisclosure();

  const [form, setForm]             = useState(EMPTY_FORM);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);

  const [editing, setEditing]       = useState<IncomeEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Bulk delete state ──────────────────────────────────────────────────────
  const [bulkMode, setBulkMode]       = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { isOpen: isBulkDeleteOpen, onOpen: onBulkDeleteOpen, onClose: onBulkDeleteClose } = useDisclosure();
  const bulkDeleteRef = useRef<HTMLButtonElement>(null);

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const toggleBulkMode = () => {
    setBulkMode(v => !v);
    setSelectedIds(new Set());
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all([...selectedIds].map(id => incomeApi.delete(id)));
      toast({ title: `${selectedIds.size} entries removed`, status: 'info', duration: 2500, isClosable: true });
      setSelectedIds(new Set());
      setBulkMode(false);
      await refresh();
    } catch {
      toast({ title: 'Failed to delete some entries', status: 'error', duration: 3000, isClosable: true });
    } finally {
      onBulkDeleteClose();
    }
  };

  // ── All-time source totals (for By Source tab) ─────────────────────────────
  const [allTimeSources, setAllTimeSources] = useState<Array<{ source: string; total: number; count: number }> | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  const fetchAllTimeSources = async () => {
    if (!user) return;
    setSourcesLoading(true);
    try {
      const data = await incomeApi.listSourceTotals(user.id);
      setAllTimeSources(data);
    } catch {
      // fall back to loaded-only data silently
    } finally {
      setSourcesLoading(false);
    }
  };

  // ── Auto-log recurring income ─────────────────────────────────────────────
  const currentMonthKey = new Date().toISOString().slice(0, 7); // "2026-04"
  const autoLogStorageKey = `spendable_autolog_skipped_${currentMonthKey}`;

  // Persist dismissal per-month in localStorage so "Skip this month" survives
  // navigation and page reloads for the rest of the calendar month.
  const [autoLogDismissed, setAutoLogDismissed] = useState(() => {
    try { return localStorage.getItem(autoLogStorageKey) === 'true'; } catch { return false; }
  });
  const [autoLogging, setAutoLogging] = useState(false);

  const dismissAutoLog = () => {
    setAutoLogDismissed(true);
    try { localStorage.setItem(autoLogStorageKey, 'true'); } catch { /* ignore */ }
  };

  const hasLoggedThisMonth = allLoadedIncome.some(e => e.date.startsWith(currentMonthKey));
  const expectedIncome = settings?.expected_monthly_income ?? 0;
  const showAutoLogPrompt =
    !autoLogDismissed &&
    expectedIncome > 0 &&
    !hasLoggedThisMonth &&
    allLoadedIncome.length > 0 &&
    !initialLoading;

  const handleAutoLog = async () => {
    if (!user || !expectedIncome) return;
    setAutoLogging(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await incomeApi.create(user.id, {
        amount: expectedIncome,
        date: today,
        source: 'Retainer',
        notes: `Auto-logged from Expected Monthly Income (${currentMonthKey})`,
      });
      toast({ title: 'Retainer income logged', status: 'success', duration: 2500, isClosable: true });
      dismissAutoLog();
      await refresh();
    } catch {
      toast({ title: 'Failed to log income', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setAutoLogging(false);
    }
  };

  const muted  = '#64748b';
  const border = '#e2e8f0';

  const totalIncome    = allLoadedIncome.reduce((s, e) => s + e.amount, 0);
  const hasAnyIncome   = availableYears.length > 0;

  // Years not yet loaded — shown as "Load YYYY" buttons
  const unloadedYears = availableYears.filter(
    y => !years.find(s => s.year === y && s.loaded)
  );

  // Build timeline only from loaded year states
  const loadedYearStates = years.filter(s => s.loaded);
  const timeline = buildIncomeTimeline(
    loadedYearStates.flatMap(s => s.entries)
  );

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const openAdd = () => {
    if (!IS_MOCK && isAtIncomeLimit) { onUpgradeOpen(); return; }
    setEditing(null);
    setForm(EMPTY_FORM);
    onOpen();
  };

  const openEdit = (event: IncomeEvent) => {
    setEditing(event);
    setForm({
      amount: String(event.amount),
      date:   event.date,
      source: event.source,
      notes:  event.notes ?? '',
    });
    onOpen();
  };

  const handleClose = () => { onClose(); setEditing(null); setForm(EMPTY_FORM); };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!user || !form.amount || !form.date || !form.source) return;
    setSubmitting(true);
    try {
      const payload = {
        amount: parseFloat(form.amount),
        date:   form.date,
        source: form.source,
        notes:  form.notes || undefined,
      };
      if (editing) {
        await incomeApi.update(editing.id, payload);
        toast({ title: 'Income updated', status: 'success', duration: 2000, isClosable: true });
      } else {
        await incomeApi.create(user.id, payload);
        toast({ title: 'Income added', status: 'success', duration: 2000, isClosable: true });
      }
      handleClose();
      await refresh();
    } catch (err) {
      toast({
        title: `Failed to ${editing ? 'update' : 'add'} income`,
        description: err instanceof Error ? err.message : String(err),
        status: 'error', duration: 5000, isClosable: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setPendingDeleteId(id);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await incomeApi.delete(pendingDeleteId);
      toast({ title: 'Income removed', status: 'info', duration: 2000, isClosable: true });
      await refresh();
    } catch {
      toast({ title: 'Failed to delete', status: 'error', duration: 3000, isClosable: true });
    } finally {
      onDeleteClose();
      setPendingDeleteId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box>
      <Box position="relative" overflow="hidden" bg={PAGE_BG} minH="100vh">
        {/* Blobs */}
        <Box position="absolute" top="-120px" right="-120px" w="520px" h="520px" borderRadius="full"
          bg="radial-gradient(circle, rgba(76,95,213,0.07) 0%, transparent 70%)" pointerEvents="none" />
        <Box position="absolute" bottom="-80px" left="-80px" w="420px" h="420px" borderRadius="full"
          bg="radial-gradient(circle, rgba(39,174,96,0.05) 0%, transparent 70%)" pointerEvents="none" />

        <Box position="relative">
          <PageHeader
            title="Income"
            subtitle={
              initialLoading
                ? 'Loading…'
                : allLoadedIncome.length === 0
                ? 'No income recorded yet'
                : `${allLoadedIncome.length} event${allLoadedIncome.length !== 1 ? 's' : ''} · Total ${formatCurrency(totalIncome, currency)}`
            }
            action={
              <HStack spacing={2}>
                <Button
                  leftIcon={<Icon as={RiDownload2Line} />}
                  variant="outline" borderColor="#E8E8E3"
                  bg="white" color="#5a6a7a"
                  h="32px" px={3}
                  borderRadius="10px" fontWeight="600" fontSize="13px"
                  _hover={{ bg: '#F0EFE9' }}
                  isDisabled={allLoadedIncome.length === 0}
                  onClick={() => canExportCsv ? exportIncomeCsv(allLoadedIncome, currency) : onUpgradeOpen()}
                >
                  Export CSV
                </Button>
                <Button
                  leftIcon={<Icon as={RiUpload2Line} />}
                  variant="outline" borderColor="#E8E8E3"
                  bg="white" color="#5a6a7a"
                  h="32px" px={3}
                  borderRadius="10px" fontWeight="600" fontSize="13px"
                  _hover={{ bg: '#F0EFE9' }}
                  isDisabled={!isOnline}
                  onClick={onCsvOpen}
                >
                  Import CSV
                </Button>
                <Button
                  leftIcon={<Icon as={bulkMode ? RiCloseLine : RiCheckboxLine} />}
                  variant="outline" borderColor={bulkMode ? '#4C5FD5' : '#E8E8E3'}
                  bg={bulkMode ? '#eef0fb' : 'white'}
                  color={bulkMode ? '#4C5FD5' : '#5a6a7a'}
                  h="32px" px={3}
                  borderRadius="10px" fontWeight="600" fontSize="13px"
                  _hover={{ bg: bulkMode ? '#e4e8fa' : '#F0EFE9' }}
                  isDisabled={allLoadedIncome.length === 0}
                  onClick={toggleBulkMode}
                >
                  {bulkMode ? 'Cancel' : 'Select'}
                </Button>
                <Button
                  leftIcon={<Icon as={RiAddLine} />}
                  bg="#4C5FD5" color="white"
                  h="32px" px={3}
                  borderRadius="10px" fontWeight="600" fontSize="13px"
                  _hover={{ bg: '#3D4FBF' }}
                  isDisabled={!isOnline}
                  onClick={openAdd}
                >
                  Add Income
                </Button>
              </HStack>
            }
          />

          <Box px={{ base: 4, md: 8 }} py={6}>

            {/* Initial loading spinner */}
            {initialLoading ? (
              <Box display="flex" justifyContent="center" py={16}>
                <Spinner color="#4C5FD5" size="lg" />
              </Box>

            ) : !hasAnyIncome ? (
              /* ── Global empty state ── */
              <Box bg="white" border="1px solid #E8E8E3" borderRadius="14px" p={12} textAlign="center">
                {/* Income empty state illustration */}
                <Box
                  w="72px" h="72px" mx="auto" mb={4}
                  borderRadius="20px"
                  bg="linear-gradient(135deg, #eef0fb 0%, #e4e8fa 100%)"
                  border="1px solid #d0d6f5"
                  display="flex" alignItems="center" justifyContent="center"
                  position="relative"
                >
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Coin stack */}
                    <ellipse cx="18" cy="27" rx="10" ry="3.5" fill="#c7d0f5" />
                    <rect x="8" y="20" width="20" height="7" rx="2" fill="#4C5FD5" opacity="0.15" />
                    <ellipse cx="18" cy="20" rx="10" ry="3.5" fill="#a5b0ef" />
                    <rect x="8" y="13" width="20" height="7" rx="2" fill="#4C5FD5" opacity="0.2" />
                    <ellipse cx="18" cy="13" rx="10" ry="3.5" fill="#7b8fe8" />
                    {/* Plus icon — call to action */}
                    <circle cx="28" cy="9" r="6" fill="#4C5FD5" />
                    <path d="M28 6.5V11.5M25.5 9H30.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </Box>
                <Text fontSize="15px" fontWeight="600" color="#1C2B3A" mb={2}>No income recorded yet</Text>
                <Text fontSize="13px" color="#5a6a7a" mb={5} maxW="300px" mx="auto">
                  Add your first payment to start tracking your financial timeline.
                </Text>
                <Button
                  leftIcon={<Icon as={RiAddLine} />}
                  bg="#4C5FD5" color="white" borderRadius="10px" fontWeight="600" fontSize="13px"
                  _hover={{ bg: '#3D4FBF' }} isDisabled={!isOnline} onClick={openAdd}
                >
                  Add Income
                </Button>
              </Box>

            ) : (
              <>
              {/* Auto-log retainer prompt */}
              {showAutoLogPrompt && (
                <Box bg="white" border="1px solid #c7d0f5" borderRadius="12px" p={4} mb={4}>
                  <HStack align="flex-start" spacing={3}>
                    <Box w={8} h={8} borderRadius="8px" bg="#eef0fb" border="1px solid #c7d0f5"
                      display="flex" alignItems="center" justifyContent="center" flexShrink={0} mt={0.5}>
                      <Icon as={RiAddLine} color="#4C5FD5" boxSize="14px" />
                    </Box>
                    <Box flex={1}>
                      <Text fontSize="13px" fontWeight="700" color="#1C2B3A" mb={0.5}>
                        Log your retainer for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}?
                      </Text>
                      <Text fontSize="12px" color="#5a6a7a" mb={3}>
                        No income recorded this month yet. Log your expected{' '}
                        <Text as="span" fontWeight="600">{formatCurrency(expectedIncome, currency)}</Text> retainer automatically?
                      </Text>
                      <HStack spacing={2}>
                        <Button size="xs" bg="#4C5FD5" color="white" borderRadius="6px"
                          fontWeight="600" fontSize="11px" h="26px" px={3}
                          isLoading={autoLogging}
                          _hover={{ bg: '#3D4FBF' }}
                          onClick={handleAutoLog}>
                          Log {formatCurrency(expectedIncome, currency)} now
                        </Button>
                        <Button size="xs" variant="ghost" color="#8a9aaa" borderRadius="6px"
                          fontWeight="600" fontSize="11px" h="26px" px={2}
                          _hover={{ color: '#5a6a7a' }}
                          onClick={dismissAutoLog}>
                          Skip this month
                        </Button>
                      </HStack>
                    </Box>
                    <IconButton aria-label="Dismiss" icon={<Icon as={RiCloseLine} boxSize="14px" />}
                      size="xs" variant="ghost" color="#8a9aaa" borderRadius="6px"
                      _hover={{ color: '#5a6a7a' }}
                      onClick={dismissAutoLog} />
                  </HStack>
                </Box>
              )}

              <Tabs colorScheme="brand" variant="soft-rounded" size="sm"
                onChange={(idx) => {
                  setBulkMode(false);
                  setSelectedIds(new Set());
                  if (idx === 1 && allTimeSources === null) fetchAllTimeSources();
                }}>
                <HStack justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
                  <TabList bg="white" border="1px solid #e2e8f0" borderRadius="10px" p={1}>
                    <Tab fontWeight="600" fontSize="13px" borderRadius="8px" px={4} h="30px"
                      _selected={{ bg: '#4C5FD5', color: 'white' }} color="#5a6a7a">
                      <Icon as={RiArrowDownSLine} mr={1.5} boxSize="14px" />Timeline
                    </Tab>
                    <Tab fontWeight="600" fontSize="13px" borderRadius="8px" px={4} h="30px"
                      _selected={{ bg: '#4C5FD5', color: 'white' }} color="#5a6a7a">
                      <Icon as={RiPieChartLine} mr={1.5} boxSize="14px" />By Source
                    </Tab>
                  </TabList>

                  {/* Bulk delete toolbar — only visible when bulkMode is on */}
                  {bulkMode && selectedIds.size > 0 && (
                    <HStack spacing={2} px={3} py={1.5} bg="#fff1f2" border="1px solid #fecdd3"
                      borderRadius="8px">
                      <Text fontSize="12px" fontWeight="600" color="#9f1239">
                        {selectedIds.size} selected
                      </Text>
                      <Button
                        size="xs" bg="#e11d48" color="white" borderRadius="6px"
                        fontWeight="700" fontSize="11px" h="24px"
                        leftIcon={<Icon as={RiDeleteBin2Line} boxSize="11px" />}
                        _hover={{ bg: '#be123c' }}
                        onClick={onBulkDeleteOpen}
                      >
                        Delete selected
                      </Button>
                    </HStack>
                  )}
                </HStack>

                <TabPanels>
                  {/* ── Timeline tab ── */}
                  <TabPanel p={0}>
                    <VStack spacing={5} align="stretch">
                      {timeline.map(year => (
                        <IncomeYearGroup
                          key={year.year}
                          year={year}
                          currency={currency}
                          onAdd={openAdd}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          selectedIds={selectedIds}
                          onSelect={handleSelect}
                          bulkMode={bulkMode}
                        />
                      ))}

                      {years.filter(s => s.loading).map(s => (
                        <Box key={s.year}>
                          <HStack px={1} pb={2}>
                            <Text fontSize="13px" fontWeight="700" color="#1C2B3A">{s.year}</Text>
                            <Spinner size="xs" color="#4C5FD5" ml={2} />
                          </HStack>
                          <Box bg="white" border="1px solid #e2e8f0" borderRadius="14px" p={8}
                            display="flex" justifyContent="center">
                            <Spinner color="#4C5FD5" />
                          </Box>
                        </Box>
                      ))}

                      {unloadedYears.length > 0 && (
                        <VStack spacing={2} align="stretch">
                          {unloadedYears.map(year => (
                            <Button
                              key={year}
                              leftIcon={<Icon as={RiArrowDownSLine} />}
                              variant="outline" borderColor="#E8E8E3"
                              bg="white" color="#5a6a7a"
                              size="sm" borderRadius="10px"
                              fontWeight="600" fontSize="13px"
                              _hover={{ bg: '#f8fafc', borderColor: '#4C5FD5', color: '#4C5FD5' }}
                              onClick={() => loadYear(year)}
                            >
                              Load {year}
                            </Button>
                          ))}
                        </VStack>
                      )}
                    </VStack>
                  </TabPanel>

                  {/* ── By Source tab ── */}
                  <TabPanel p={0}>
                    {(() => {
                      // Use all-time source totals if fetched, otherwise fall back to loaded years
                      const sourceData = allTimeSources ?? (() => {
                        const map: Record<string, { total: number; count: number }> = {};
                        allLoadedIncome.forEach(e => {
                          if (!map[e.source]) map[e.source] = { total: 0, count: 0 };
                          map[e.source].total += e.amount;
                          map[e.source].count += 1;
                        });
                        return Object.entries(map).map(([source, d]) => ({ source, ...d }));
                      })();
                      const sorted = [...sourceData].sort((a, b) => b.total - a.total);
                      const grandTotal = sorted.reduce((s, d) => s + d.total, 0);
                      const entryCount = sorted.reduce((s, d) => s + d.count, 0);

                      return (
                        <VStack spacing={3} align="stretch">
                          {/* Summary card */}
                          <Box bg="white" border="1px solid #e2e8f0" borderRadius="14px" p={5}>
                            <HStack justify="space-between" mb={4}>
                              <Text fontSize="12px" fontWeight="700" color="#8a9aaa"
                                textTransform="uppercase" letterSpacing="0.5px">
                                Income by Client / Source
                              </Text>
                              {sourcesLoading && <Spinner size="xs" color="#4C5FD5" />}
                              {allTimeSources !== null && !sourcesLoading && (
                                <Text fontSize="11px" color="#27AE60" fontWeight="600">All-time</Text>
                              )}
                            </HStack>
                            <VStack spacing={3} align="stretch">
                              {sorted.map((data) => {
                                const source = data.source;
                                const pct = grandTotal > 0 ? (data.total / grandTotal) * 100 : 0;
                                return (
                                  <Box key={source}>
                                    <HStack justify="space-between" mb={1}>
                                      <HStack spacing={2}>
                                        <Text fontSize="13px" fontWeight="600" color="#1C2B3A">
                                          {source}
                                        </Text>
                                        <Badge fontSize="10px" colorScheme="gray" borderRadius="4px"
                                          fontWeight="600">
                                          {data.count} {data.count === 1 ? 'entry' : 'entries'}
                                        </Badge>
                                      </HStack>
                                      <HStack spacing={3}>
                                        <Text fontSize="11px" color="#8a9aaa" fontWeight="500">
                                          {pct.toFixed(1)}%
                                        </Text>
                                        <Text fontSize="13px" fontWeight="700" color="#27AE60">
                                          {new Intl.NumberFormat('en-US', {
                                            style: 'currency', currency,
                                            maximumFractionDigits: 0,
                                          }).format(data.total)}
                                        </Text>
                                      </HStack>
                                    </HStack>
                                    <Progress
                                      value={pct} size="xs" borderRadius="full"
                                      bg="#e2e8f0"
                                      sx={{ '& > div': { background: '#4C5FD5' } }}
                                    />
                                  </Box>
                                );
                              })}
                            </VStack>
                          </Box>

                          {/* Grand total */}
                          <Box bg="white" border="1px solid #e2e8f0" borderRadius="12px" px={5} py={3}>
                            <HStack justify="space-between">
                              <Text fontSize="13px" color="#5a6a7a" fontWeight="500">
                                Total across all sources ({entryCount} entries{allTimeSources === null && unloadedYears.length > 0 ? ', loaded years only' : ''})
                              </Text>
                              <Text fontSize="14px" fontWeight="800" color="#27AE60">
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency', currency, maximumFractionDigits: 0,
                                }).format(grandTotal)}
                              </Text>
                            </HStack>
                          </Box>
                        </VStack>
                      );
                    })()}
                  </TabPanel>
                </TabPanels>
              </Tabs>
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Bulk delete confirmation ── */}
      <AlertDialog isOpen={isBulkDeleteOpen} leastDestructiveRef={bulkDeleteRef} onClose={onBulkDeleteClose} isCentered>
        <AlertDialogOverlay bg="blackAlpha.200" backdropFilter="blur(4px)" />
        <AlertDialogContent borderRadius="14px" border="1px solid #fecaca" mx={4}>
          <AlertDialogHeader fontWeight="700" fontSize="15px" color="#991b1b" pb={2}>
            Delete {selectedIds.size} {selectedIds.size === 1 ? 'entry' : 'entries'}?
          </AlertDialogHeader>
          <AlertDialogBody fontSize="13px" color="#5a6a7a">
            This will permanently remove the selected income entries and update all your financial metrics. This cannot be undone.
          </AlertDialogBody>
          <AlertDialogFooter gap={2}>
            <Button ref={bulkDeleteRef} variant="ghost" borderRadius="8px" fontWeight="600" fontSize="13px"
              onClick={onBulkDeleteClose}>
              Cancel
            </Button>
            <Button bg="#DC2626" color="white" borderRadius="8px" fontWeight="600" fontSize="13px"
              _hover={{ bg: '#b91c1c' }} onClick={confirmBulkDelete}>
              Delete {selectedIds.size} {selectedIds.size === 1 ? 'entry' : 'entries'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── CSV Import Modal ── */}
      <CsvImportModal
        isOpen={isCsvOpen}
        onClose={onCsvClose}
        onImportComplete={async () => { onCsvClose(); await refresh(); }}
        isPro={isPro}
        onUpgradeNeeded={() => { onCsvClose(); onUpgradeOpen(); }}
      />

      {/* ── Upgrade Modal ── */}
      <UpgradeModal isOpen={isUpgradeOpen} onClose={onUpgradeClose} reason="income_limit" userCurrency={currency} />

      {/* ── Delete confirmation ── */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={deleteRef} onClose={onDeleteClose} isCentered>
        <AlertDialogOverlay bg="blackAlpha.200" backdropFilter="blur(4px)" />
        <AlertDialogContent borderRadius="14px" border="1px solid #fecaca" mx={4}>
          <AlertDialogHeader fontWeight="700" fontSize="15px" color="#991b1b" pb={2}>
            Remove income entry?
          </AlertDialogHeader>
          <AlertDialogBody fontSize="13px" color="#5a6a7a">
            This will permanently remove this income entry and update all your financial metrics.
          </AlertDialogBody>
          <AlertDialogFooter gap={2}>
            <Button ref={deleteRef} variant="ghost" borderRadius="8px" fontWeight="600" fontSize="13px"
              onClick={onDeleteClose}>
              Cancel
            </Button>
            <Button bg="#DC2626" color="white" borderRadius="8px" fontWeight="600" fontSize="13px"
              _hover={{ bg: '#b91c1c' }} onClick={confirmDelete}>
              Remove
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Add / Edit Modal ── */}
      <Modal isOpen={isOpen} onClose={handleClose} size="md">
        <ModalOverlay bg="blackAlpha.200" backdropFilter="blur(6px)" />
        <ModalContent borderRadius="16px" border="1px solid" borderColor={border} shadow="xl">
          <ModalHeader fontWeight="700" fontSize="16px" pb={2}>
            {editing ? 'Edit Income' : 'Record Income'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1}>Amount</FormLabel>
                <Input
                  type="number" placeholder="0.00"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  borderRadius="10px" h="42px" fontSize="14px"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1}>Date</FormLabel>
                <Input
                  type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  borderRadius="10px" h="42px" fontSize="14px"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1}>Source</FormLabel>
                <Select
                  value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  borderRadius="10px" h="42px" fontSize="14px"
                >
                  {INCOME_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1}>Notes</FormLabel>
                <Textarea
                  placeholder="Client, project, or invoice details..."
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  borderRadius="10px" resize="none" rows={2} fontSize="14px"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={handleClose} borderRadius="10px" fontWeight="600" fontSize="13px">
              Cancel
            </Button>
            <Button
              bg="#4C5FD5" color="white" borderRadius="10px"
              fontWeight="600" fontSize="13px" _hover={{ bg: '#3D4FBF' }}
              isLoading={submitting} onClick={handleSubmit}
            >
              {editing ? 'Save Changes' : 'Record Income'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
