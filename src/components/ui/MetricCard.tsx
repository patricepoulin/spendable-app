import { Box, Text, HStack, Icon, Skeleton } from '@chakra-ui/react';
import type { IconType } from 'react-icons';

interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: IconType;
  accentColor?: string;
  isLoading?: boolean;
  badge?: { label: string; color: string };
}

export function MetricCard({
  label, value, subtext, icon, accentColor = 'purple.500', isLoading, badge
}: MetricCardProps) {
  const bg = 'white';
  const border = 'gray.100';
  const labelColor = 'gray.500';
  const subtextColor = 'gray.400';

  return (
    <Box
      bg={bg}
      border="1px solid"
      borderColor={border}
      borderRadius="xl"
      p={5}
      position="relative"
      overflow="hidden"
      _hover={{ borderColor: accentColor, shadow: 'sm' }}
      transition="all 0.2s"
    >
      {/* Accent glow */}
      <Box
        position="absolute"
        top={0} left={0} right={0}
        h="2px"
        bgGradient={`linear(to-r, ${accentColor}, transparent)`}
        borderTopRadius="xl"
      />

      <HStack justify="space-between" mb={3}>
        <Text fontSize="xs" fontWeight="600" color={labelColor} textTransform="uppercase" letterSpacing="wider">
          {label}
        </Text>
        <Box
          w={8} h={8} borderRadius="lg"
          bg={`${accentColor.split('.')[0]}.50`}
          display="flex" alignItems="center" justifyContent="center"
        >
          <Icon as={icon} color={accentColor} boxSize={4} />
        </Box>
      </HStack>

      {isLoading ? (
        <>
          <Skeleton height="32px" mb={2} borderRadius="md" />
          <Skeleton height="16px" w="60%" borderRadius="md" />
        </>
      ) : (
        <>
          <HStack align="baseline" spacing={2}>
            <Text fontSize="2xl" fontWeight="800" letterSpacing="-1px" lineHeight="1">
              {value}
            </Text>
            {badge && (
              <Box
                px={2} py={0.5} borderRadius="full"
                bg={`${badge.color}.100`} color={`${badge.color}.700`}
              >
                <Text fontSize="xs" fontWeight="700">{badge.label}</Text>
              </Box>
            )}
          </HStack>
          {subtext && (
            <Text fontSize="xs" color={subtextColor} mt={1}>
              {subtext}
            </Text>
          )}
        </>
      )}
    </Box>
  );
}
