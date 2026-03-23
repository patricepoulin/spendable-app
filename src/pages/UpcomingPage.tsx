import { useState, useRef } from 'react';
import {
  Box, Button, VStack, HStack, Text, Icon,
  Table, Thead, Tbody, Tr, Th, Td,
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton,
  AlertDialog, AlertDialogOverlay, AlertDialogContent,
  AlertDialogHeader, AlertDialogBody, AlertDialogFooter,
  FormControl, FormLabel, Input,
  useDisclosure, useToast,
  IconButton, Badge, Alert, AlertIcon,
} from '@chakra-ui/react';
import {
  RiAddLine, RiDeleteBin2Line, RiCheckLine,
  RiCalendarEventLine, RiAlertLine, RiEditLine,
} from 'react-icons/ri';
import { PageHeader } from '../components/ui/PageHeader';
import { useFinancials } from '../hooks/useFinancials';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useSubscription } from '../hooks/useSubscription';
import { usePageTitle } from '../hooks/usePageTitle';
import { UpgradeModal } from '../components/subscription/UpgradeModal';
import { upcomingApi } from '../lib/supabase';
import { formatCurrency } from '../utils/calculations';
import type { UpcomingExpense } from '../types';
import { PAGE_BG } from '../theme';

const EMPTY_FORM = { name: '', amount: '', due_date: '' };

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DueBadge({ due_date }: { due_date: string }) {
  const days = daysUntil(due_date);
  if (days < 0)  return <Badge px={2} py={0.5} borderRadius="6px" fontSize="10px" fontWeight="700" bg="#fef2f2" color="#DC2626">Overdue</Badge>;
  if (days === 0) return <Badge px={2} py={0.5} borderRadius="6px" fontSize="10px" fontWeight="700" bg="#fef9c3" color="#92400e">Due today</Badge>;
  if (days <= 7)  return <Badge px={2} py={0.5} borderRadius="6px" fontSize="10px" fontWeight="700" bg="#fef9c3" color="#92400e">{days}d</Badge>;
  if (days <= 30) return <Badge px={2} py={0.5} borderRadius="6px" fontSize="10px" fontWeight="700" bg="#eef0fb" color="#4C5FD5">{days}d</Badge>;
  return <Badge px={2} py={0.5} borderRadius="6px" fontSize="10px" fontWeight="700" bg="#f1f5f9" color="#64748b">{days}d</Badge>;
}

export function UpcomingPage() {
  usePageTitle('Upcoming Expenses');
  const { user }                        = useAuth();
  const { upcoming, settings, refresh, income, expenses } = useFinancials();
  const { isOpen, onOpen, onClose }     = useDisclosure();
  const { isOpen: isUpgradeOpen, onOpen: onUpgradeOpen, onClose: onUpgradeClose } = useDisclosure();
  const toast                           = useToast();
  const currency                        = settings?.currency ?? 'USD';
  const isOnline                        = useOnlineStatus();

  const unpaid = upcoming.filter(e => !e.is_paid);

  const { isPro, isAtUpcomingLimit, freeUpcomingLimit } = useSubscription(income, expenses.length, unpaid.length);

  const [form, setForm]             = useState(EMPTY_FORM);
  const [editingId, setEditingId]   = useState<string | null>(null);
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

  const paid        = upcoming.filter(e => e.is_paid);
  const totalUnpaid = unpaid.reduce((s, e) => s + e.amount, 0);

  const handleOpenAdd = () => {
    if (!isPro && isAtUpcomingLimit) { onUpgradeOpen(); return; }
    setEditingId(null);
    setForm(EMPTY_FORM);
    onOpen();
  };

  const handleOpenEdit = (exp: UpcomingExpense) => {
    setEditingId(exp.id);
    setForm({ name: exp.name, amount: String(exp.amount), due_date: exp.due_date });
    onOpen();
  };

  const handleSubmit = async () => {
    if (!user || !form.name || !form.amount || !form.due_date) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await upcomingApi.update(editingId, {
          name:     form.name,
          amount:   parseFloat(form.amount),
          due_date: form.due_date,
        });
        toast({ title: 'Expense updated', status: 'success', duration: 2000, isClosable: true });
      } else {
        await upcomingApi.create(user.id, {
          name:     form.name,
          amount:   parseFloat(form.amount),
          due_date: form.due_date,
        });
        toast({ title: 'Expense added', status: 'success', duration: 2000, isClosable: true });
      }
      onClose();
      setForm(EMPTY_FORM);
      setEditingId(null);
      await refresh();
    } catch {
      toast({ title: editingId ? 'Failed to update' : 'Failed to add expense', status: 'error', duration: 3000, isClosable: true });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await upcomingApi.markPaid(id);
      toast({
        title: 'Marked as paid',
        description: 'Your safe-to-spend has been updated.',
        status: 'success',
        duration: 2500,
        isClosable: true,
      });
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
      await upcomingApi.delete(pendingDeleteId);
      toast({ title: 'Removed', status: 'info', duration: 2000, isClosable: true });
      await refresh();
    } catch {
      toast({ title: 'Failed to delete', status: 'error', duration: 3000, isClosable: true });
    } finally {
      onDeleteClose();
      setPendingDeleteId(null);
    }
  };

  const overdueCount = unpaid.filter(e => daysUntil(e.due_date) < 0).length;

  return (
    <Box>
      <Box position="relative" overflow="hidden" bg={PAGE_BG} minH="100vh">
        <Box position="absolute" top="-120px" right="-120px" w="520px" h="520px" borderRadius="full"
          bg="radial-gradient(circle, rgba(76,95,213,0.07) 0%, transparent 70%)" pointerEvents="none" />
        <Box position="absolute" bottom="-80px" left="-80px" w="420px" h="420px" borderRadius="full"
          bg="radial-gradient(circle, rgba(235,87,87,0.04) 0%, transparent 70%)" pointerEvents="none" />

        <Box position="relative">
          <PageHeader
            title="Upcoming Expenses"
            subtitle={upcoming.length === 0 ? 'Track one-off upcoming costs' : `${unpaid.length} pending · ${formatCurrency(totalUnpaid, currency)} total`}
            action={
              <Button
                leftIcon={<Icon as={RiAddLine} />}
                bg="#4C5FD5" color="white" size="sm"
                h="32px" px={3}
                borderRadius="10px" fontWeight="600" fontSize="13px"
                _hover={{ bg: '#3D4FBF' }}
                isDisabled={!isOnline}
                onClick={handleOpenAdd}
              >
                Add Upcoming
              </Button>
            }
          />

          <Box px={{ base: 4, md: 8 }} py={6}>
            {/* Free plan limit banner */}
            {!isPro && isAtUpcomingLimit && (
              <Alert status="warning" borderRadius="12px" mb={5} bg="#fffbeb" border="1px solid #fde68a">
                <AlertIcon color="#d97706" />
                <Text fontSize="13px" color="#92400e" fontWeight="500">
                  You've reached the free limit of {freeUpcomingLimit} upcoming expenses.{' '}
                  <Text as="span" fontWeight="700" color="#4C5FD5" cursor="pointer" onClick={onUpgradeOpen}>
                    Upgrade to Pro
                  </Text>{' '}for unlimited.
                </Text>
              </Alert>
            )}

            {/* Overdue alert */}
            {overdueCount > 0 && (
              <Alert status="error" borderRadius="12px" mb={5} bg="#fef2f2" border="1px solid #fecaca">
                <Icon as={RiAlertLine} color="#DC2626" mr={2} boxSize="16px" />
                <Text fontSize="13px" color="#991b1b" fontWeight="500">
                  {overdueCount} expense{overdueCount > 1 ? 's are' : ' is'} overdue — mark as paid or delete if no longer relevant.
                </Text>
              </Alert>
            )}

            {/* What this page is for */}
            {upcoming.length === 0 ? (
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
                    {/* Calendar */}
                    <rect x="5" y="8" width="26" height="22" rx="3" fill="#c7d0f5" />
                    <rect x="7" y="13" width="22" height="15" rx="2" fill="#eef0fb" />
                    <rect x="5" y="8" width="26" height="7" rx="3" fill="#7b8fe8" />
                    <rect x="11" y="5" width="3" height="6" rx="1.5" fill="#4C5FD5" />
                    <rect x="22" y="5" width="3" height="6" rx="1.5" fill="#4C5FD5" />
                    <rect x="10" y="19" width="5" height="5" rx="1" fill="#4C5FD5" opacity="0.3" />
                    <rect x="17" y="19" width="5" height="5" rx="1" fill="#4C5FD5" opacity="0.3" />
                    {/* Plus badge */}
                    <circle cx="27" cy="27" r="6" fill="#4C5FD5" />
                    <path d="M27 24.5V29.5M24.5 27H29.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </Box>
                <Text fontSize="15px" fontWeight="600" color="#1C2B3A" mb={2}>No upcoming expenses yet</Text>
                <Text fontSize="13px" color="#5a6a7a" mb={5} maxW="320px" mx="auto">
                  Add one-off costs you know are coming — tax bills, equipment, travel — and they'll be reserved from your safe-to-spend.
                </Text>
                <Button
                  leftIcon={<Icon as={RiAddLine} />}
                  bg="#4C5FD5" color="white" borderRadius="10px" fontWeight="600" fontSize="13px"
                  _hover={{ bg: '#3D4FBF' }} isDisabled={!isOnline} onClick={handleOpenAdd}
                >
                  Add Upcoming
                </Button>
              </Box>
            ) : (
              <>
            {/* What this page is for */}
            <Box
              bg={surface} border="1px solid" borderColor={border}
              borderRadius="12px" p={4} mb={5}
            >
              <HStack spacing={3}>
                <Box w={8} h={8} borderRadius="8px" bg="#eef0fb" border="1px solid #c7d0f5"
                  display="flex" alignItems="center" justifyContent="center" flexShrink={0}>
                  <Icon as={RiCalendarEventLine} color="#4C5FD5" boxSize="15px" />
                </Box>
                <Text fontSize="13px" color={muted} lineHeight="1.55">
                  Track one-off costs you know are coming — annual tax bill, equipment, travel, insurance renewal.
                  These are deducted from your <Text as="span" fontWeight="700" color="#1C2B3A">safe-to-spend</Text> so you're never caught short.
                </Text>
              </HStack>
            </Box>

            {/* Pending table */}
            <Box bg={surface} border="1px solid" borderColor={border} borderRadius="14px" overflow="hidden" mb={6}>
              {/* Desktop table */}
              <Box display={{ base: 'none', md: 'block' }}>
              <Table variant="simple" size="sm">
                <Thead bg={theadBg}>
                  <Tr>
                    {['Name', 'Amount', 'Due Date', 'Status', ''].map(h => (
                      <Th key={h} py={3} fontSize="10px" fontWeight="700" color={subtext}
                        textTransform="uppercase" letterSpacing="0.8px" borderColor={border}>
                        {h}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {unpaid.length === 0 && (
                    <Tr>
                      <Td colSpan={5} textAlign="center" py={12} color={subtext} fontSize="13px" borderColor={border}>
                        No upcoming expenses. Add your tax bill, subscriptions renewals, or planned purchases.
                      </Td>
                    </Tr>
                  )}
                  {unpaid.map((exp: UpcomingExpense) => (
                    <Tr key={exp.id} _hover={{ bg: rowHover }} transition="all 0.1s">
                      <Td py={3} borderColor={border}>
                        <Text fontSize="13px" fontWeight="500">{exp.name}</Text>
                      </Td>
                      <Td py={3} borderColor={border}>
                        <Text fontSize="13px" fontWeight="700" color="#1C2B3A">
                          {formatCurrency(exp.amount, currency)}
                        </Text>
                      </Td>
                      <Td py={3} borderColor={border}>
                        <Text fontSize="12px" color={muted}>
                          {new Date(exp.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </Td>
                      <Td py={3} borderColor={border}>
                        <DueBadge due_date={exp.due_date} />
                      </Td>
                      <Td py={3} borderColor={border}>
                        <HStack spacing={1} justify="flex-end">
                          <IconButton
                            aria-label="Edit"
                            icon={<Icon as={RiEditLine} />}
                            size="xs" variant="ghost"
                            color={subtext} _hover={{ color: '#4C5FD5', bg: '#eef0fb' }}
                            onClick={() => handleOpenEdit(exp)}
                          />
                          <IconButton
                            aria-label="Mark paid"
                            icon={<Icon as={RiCheckLine} />}
                            size="xs" variant="ghost"
                            color={subtext} _hover={{ color: '#27AE60', bg: '#eafaf1' }}
                            title="Mark as paid"
                            onClick={() => handleMarkPaid(exp.id)}
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
                  ))}
                </Tbody>
              </Table>
              </Box>

              {/* Mobile cards */}
              <Box display={{ base: 'block', md: 'none' }}>
                {unpaid.length === 0 && (
                  <Text textAlign="center" py={10} color={subtext} fontSize="13px">
                    No upcoming expenses yet.
                  </Text>
                )}
                <VStack spacing={0} align="stretch">
                  {unpaid.map((exp: UpcomingExpense, i) => (
                    <Box key={exp.id} px={4} py={3} borderTop={i > 0 ? '1px solid #e2e8f0' : 'none'}>
                      <HStack justify="space-between" mb={1}>
                        <HStack spacing={2}>
                          <Text fontSize="13px" fontWeight="600">{exp.name}</Text>
                          <DueBadge due_date={exp.due_date} />
                        </HStack>
                        <HStack spacing={1}>
                          <IconButton aria-label="Edit" icon={<Icon as={RiEditLine} />}
                            size="xs" variant="ghost" color={subtext} _hover={{ color: '#4C5FD5', bg: '#eef0fb' }}
                            onClick={() => handleOpenEdit(exp)} />
                          <IconButton aria-label="Mark paid" icon={<Icon as={RiCheckLine} />}
                            size="xs" variant="ghost" color={subtext} _hover={{ color: '#27AE60', bg: '#eafaf1' }}
                            onClick={() => handleMarkPaid(exp.id)} />
                          <IconButton aria-label="Delete" icon={<Icon as={RiDeleteBin2Line} />}
                            size="xs" variant="ghost" color={subtext} _hover={{ color: '#e11d48', bg: '#fff1f2' }}
                            onClick={() => handleDelete(exp.id)} />
                        </HStack>
                      </HStack>
                      <HStack spacing={3}>
                        <Text fontSize="13px" fontWeight="700" color="#1C2B3A">{formatCurrency(exp.amount, currency)}</Text>
                        <Text fontSize="12px" color={muted}>
                          Due {new Date(exp.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </Text>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </Box>
            </Box>

            {/* Paid / archived */}
            {paid.length > 0 && (
              <Box>
                <Text fontSize="11px" fontWeight="700" color={subtext} textTransform="uppercase"
                  letterSpacing="0.8px" mb={3}>
                  Paid ({paid.length})
                </Text>
                <Box bg={surface} border="1px solid" borderColor={border} borderRadius="14px" overflow="hidden">
                  {/* Desktop table */}
                  <Box display={{ base: 'none', md: 'block' }}>
                    <Table variant="simple" size="sm">
                      <Tbody>
                        {paid.map((exp: UpcomingExpense) => (
                          <Tr key={exp.id} opacity={0.5} _hover={{ bg: rowHover }} transition="all 0.1s">
                            <Td py={3} borderColor={border}>
                              <HStack spacing={2}>
                                <Icon as={RiCheckLine} color="#27AE60" boxSize="13px" />
                                <Text fontSize="13px" fontWeight="500" textDecoration="line-through" color={muted}>
                                  {exp.name}
                                </Text>
                              </HStack>
                            </Td>
                            <Td py={3} borderColor={border}>
                              <Text fontSize="13px" color={muted} textDecoration="line-through">
                                {formatCurrency(exp.amount, currency)}
                              </Text>
                            </Td>
                            <Td py={3} borderColor={border}>
                              <Text fontSize="12px" color={subtext}>
                                {new Date(exp.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </Text>
                            </Td>
                            <Td py={3} borderColor={border} />
                            <Td py={3} borderColor={border} isNumeric>
                              <HStack justify="flex-end">
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
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                  {/* Mobile cards */}
                  <Box display={{ base: 'block', md: 'none' }}>
                    <VStack spacing={0} align="stretch">
                      {paid.map((exp: UpcomingExpense, i) => (
                        <Box key={exp.id} px={4} py={3} opacity={0.5}
                          borderTop={i > 0 ? '1px solid' : 'none'} borderColor={border}>
                          <HStack justify="space-between">
                            <HStack spacing={2}>
                              <Icon as={RiCheckLine} color="#27AE60" boxSize="13px" />
                              <Text fontSize="13px" fontWeight="500" textDecoration="line-through" color={muted}>
                                {exp.name}
                              </Text>
                            </HStack>
                            <HStack spacing={2}>
                              <Text fontSize="13px" color={muted} textDecoration="line-through">
                                {formatCurrency(exp.amount, currency)}
                              </Text>
                              <IconButton
                                aria-label="Delete"
                                icon={<Icon as={RiDeleteBin2Line} />}
                                size="xs" variant="ghost"
                                color={subtext} _hover={{ color: '#e11d48', bg: '#fff1f2' }}
                                onClick={() => handleDelete(exp.id)}
                              />
                            </HStack>
                          </HStack>
                          <Text fontSize="11px" color={subtext} mt={0.5} pl={5}>
                            {new Date(exp.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Text>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                </Box>
              </Box>
            )}
              </>
            )}
          </Box>

          {/* Add modal */}
          <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay bg="blackAlpha.200" backdropFilter="blur(6px)" />
            <ModalContent borderRadius="16px" border="1px solid" borderColor={border} shadow="xl">
              <ModalHeader fontWeight="700" fontSize="16px" pb={2}>
                {editingId ? 'Edit Upcoming Expense' : 'Add Upcoming Expense'}
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <VStack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1}>Name</FormLabel>
                    <Input
                      placeholder="e.g. Annual tax bill, New laptop, Car insurance"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      borderRadius="10px" h="42px" fontSize="14px"
                    />
                  </FormControl>
                  <HStack spacing={3} w="full">
                    <FormControl isRequired>
                      <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1}>Amount</FormLabel>
                      <Input
                        type="number" placeholder="0.00"
                        value={form.amount}
                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                        borderRadius="10px" h="42px" fontSize="14px"
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel fontSize="12px" fontWeight="600" color={muted} mb={1}>Due Date</FormLabel>
                      <Input
                        type="date"
                        value={form.due_date}
                        onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                        borderRadius="10px" h="42px" fontSize="14px"
                      />
                    </FormControl>
                  </HStack>
                  <Alert status="info" borderRadius="10px" bg="#eef0fb" border="1px solid #c7d0f5" fontSize="12px">
                    <AlertIcon color="#4C5FD5" boxSize="14px" />
                    <Text color="#3d4faf">
                      This amount is reserved from your safe-to-spend immediately and released when you mark it paid.
                    </Text>
                  </Alert>
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
                  isDisabled={!form.name || !form.amount || !form.due_date}
                  onClick={handleSubmit}
                >
                  {editingId ? 'Save Changes' : 'Add Expense'}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </Box>
      </Box>

      <UpgradeModal isOpen={isUpgradeOpen} onClose={onUpgradeClose} reason="manual" userCurrency={currency} />

      {/* ── Delete confirmation ── */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={deleteRef} onClose={onDeleteClose} isCentered>
        <AlertDialogOverlay bg="blackAlpha.200" backdropFilter="blur(4px)" />
        <AlertDialogContent borderRadius="14px" border="1px solid #fecaca" mx={4}>
          <AlertDialogHeader fontWeight="700" fontSize="15px" color="#991b1b" pb={2}>
            Remove upcoming expense?
          </AlertDialogHeader>
          <AlertDialogBody fontSize="13px" color="#5a6a7a">
            This will permanently remove this expense and release the reserved amount back to your safe-to-spend.
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
  );
}
