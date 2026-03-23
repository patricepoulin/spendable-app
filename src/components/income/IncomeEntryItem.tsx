import { Tr, Td, HStack, Box, Text, Icon, IconButton } from '@chakra-ui/react';
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
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(amount);
}

export function IncomeEntryItem({
  event, currency, border, subtext, muted, rowHover, onEdit, onDelete,
}: Props) {
  return (
    <Tr _hover={{ bg: rowHover }} transition="background 0.1s">
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
