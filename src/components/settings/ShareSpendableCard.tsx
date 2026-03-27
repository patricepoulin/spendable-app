import {
  Box, HStack, VStack, Text, Button, Icon, useToast,
} from '@chakra-ui/react';
import { RiLink, RiTwitterXLine, RiHeart2Line } from 'react-icons/ri';

const SHARE_URL  = 'https://spendable.finance';
const TWEET_TEXT = `Freelancers with irregular income should check this out.\n\nSpendable helps answer the question: "How much money can I safely spend right now?"\n\n${SHARE_URL} by @spendable_`;

export function ShareSpendableCard() {
  const toast = useToast();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      toast({
        title: 'Link copied to clipboard',
        status: 'success',
        duration: 2500,
        isClosable: true,
        position: 'top',
      });
    } catch {
      // Fallback for browsers that block clipboard without interaction
      toast({
        title: 'Could not copy',
        description: `Copy this link manually: ${SHARE_URL}`,
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleTweet = () => {
    const url = `https://x.com/intent/post?text=${encodeURIComponent(TWEET_TEXT)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="#e2e8f0"
      borderRadius="14px"
      p={6}
    >
      {/* Header */}
      <HStack spacing={3} mb={5}>
        <Box
          w={9} h={9} borderRadius="10px"
          bg="#fef0f5" border="1px solid #fbc8d9"
          display="flex" alignItems="center" justifyContent="center"
          flexShrink={0}
        >
          <Icon as={RiHeart2Line} color="#e84393" boxSize="16px" />
        </Box>
        <Box>
          <Text fontWeight="700" fontSize="14px" color="#1C2B3A">
            Share Spendable
          </Text>
          <Text fontSize="12px" color="#64748b">
            Help other freelancers find financial clarity
          </Text>
        </Box>
      </HStack>

      {/* Body */}
      <VStack align="stretch" spacing={4}>
        <Text fontSize="13px" color="#475569" lineHeight="1.6">
          Love Spendable? Share it with other freelancers who struggle with
          irregular income — it only takes a second.
        </Text>

        <HStack spacing={3}>
          <Button
            leftIcon={<Icon as={RiLink} />}
            onClick={handleCopyLink}
            variant="outline"
            borderColor="#e2e8f0"
            bg="white"
            color="#475569"
            size="sm"
            h="36px"
            px={4}
            borderRadius="9px"
            fontWeight="600"
            fontSize="13px"
            _hover={{ bg: '#f8fafc', borderColor: '#4C5FD5', color: '#4C5FD5' }}
          >
            Copy Link
          </Button>

          <Button
            leftIcon={<Icon as={RiTwitterXLine} />}
            onClick={handleTweet}
            variant="outline"
            borderColor="#e2e8f0"
            bg="white"
            color="#475569"
            size="sm"
            h="36px"
            px={4}
            borderRadius="9px"
            fontWeight="600"
            fontSize="13px"
            _hover={{ bg: '#f0f9ff', borderColor: '#0ea5e9', color: '#0284c7' }}
          >
            Post on X
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
