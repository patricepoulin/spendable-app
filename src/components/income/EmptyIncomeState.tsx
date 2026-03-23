import { Tr, Td, HStack, Text, Button, Icon } from '@chakra-ui/react';
import { RiAddLine } from 'react-icons/ri';

interface Props {
  border: string;
  subtext: string;
  onAdd: () => void;
}

export function EmptyIncomeState({ border, subtext, onAdd }: Props) {
  return (
    <Tr>
      <Td colSpan={5} borderColor={border} py={3}>
        <HStack justify="space-between" px={1}>
          <Text fontSize="12px" color={subtext} fontStyle="italic">
            No income recorded
          </Text>
          <Button
            leftIcon={<Icon as={RiAddLine} />}
            size="xs" variant="ghost"
            color="#4C5FD5" fontWeight="600" fontSize="12px"
            _hover={{ bg: '#eef0fb' }}
            onClick={onAdd}
          >
            Add income
          </Button>
        </HStack>
      </Td>
    </Tr>
  );
}
