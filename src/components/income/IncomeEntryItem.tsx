import { Tr, Td, HStack, Box, Text, Icon, IconButton, Checkbox, VStack } from '@chakra-ui/react';
import { RiMoneyDollarCircleLine, RiPencilLine, RiDeleteBin2Line } from 'react-icons/ri';
import type { IncomeEvent } from '../../types';

interface Props {
  event: IncomeEvent;
  currency: string;
  border: string;
  subtext: string;
  muted: string;
  rowHover: string;
  onEdit: (event: IncomeEvent) => void;
  onDelete: (id: string) => void;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  bulkMode: boolean;
  isMobile?: boolean;
  isLast?: boolean;
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(amount);
}

export function IncomeEntryItem({
  event, currency, border, subtext, muted, rowHover,
  onEdit, onDelete, selected, onSelect, bulkMode,
  isMobile = false, isLast = false,
}: Props) {

  // ── Mobile card ───────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <Box
        px={4} py={3}
        borderBottom={isLast ? undefined : '1px solid'}
        borderColor={border}
        bg={selected ? '#f0f4ff' : 'white'}
      >
        <HStack spacing={3} align="flex-start">
          {/* Checkbox — only visible in bulk mode */}
          {bulkMode && (
            <Checkbox
              isChecked={selected}
              onChange={e => onSelect(event.id, e.target.checked)}
              colorScheme="brand"
              mt={0.5}
              flexShrink={0}
            />
          )}

          {/* Icon */}
          <Box
            w={8} h={8} borderRadius="8px" bg="#eef0fb" flexShrink={0}
            display="flex" alignItems="center" justifyContent="center"
          >
            <Icon as={RiMoneyDollarCircleLine} color="#4C5FD5" boxSize="15px" />
          </Box>

          {/* Content */}
          <VStack spacing={0.5} align="stretch" flex={1} minW={0}>
            <HStack justify="space-between" align="flex-start">
              <Text fontSize="13px" fontWeight="600" color="#1C2B3A" noOfLines={1} flex={1}>
                {event.source}
              </Text>
              <Text fontSize="13px" fontWeight="700" color="#27AE60" flexShrink={0} ml={2}>
                +{fmt(event.amount, currency)}
              </Text>
            </HStack>
            <HStack justify="space-between" align="center">
              <Text fontSize="11px" color={muted}>
                {new Date(event.date).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
                {event.notes ? ` · ${event.notes}` : ''}
              </Text>
              <HStack spacing={0} flexShrink={0}>
                <IconButton
                  aria-label="Edit" icon={<Icon as={RiPencilLine} boxSize="13px" />}
                  size="xs" variant="ghost" color={subtext}
                  _hover={{ color: '#4C5FD5', bg: '#eef0fb' }}
                  onClick={() => onEdit(event)}
                />
                <IconButton
                  aria-label="Delete" icon={<Icon as={RiDeleteBin2Line} boxSize="13px" />}
                  size="xs" variant="ghost" color={subtext}
                  _hover={{ color: '#e11d48', bg: '#fff1f2' }}
                  onClick={() => onDelete(event.id)}
                />
              </HStack>
            </HStack>
          </VStack>
        </HStack>
      </Box>
    );
  }

  // ── Desktop table row ─────────────────────────────────────────────────────
  return (
    <Tr _hover={{ bg: rowHover }} transition="background 0.1s"
      bg={selected ? '#f0f4ff' : undefined}>
      <Td py={3} borderColor={border} w="40px" pr={0}>
        <Checkbox
          isChecked={selected}
          onChange={e => onSelect(event.id, e.target.checked)}
          colorScheme="brand"
          opacity={bulkMode ? 1 : 0}
          pointerEvents={bulkMode ? 'auto' : 'none'}
          transition="opacity 0.15s"
        />
      </Td>
      <Td py={3} borderColor={border}>
        <HStack spacing={2.5}>
          <Box
            w={7} h={7} borderRadius="8px" bg="#eef0fb" flexShrink={0}
            display="flex" alignItems="center" justifyContent="center"
          >
            <Icon as={RiMoneyDollarCircleLine} color="#4C5FD5" boxSize="14px" />
          </Box>
          <Text fontSize="13px" fontWeight="500" color="#1C2B3A">{event.source}</Text>
        </HStack>
      </Td>
      <Td py={3} borderColor={border}>
        <Text fontSize="12px" color={muted}>
          {new Date(event.date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric',
          })}
        </Text>
      </Td>
      <Td py={3} borderColor={border}>
        <Text fontSize="13px" fontWeight="700" color="#27AE60">
          +{fmt(event.amount, currency)}
        </Text>
      </Td>
      <Td py={3} borderColor={border}>
        <Text fontSize="12px" color={subtext} isTruncated maxW="200px">
          {event.notes || '—'}
        </Text>
      </Td>
      <Td py={3} borderColor={border}>
        <HStack spacing={1} justify="flex-end">
          <IconButton
            aria-label="Edit" icon={<Icon as={RiPencilLine} />}
            size="xs" variant="ghost" color={subtext}
            _hover={{ color: '#4C5FD5', bg: '#eef0fb' }}
            onClick={() => onEdit(event)}
          />
          <IconButton
            aria-label="Delete" icon={<Icon as={RiDeleteBin2Line} />}
            size="xs" variant="ghost" color={subtext}
            _hover={{ color: '#e11d48', bg: '#fff1f2' }}
            onClick={() => onDelete(event.id)}
          />
        </HStack>
      </Td>
    </Tr>
  );
}
