import { useEffect, useState } from 'react';
import {
  Box, HStack, Text, Button, Icon, IconButton,
} from '@chakra-ui/react';
import { RiDownloadLine, RiCloseLine } from 'react-icons/ri';
import { SpendableMark } from './SpendableMark';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'spendable_pwa_install_dismissed';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed permanently
    try {
      if (localStorage.getItem(DISMISS_KEY) === 'true') return;
    } catch { /* ignore */ }

    // Don't show if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, 'true'); } catch { /* ignore */ }
  };

  if (!show) return null;

  return (
    <Box
      position="fixed"
      bottom={{ base: 4, md: 6 }}
      left="50%"
      transform="translateX(-50%)"
      zIndex={1000}
      w={{ base: 'calc(100% - 32px)', md: 'auto' }}
      maxW="400px"
      bg="white"
      border="1px solid #e2e8f0"
      borderRadius="14px"
      boxShadow="0 8px 32px rgba(0,0,0,0.12)"
      px={4}
      py={3.5}
    >
      <HStack spacing={3} align="center">
        <SpendableMark size={36} rx={9} />
        <Box flex={1} minW={0}>
          <Text fontSize="13px" fontWeight="700" color="#1C2B3A">
            Add Spendable to home screen
          </Text>
          <Text fontSize="11px" color="#5a6a7a">
            Quick access, works offline
          </Text>
        </Box>
        <Button
          size="sm" bg="#4C5FD5" color="white"
          borderRadius="8px" fontWeight="600" fontSize="12px"
          h="30px" px={3}
          leftIcon={<Icon as={RiDownloadLine} boxSize="12px" />}
          _hover={{ bg: '#3D4FBF' }}
          onClick={handleInstall}
          flexShrink={0}
        >
          Install
        </Button>
        <IconButton
          aria-label="Dismiss"
          icon={<Icon as={RiCloseLine} boxSize="14px" />}
          size="xs" variant="ghost" color="#8a9aaa"
          borderRadius="6px"
          _hover={{ color: '#5a6a7a', bg: '#f8fafc' }}
          onClick={handleDismiss}
          flexShrink={0}
        />
      </HStack>
    </Box>
  );
}
