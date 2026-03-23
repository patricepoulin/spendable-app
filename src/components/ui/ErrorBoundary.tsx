import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Box, VStack, Text, Button, Icon, Code } from '@chakra-ui/react';
import { RiAlertLine, RiRefreshLine } from 'react-icons/ri';

interface Props  { children: ReactNode; }
interface State  { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Box
        minH="100vh" bg="#F5F4EF"
        display="flex" alignItems="center" justifyContent="center" p={6}
      >
        <Box
          bg="white" border="1px solid #E8E8E3" borderRadius="16px"
          p={8} maxW="480px" w="full" textAlign="center"
          boxShadow="0 4px 24px rgba(0,0,0,0.06)"
        >
          <Box
            w={12} h={12} borderRadius="12px" bg="#fef2f2" border="1px solid #fecaca"
            display="flex" alignItems="center" justifyContent="center" mx="auto" mb={5}
          >
            <Icon as={RiAlertLine} color="#DC2626" boxSize={5} />
          </Box>
          <Text fontWeight="700" fontSize="18px" color="#1C2B3A" mb={2}>
            Something went wrong
          </Text>
          <Text fontSize="14px" color="#5a6a7a" lineHeight="1.65" mb={5}>
            An unexpected error occurred. Your data is safe — try refreshing the page.
          </Text>
          {this.state.error && (
            <Code
              display="block" p={3} mb={5} borderRadius="8px"
              fontSize="11px" color="#5a6a7a" bg="#f8fafc"
              textAlign="left" whiteSpace="pre-wrap" wordBreak="break-word"
            >
              {this.state.error.message}
            </Code>
          )}
          <VStack spacing={2}>
            <Button
              leftIcon={<Icon as={RiRefreshLine} />}
              bg="#4C5FD5" color="white" borderRadius="10px"
              fontWeight="600" w="full" h="42px"
              _hover={{ bg: '#3D4FBF' }}
              onClick={() => window.location.reload()}
            >
              Refresh page
            </Button>
            <Button
              variant="ghost" borderRadius="10px" w="full" h="42px"
              fontWeight="600" color="#5a6a7a" fontSize="13px"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again without refreshing
            </Button>
          </VStack>
        </Box>
      </Box>
    );
  }
}
