import { Box, Text, HStack, Flex } from '@chakra-ui/react';

export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <Box bg="#FFFFFF" px={{ base: 4, md: 8 }} py={5} borderBottom="1px solid #E8E8E3">
      <Flex
        justify="space-between"
        align={{ base: 'flex-start', sm: 'center' }}
        direction={{ base: 'column', sm: 'row' }}
        gap={{ base: 3, sm: 0 }}
      >
        <Box minW={0}>
          <Text fontSize="18px" fontWeight="700" letterSpacing="-0.4px" lineHeight="1.2" color="#1C2B3A">
            {title}
          </Text>
          {subtitle && (
            <Text fontSize="13px" color="#5a6a7a" mt={0.5} noOfLines={1}>{subtitle}</Text>
          )}
        </Box>
        {action && (
          <Box flexShrink={0}>
            <HStack spacing={2} flexWrap="wrap" justify={{ base: 'flex-start', sm: 'flex-end' }}>
              {action}
            </HStack>
          </Box>
        )}
      </Flex>
    </Box>
  );
}
