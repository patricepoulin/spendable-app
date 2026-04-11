import {
  Box, HStack, Text, Table, Thead, Tbody, Tr, Th, Td, Checkbox, VStack,
} from '@chakra-ui/react';
import { Fragment } from 'react';
import { IncomeEntryItem } from './IncomeEntryItem';
import { EmptyIncomeState } from './EmptyIncomeState';
import type { IncomeYear } from '../../utils/incomeMonths';
import type { IncomeEvent } from '../../types';

interface Props {
  year: IncomeYear;
  currency: string;
  onAdd: () => void;
  onEdit: (event: IncomeEvent) => void;
  onDelete: (id: string) => void;
  selectedIds: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  bulkMode: boolean;
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(amount);
}

export function IncomeYearGroup({
  year, currency, onAdd, onEdit, onDelete,
  selectedIds, onSelect, bulkMode,
}: Props) {
  const surface  = '#ffffff';
  const border   = '#e2e8f0';
  const theadBg  = '#f8fafc';
  const monthBg  = '#fafbff';
  const rowHover = '#f8fafc';
  const muted    = '#64748b';
  const subtext  = '#94a3b8';

  const yearEntries = year.months.flatMap(m => m.entries ?? []);
  const allSelected = yearEntries.length > 0 && yearEntries.every(e => selectedIds.has(e.id));
  const someSelected = yearEntries.some(e => selectedIds.has(e.id));

  const handleSelectAll = (checked: boolean) => {
    yearEntries.forEach(e => onSelect(e.id, checked));
  };

  return (
    <Box>
      {/* Year label + annual total */}
      <HStack px={1} pb={2} justify="space-between">
        <Text fontSize="13px" fontWeight="700" color="#1C2B3A" letterSpacing="-0.2px">
          {year.year}
        </Text>
        {year.total > 0 && (
          <Text fontSize="12px" fontWeight="700" color="#27AE60">
            +{fmt(year.total, currency)}
          </Text>
        )}
      </HStack>

      {/* ── Desktop table ── */}
      <Box
        bg={surface} border="1px solid" borderColor={border}
        borderRadius="14px" overflow="hidden"
        display={{ base: 'none', md: 'block' }}
      >
        <Table variant="simple" size="sm">
          <Thead bg={theadBg}>
            <Tr>
              <Th py={3} w="40px" pr={0} borderColor={border}>
                <Checkbox
                  isChecked={allSelected}
                  isIndeterminate={someSelected && !allSelected}
                  onChange={e => handleSelectAll(e.target.checked)}
                  colorScheme="brand"
                  opacity={bulkMode ? 1 : 0}
                  pointerEvents={bulkMode ? 'auto' : 'none'}
                  transition="opacity 0.15s"
                />
              </Th>
              {['Source', 'Date', 'Amount', 'Notes', ''].map(h => (
                <Th
                  key={h} py={3}
                  fontSize="10px" fontWeight="700" color={subtext}
                  textTransform="uppercase" letterSpacing="0.8px"
                  borderColor={border}
                >
                  {h}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {year.months.map((month, i) => (
              <Fragment key={month.key}>
                <Tr key={`month-${month.key}`}>
                  <Td
                    colSpan={6} py={2} px={4}
                    borderColor={border} bg={monthBg}
                    borderTop={i > 0 ? '1px solid' : undefined}
                    borderTopColor={border}
                  >
                    <HStack justify="space-between">
                      <Text fontSize="11px" fontWeight="700" color={muted}
                        textTransform="uppercase" letterSpacing="0.6px">
                        {month.label}
                      </Text>
                      {!month.isEmpty && (
                        <Text fontSize="11px" fontWeight="600" color="#27AE60">
                          +{fmt(month.total, currency)}
                        </Text>
                      )}
                    </HStack>
                  </Td>
                </Tr>
                {month.isEmpty ? (
                  <EmptyIncomeState
                    key={`empty-${month.key}`}
                    border={border} subtext={subtext} onAdd={onAdd}
                  />
                ) : (
                  month.entries.map(event => (
                    <IncomeEntryItem
                      key={event.id}
                      event={event} currency={currency}
                      border={border} subtext={subtext} muted={muted} rowHover={rowHover}
                      onEdit={onEdit} onDelete={onDelete}
                      selected={selectedIds.has(event.id)}
                      onSelect={onSelect} bulkMode={bulkMode}
                    />
                  ))
                )}
              </Fragment>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* ── Mobile cards ── */}
      <Box
        bg={surface} border="1px solid" borderColor={border}
        borderRadius="14px" overflow="hidden"
        display={{ base: 'block', md: 'none' }}
      >
        {/* Select-all row in bulk mode */}
        {bulkMode && yearEntries.length > 0 && (
          <HStack
            px={4} py={2.5}
            borderBottom="1px solid" borderColor={border}
            bg={theadBg}
          >
            <Checkbox
              isChecked={allSelected}
              isIndeterminate={someSelected && !allSelected}
              onChange={e => handleSelectAll(e.target.checked)}
              colorScheme="brand"
            />
            <Text fontSize="11px" fontWeight="700" color={subtext}
              textTransform="uppercase" letterSpacing="0.6px">
              Select all {yearEntries.length}
            </Text>
          </HStack>
        )}

        {year.months.map((month, i) => (
          <Fragment key={month.key}>
            {/* Month sub-header */}
            <Box
              px={4} py={2}
              bg={monthBg}
              borderTop={i > 0 ? '1px solid' : undefined}
              borderColor={border}
            >
              <HStack justify="space-between">
                <Text fontSize="11px" fontWeight="700" color={muted}
                  textTransform="uppercase" letterSpacing="0.6px">
                  {month.label}
                </Text>
                {!month.isEmpty && (
                  <Text fontSize="11px" fontWeight="600" color="#27AE60">
                    +{fmt(month.total, currency)}
                  </Text>
                )}
              </HStack>
            </Box>

            {/* Cards */}
            {month.isEmpty ? (
              <Box px={4} py={3}>
                <Text fontSize="12px" color={subtext}>No income this month</Text>
              </Box>
            ) : (
              <VStack spacing={0} align="stretch">
                {month.entries.map((event, ei) => (
                  <IncomeEntryItem
                    key={event.id}
                    event={event} currency={currency}
                    border={border} subtext={subtext} muted={muted} rowHover={rowHover}
                    onEdit={onEdit} onDelete={onDelete}
                    selected={selectedIds.has(event.id)}
                    onSelect={onSelect} bulkMode={bulkMode}
                    isMobile={true}
                    isLast={ei === month.entries.length - 1}
                  />
                ))}
              </VStack>
            )}
          </Fragment>
        ))}
      </Box>
    </Box>
  );
}
