import { Box, Text, HStack } from '@chakra-ui/react';

export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <Box bg="#FFFFFF" px={{ base: 4, md: 8 }} py={5} borderBottom="1px solid #E8E8E3">
      <HStack justify="space-between" align="center">
        <Box>
          <Text fontSize="18px" fontWeight="700" letterSpacing="-0.4px" lineHeight="1.2" color="#1C2B3A">
            {title}
          </Text>
          {subtitle && (
            <Text fontSize="13px" color="#5a6a7a" mt={0.5}>{subtitle}</Text>
          )}
        </Box>
        {action}
      </HStack>
    </Box>
  );
}
