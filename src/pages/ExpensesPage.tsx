import { useState, useRef } from 'react';
import {
  Box, Button, VStack, HStack, Text, Icon,
  Table, Thead, Tbody, Tr, Th, Td,
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  FormControl, FormLabel, Input, Select,
  useDisclosure, useToast,
  IconButton, Alert, AlertIcon, Badge, Switch,
  Menu, MenuButton, MenuList, MenuItem,
} from '@chakra-ui/react';
import { RiAddLine, RiDeleteBin2Line, RiDownload2Line, RiEditLine, RiMoreLine } from 'react-icons/ri';
import { PageHeader } from '../components/ui/PageHeader';
import { useFinancials } from '../hooks/useFinancials';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePageTitle } from '../hooks/usePageTitle';
import { UpgradeModal } from '../components/subscription/UpgradeModal';
import { expensesApi } from '../lib/supabase';
import { formatCurrency, toMonthlyAmount } from '../utils/calculations';
import { exportExpensesCsv } from '../utils/exportCsv';
import type { RecurringExpense, ExpenseFrequency, ExpenseCategory } from '../types';
import { PAGE_BG } from '../theme';

const FREQ_LABELS: Record<ExpenseFrequency, string> = {
  weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually',
};

const CATEGORY_LABELS: Record<ExpenseCategory, { label: string; color: string }> = {
  housing:       { label: 'Housing',       color: '#3b82f6' },
  transport:     { label: 'Transport',     color: '#8b5cf6' },
  food:          { label: 'Food',          color: '#f59e0b' },
  health:        { label: 'Health',        color: '#10b981' },
  software:      { label: 'Software',      color: '#6366f1' },
  insurance:     { label: 'Insurance',     color: '#0ea5e9' },
  entertainment: { label: 'Entertainment', color: '#ec4899' },
  other:         { label: 'Other',         color: '#94a3b8' },
};

const EMPTY_FORM = {
  name: '', amount: '',
  frequency: 'monthly' as ExpenseFrequency,
  category: 'other' as ExpenseCategory,
};

export function ExpensesPage() {
  usePageTitle('Expenses');
  const { user } = useAuth();
  const { expenses, settings, refresh } = useFinancials();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast    = useToast();
  const currency = settings?.currency ?? 'USD';

  const isOnline = useOnlineStatus();
  const { isPro, canExportCsv, isAtExpenseLimit, freeExpenseLimit } = useSubscription([], expenses.length);
  const { isOpen: isUpgradeOpen, onOpen: onUpgradeOpen, onClose: onUpgradeClose } = useDisclosure();

  const [form, setForm]           = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const surface  = '#ffffff';
  const border   = '#e2e8f0';
  const theadBg  = '#f8fafc';
  const rowHover = '#f8fafc';
  const muted    = '#64748b';
  const subtext  = '#94a3b8';

  const totalMonthly = expenses
    .filter(e => e.is_active)
    .reduce((sum, e) => sum + toMonthlyAmount(e.amount, e.frequency), 0);

  // ── Open modal for adding ──────────────────────────────────────────────────
  const handleOpenAdd = () => {
    if (isAtExpenseLimit) { onUpgradeOpen(); return; }
    setEditingId(null);
    setForm(EMPTY_FORM);
    onOpen();
  };

  // ── Open modal pre-filled for editing ─────────────────────────────────────
  const handleOpenEdit = (exp: RecurringExpense) => {
    setEditingId(exp.id);
    setForm({
      name:      exp.name,
      amount:    String(exp.amount),
      frequency: exp.frequency,
      category:  exp.category,
    });
    onOpen();
  };

  // ── Submit: create or update ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!user || !form.name || !form.amount) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await expensesApi.update(editingId, {
          name:      form.name,
          amount:    parseFloat(form.amount),
          frequency: form.frequency,
          category:  form.category,
        });
        toast({ title: 'Expense updated', status: 'success', duration: 2000, isClosable: true });
      } else {
        await expensesApi.create(user.id, {
          name:      form.name,
          amount:    parseFloat(form.amount),
          frequency: form.frequency,
          category:  form.category,
        });
        toast({ title: 'Expense added', status: 'success', duration: 2000, isClosable: true });
      }
      onClose();
      setForm(EMPTY_FORM);
      setEditingId(null);
      await refresh();
    } catch {
      toast({ title: editingId ? 'Failed to update expense' : 'Failed to add expense', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    try {
      await expensesApi.update(id, { is_active: !is_active });
      await refresh();
    } catch {
      toast({ title: 'Failed to update', status: 'error', duration: 3000 });
    }
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await expensesApi.delete(pendingDeleteId);
      toast({ title: 'Expense removed', status: 'info', duration: 2000, isClosable: true });
      await refresh();
    } catch {
      toast({ title: 'Failed to delete', status: 'error', duration: 3000, isClosable: true });
    } finally {
      onDeleteClose();
      setPendingDeleteId(null);
    }
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
          <PageHeader
            title="Recurring Expenses"
            subtitle={expenses.length === 0 ? 'Track your recurring outgoings' : `${expenses.length} expense${expenses.length !== 1 ? 's' : ''} · ${formatCurrency(totalMonthly, currency)}/mo total`}
            action={
              <HStack spacing={2}>
                {/* Desktop: show Export CSV */}
                <Button
                  leftIcon={<Icon as={RiDownload2Line} />}
                  variant="outline" borderColor="#E8E8E3"
                  bg="white" color="#5a6a7a"
                  h="32px" px={3}
                  borderRadius="10px" fontWeight="600" fontSize="13px"
                  _hover={{ bg: '#F0EFE9' }}
                  isDisabled={expenses.length === 0}
                  display={{ base: 'none', md: 'flex' }}
                  onClick={() => canExportCsv ? exportExpensesCsv(expenses, currency) : onUpgradeOpen()}
                >
                  Export CSV
                </Button>
                {/* Mobile: ··· menu for secondary actions */}
                <Menu>
                  <MenuButton
                    as={IconButton}
                    aria-label="More actions"
                    icon={<Icon as={RiMoreLine} boxSize="16px" />}
                    variant="outline" borderColor="#E8E8E3"
                    bg="white" color="#5a6a7a"
                    h="32px" w="32px" minW="32px"
                    borderRadius="10px"
                    _hover={{ bg: '#F0EFE9' }}
                    display={{ base: 'flex', md: 'none' }}
                  />
                  <MenuList fontSize="13px" borderRadius="10px" shadow="lg" minW="160px">
                    <MenuItem
                      icon={<Icon as={RiDownload2Line} boxSize="14px" />}
                      isDisabled={expenses.length === 0}
                      onClick={() => canExportCsv ? exportExpensesCsv(expenses, currency) : onUpgradeOpen()}
                      fontWeight="500"
                    >
                      Export CSV
                    </MenuItem>
                  </MenuList>
                </Menu>
                {/* Always visible: primary action */}
                <Button
                  leftIcon={<Icon as={RiAddLine} />}
                  bg={isAtExpenseLimit ? '#94a3b8' : '#4C5FD5'}
                  color="white"
                  h="32px" px={3}
                  borderRadius="10px" fontWeight="600" fontSize="13px"
                  _hover={{ bg: isAtExpenseLimit ? '#94a3b8' : '#3D4FBF' }}
                  isDisabled={!isOnline}
                  onClick={handleOpenAdd}
                  title={isAtExpenseLimit ? `Free plan limit: ${freeExpenseLimit} expenses` : undefined}
                >
                  {isAtExpenseLimit ? `Limit reached (${freeExpenseLimit})` : 'Add Expense'}
                </Button>
              </HStack>
            }
          />

          <Box px={{ base: 4, md: 8 }} py={6}>
            {isAtExpenseLimit && (
            <Alert status="info" borderRadius="12px" mb={4} bg="#eef0fb" border="1px solid #c7d0f5">
              <AlertIcon color="#4C5FD5" />
              <Text fontSize="13px" color="#3d4faf" fontWeight="500">
                Free plan includes up to {freeExpenseLimit} recurring expenses.{' '}
                <Box as="span" fontWeight="700" cursor="pointer" textDecoration="underline"
                  onClick={onUpgradeOpen}>Upgrade to Pro</Box>{' '}for unlimited.
              </Text>
            </Alert>
          )}

            {expenses.length === 0 ? (
              /* ── Empty state ── */
              <Box bg="white" border="1px solid #E8E8E3" borderRadius="14px" p={12} textAlign="center">
                <Box
                  w="72px" h="72px" mx="auto" mb={4}
                  borderRadius="20px"
                  bg="linear-gradient(135deg, #eef0fb 0%, #e4e8fa 100%)"
                  border="1px solid #d0d6f5"
                  display="flex" alignItems="center" justifyContent="center"
                >
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="7" y="6" width="18" height="22" rx="3" fill="#c7d0f5" />
                    <rect x="9" y="8" width="14" height="18" rx="2" fill="#eef0fb" />
                    <rect x="11" y="11" width="10" height="2" rx="1" fill="#4C5FD5" opacity="0.4" />
                    <rect x="11" y="15" width="7" height="2" rx="1" fill="#4C5FD5" opacity="0.3" />
                    <rect x="11" y="19" width="8" height="2" rx="1" fill="#4C5FD5" opacity="0.3" />
                    <circle cx="27" cy="9" r="6" fill="#4C5FD5" />
                    <path d="M27 6.5V11.5M24.5 9H29.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </Box>
                <Text fontSize="15px" fontWeight="600" color="#1C2B3A" mb={2}>No recurring expenses yet</Text>
                <Text fontSize="13px" color="#5a6a7a" mb={5} maxW="320px" mx="auto">
                  Add your regular outgoings — rent, subscriptions, insurance — so Spendable knows your baseline monthly costs.
                </Text>
                <Button
                  leftIcon={<Icon as={RiAddLine} />}
                  bg="#4C5FD5" color="white" borderRadius="10px" fontWeight="600" fontSize="13px"
                  _hover={{ bg: '#3D4FBF' }} isDisabled={!isOnline} onClick={handleOpenAdd}
                >
                  Add Expense
                </Button>
              </Box>
            ) : (
          <Box bg={surface} border="1px solid" borderColor={border} borderRadius="14px" overflow="hidden">
              {/* Desktop table */}
              <Box display={{ base: 'none', md: 'block' }}>
              <Table variant="simple" size="sm">
                <Thead bg={theadBg}>
                  <Tr>
                    {['Name', 'Category', 'Frequency', 'Amount', 'Monthly', 'Active', ''].map(h => (
                      <Th key={h} py={3} fontSize="10px" fontWeight="700" color={subtext}
                        textTransform="uppercase" letterSpacing="0.8px" borderColor={border}>
                        {h}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {expenses.map(exp => {
                    const cat = CATEGORY_LABELS[exp.category as ExpenseCategory] ?? CATEGORY_LABELS.other;
                    return (
                      <Tr key={exp.id} opacity={exp.is_active ? 1 : 0.45} _hover={{ bg: rowHover }} transition="all 0.1s">
                        <Td py={3} borderColor={border}>
                          <Text fontSize="13px" fontWeight="500">{exp.name}</Text>
                        </Td>
                        <Td py={3} borderColor={border}>
                          <Badge
                            px={2} py={0.5} borderRadius="6px" fontSize="10px" fontWeight="600"
                            bg={cat.color + '15'} color={cat.color} textTransform="capitalize"
                          >
                            {cat.label}
                          </Badge>
                        </Td>
                        <Td py={3} borderColor={border}>
                          <Text fontSize="12px" color={muted}>{FREQ_LABELS[exp.frequency]}</Text>
                        </Td>
                        <Td py={3} borderColor={border}>
                          <Text fontSize="13px" fontWeight="600">{formatCurrency(exp.amount, currency)}</Text>
                        </Td>
                        <Td py={3} borderColor={border}>
                          <Text fontSize="12px" color={subtext}>
                            {formatCurrency(toMonthlyAmount(exp.amount, exp.frequency), currency)}/mo
                          </Text>
                        </Td>
                        <Td py={3} borderColor={border}>
                          <Switch
                            isChecked={exp.is_active}
                            size="sm"
                            sx={{ '& .chakra-switch__track[data-checked]': { bg: '#4C5FD5' } }}
                            onChange={() => handleToggle(exp.id, exp.is_active)}
                          />
                        </Td>
                        <Td py={3} borderColor={border} isNumeric>
                          <HStack spacing={1} justify="flex-end">
                            <IconButton
                              aria-label="Edit"
                              icon={<Icon as={RiEditLine} />}
                              size="xs" variant="ghost"
                              color={subtext} _hover={{ color: '#4C5FD5', bg: '#eef0fb' }}
                              onClick={() => handleOpenEdit(exp)}
                            />
                            <IconButton
                              aria-label="Delete"
                              icon={<Icon as={RiDeleteBin2Line} />}
                              size="xs" variant="ghost"
                              color={subtext} _hover={{ color: '#e11d48', bg: '#fff1f2' }}
                              onClick={() => handleDelete(exp.id)}
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
              </Box>

              {/* Mobile cards */}
              <Box display={{ base: 'block', md: 'none' }}>
                <VStack spacing={0} align="stretch">
                  {expenses.map((exp, i) => {
                    const cat = CATEGORY_LABELS[exp.category as ExpenseCategory] ?? CATEGORY_LABELS.other;
                    return (
                      <Box
                        key={exp.id}
                        px={4} py={3}
                        borderTop={i > 0 ? '1px solid #e2e8f0' : 'none'}
                        opacity={exp.is_active ? 1 : 0.45}
                      >
                        <HStack justify="space-between" mb={1}>
                          <HStack spacing={2}>
                            <Text fontSize="13px" fontWeight="600">{exp.name}</Text>
                            <Badge px={2} py={0.5} borderRadius="6px" fontSize="10px" fontWeight="600"
                              bg={cat.color + '15'} color={cat.color} textTransform="capitalize">
                              {cat.label}
                            </Badge>
                          </HStack>
                          <HStack spacing={1} justify="flex-end">
                            <Switch isChecked={exp.is_active} size="sm"
                              sx={{ '& .chakra-switch__track[data-checked]': { bg: '#4C5FD5' } }}
                              onChange={() => handleToggle(exp.id, exp.is_active)} />
                            <IconButton aria-label="Edit" icon={<Icon as={RiEditLine} />}
                              size="xs" variant="ghost" color={subtext} _hover={{ color: '#4C5FD5', bg: '#eef0fb' }}
                              onClick={() => handleOpenEdit(exp)} />
                            <IconButton aria-label="Delete" icon={<Icon as={RiDeleteBin2Line} />}
                              size="xs" variant="ghost" color={subtext} _hover={{ color: '#e11d48', bg: '#fff1f2' }}
                              onClick={() => handleDelete(exp.id)} />
                          </HStack>
                        </HStack>
                        <HStack spacing={3}>
                          <Text fontSize="12px" color={muted}>{FREQ_LABELS[exp.frequency]}</Text>
                          <Text fontSize="12px" color={muted}>·</Text>
                          <Text fontSize="13px" fontWeight="700">{formatCurrency(exp.amount, currency)}</Text>
                          <Text fontSize="11px" color={subtext}>
                            ({formatCurrency(toMonthlyAmount(exp.amount, exp.frequency), currency)}/mo)
                          </Text>
                        </HStack>
                      </Box>
                    );
                  })}
                </VStack>
              </Box>
              </Box>
            )} {/* end expenses.length === 0 ternary */}
          </Box> {/* end <Box px> */}

          {/* Upgrade Modal */}
          <UpgradeModal isOpen={isUpgradeOpen} onClose={onUpgradeClose} reason="csv_export" userCurrency={currency} />

          {/* Add / Edit Modal */}
          <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay bg="blackAlpha.200" backdropFilter="blur(6px)" />
            <ModalContent borderRadius="16px" border="1px solid" borderColor={border} shadow="xl">
              <ModalHeader fontWeight="700" fontSize="16px" pb={2}>
                {editingId ? 'Edit Expense' : 'Add Recurring Expense'}
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <VStack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1}>Name</FormLabel>
                    <Input
                      placeholder="e.g. Rent, Netflix, Health Insurance"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      borderRadius="10px" h="42px" fontSize="14px"
                    />
                  </FormControl>
                  <HStack spacing={3} w="full">
                    <FormControl isRequired>
                      <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1}>Amount</FormLabel>
                      <Input
                        type="number" placeholder="0.00"
                        value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                        borderRadius="10px" h="42px" fontSize="14px"
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1}>Frequency</FormLabel>
                      <Select
                        value={form.frequency}
                        onChange={e => setForm(f => ({ ...f, frequency: e.target.value as ExpenseFrequency }))}
                        borderRadius="10px" h="42px" fontSize="14px"
                      >
                        {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </Select>
                    </FormControl>
                  </HStack>
                  <FormControl isRequired>
                    <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1}>Category</FormLabel>
                    <Select
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}
                      borderRadius="10px" h="42px" fontSize="14px"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </Select>
                  </FormControl>
                </VStack>
              </ModalBody>
              <ModalFooter gap={2}>
                <Button variant="ghost" onClick={onClose} borderRadius="10px" fontWeight="600" fontSize="13px">
                  Cancel
                </Button>
                <Button
                  bg="#4C5FD5" color="white" borderRadius="10px"
                  fontWeight="600" fontSize="13px" _hover={{ bg: '#3D4FBF' }}
                  isLoading={submitting}
                  onClick={handleSubmit}
                >
                  {editingId ? 'Save Changes' : 'Add Expense'}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* ── Delete confirmation ── */}
          <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={deleteRef} onClose={onDeleteClose} isCentered>
            <AlertDialogOverlay bg="blackAlpha.200" backdropFilter="blur(4px)" />
            <AlertDialogContent borderRadius="14px" border="1px solid #fecaca" mx={4}>
              <AlertDialogHeader fontWeight="700" fontSize="15px" color="#991b1b" pb={2}>
                Remove expense?
              </AlertDialogHeader>
              <AlertDialogBody fontSize="13px" color="#5a6a7a">
                This will permanently remove this expense and update your financial metrics.
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
        </Box>
      </Box>
    </Box>
  );
}
