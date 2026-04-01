import { Box, VStack, Text, Button, Icon } from '@chakra-ui/react';
import { RiArrowLeftLine, RiMapPin2Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { SpendableMark } from '../components/ui/SpendableMark';
import { PAGE_BG } from '../theme';

export function NotFoundPage() {
  usePageTitle('Page Not Found');
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Box
      minH="100vh" bg={PAGE_BG}
      display="flex" alignItems="center" justifyContent="center"
      p={6} position="relative" overflow="hidden"
    >
      {/* Background blobs */}
      <Box position="absolute" top="-100px" right="-100px" w="400px" h="400px" borderRadius="full"
        bg="radial-gradient(circle, rgba(76,95,213,0.07) 0%, transparent 70%)" pointerEvents="none" />
      <Box position="absolute" bottom="-80px" left="-80px" w="350px" h="350px" borderRadius="full"
        bg="radial-gradient(circle, rgba(39,174,96,0.05) 0%, transparent 70%)" pointerEvents="none" />

      <VStack spacing={6} textAlign="center" position="relative" maxW="380px">

        {/* Logo */}
        <SpendableMark size={48} rx={13} />

        {/* 404 number */}
        <Box>
          <Text
            fontSize="80px" fontWeight="800" color="#e2e8f0"
            letterSpacing="-4px" lineHeight="1"
            fontFamily="'Inter', sans-serif"
            userSelect="none"
          >
            404
          </Text>
        </Box>

        {/* Icon + message */}
        <Box
          w={14} h={14} borderRadius="16px" bg="#eef0fb" border="1px solid #c7d0f5"
          display="flex" alignItems="center" justifyContent="center"
          mt={-4}
        >
          <Icon as={RiMapPin2Line} color="#4C5FD5" boxSize={6} />
        </Box>

        <VStack spacing={2}>
          <Text fontSize="20px" fontWeight="800" color="#1C2B3A" letterSpacing="-0.5px">
            Page not found
          </Text>
          <Text fontSize="14px" color="#5a6a7a" lineHeight="1.65" maxW="300px">
            This page doesn't exist or the link may have changed. Let's get you back to your finances.
          </Text>
        </VStack>

        <Button
          leftIcon={<Icon as={RiArrowLeftLine} />}
          bg="#4C5FD5" color="white" borderRadius="10px"
          fontWeight="600" h="44px" px={6}
          _hover={{ bg: '#3D4FBF' }}
          onClick={() => navigate(user ? '/' : '/auth')}
        >
          {user ? 'Back to Dashboard' : 'Go to Sign In'}
        </Button>

      </VStack>
    </Box>
  );
}
