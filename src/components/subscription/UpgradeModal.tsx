import {
  Modal, ModalOverlay, ModalContent, ModalBody, ModalCloseButton,
  Box, HStack, VStack, Text, Button, Icon, List, ListItem, ListIcon, useToast,
  Skeleton,
} from '@chakra-ui/react';
import { RiCheckLine, RiFlashlightLine } from 'react-icons/ri';
import { useAuth } from '../../hooks/useAuth';
import { createCheckoutSession, PLANS, FREE_INCOME_LIMIT } from '../../services/stripe';
import { usePrices, type CurrencyKey } from '../../hooks/usePrices';
import { useState, useEffect } from 'react';

const VALID_KEYS: CurrencyKey[] = ['usd', 'gbp', 'eur', 'cad', 'aud'];

function toCurrencyKey(raw?: string): CurrencyKey {
  const lower = raw?.toLowerCase() as CurrencyKey;
  return VALID_KEYS.includes(lower) ? lower : 'usd';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'income_limit' | 'csv_export' | 'forecast' | 'manual';
  userCurrency?: string;
}

const REASON_COPY: Record<NonNullable<Props['reason']>, { title: string; body: string }> = {
  income_limit: {
    title: "You've reached your free limit",
    body:  `Free plan allows up to ${FREE_INCOME_LIMIT} income entries total. Upgrade to Pro for unlimited tracking.`,
  },
  csv_export: {
    title: 'CSV export is a Pro feature',
    body:  'Upgrade to Pro to export your income and expenses as CSV files.',
  },
  forecast: {
    title: 'Full forecast is a Pro feature',
    body:  'Upgrade to Pro to unlock the complete 6-month financial forecast.',
  },
  manual: {
    title: 'Upgrade to Spendable Pro',
    body:  'Get unlimited income tracking, full forecasts, CSV exports and more.',
  },
};

const CURRENCY_SYMBOLS: Record<CurrencyKey, string> = {
  usd: '$', gbp: '£', eur: '€', cad: 'C$', aud: 'A$',
};

export function UpgradeModal({ isOpen, onClose, reason = 'manual', userCurrency }: Props) {
  const { user } = useAuth();
  const toast    = useToast();
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState<CurrencyKey>(() => toCurrencyKey(userCurrency));
  const { loading: pricesLoading, label } = usePrices();

  useEffect(() => {
    if (isOpen) setCurrency(toCurrencyKey(userCurrency));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const surface = '#ffffff';
  const border  = '#E8E8E3';
  const muted   = '#5a6a7a';
  const copy    = REASON_COPY[reason];

  const CURRENCY_OPTIONS: { key: CurrencyKey }[] = [
    { key: 'usd' }, { key: 'gbp' }, { key: 'eur' }, { key: 'cad' }, { key: 'aud' },
  ];

  const handleUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await createCheckoutSession(currency);
    } catch (err) {
      toast({
        title: 'Could not start checkout',
        description: err instanceof Error ? err.message : 'Please try again',
        status: 'error', duration: 4000, isClosable: true,
      });
      setLoading(false);
    }
  };

  function currencyLabel(key: CurrencyKey): string {
    const sym = CURRENCY_SYMBOLS[key];
    return `${sym} ${key.toUpperCase()} — ${pricesLoading ? '…' : label(key)}`;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(6px)" />
      <ModalContent borderRadius="20px" border="1px solid" borderColor={border} shadow="2xl" bg={surface} overflow="hidden">
        <ModalCloseButton color={muted} />

        <Box
          px={6} pt={8} pb={6}
          bgGradient="linear(135deg, #1C2B3A 0%, #253344 100%)"
          position="relative" overflow="hidden"
        >
          <Box position="absolute" top="-40px" right="-40px" w="180px" h="180px" borderRadius="full"
            bg="radial-gradient(circle, rgba(76,95,213,0.35) 0%, transparent 70%)" pointerEvents="none" />
          <HStack spacing={3} mb={3}>
            <Box w={9} h={9} borderRadius="10px" bg="rgba(76,95,213,0.3)"
              display="flex" alignItems="center" justifyContent="center">
              <Icon as={RiFlashlightLine} color="#7b8fec" boxSize="18px" />
            </Box>
            <Box px={2.5} py={0.5} borderRadius="full"
              bg="rgba(76,95,213,0.25)" border="1px solid rgba(76,95,213,0.4)">
              <Text fontSize="11px" fontWeight="700" color="#7b8fec" letterSpacing="0.5px">PRO PLAN</Text>
            </Box>
          </HStack>
          <Text fontSize="18px" fontWeight="800" color="white" letterSpacing="-0.5px" mb={1}>{copy.title}</Text>
          <Text fontSize="13px" color="#8FABBF" lineHeight="1.5">{copy.body}</Text>
        </Box>

        <ModalBody px={6} py={5}>
          <VStack spacing={5} align="stretch">
            <List spacing={2}>
              {PLANS.pro.features.map(f => (
                <ListItem key={f} display="flex" alignItems="center">
                  <ListIcon as={RiCheckLine} color="#27AE60" boxSize="16px" mt="1px" />
                  <Text fontSize="13px" color="#1C2B3A" fontWeight="500">{f}</Text>
                </ListItem>
              ))}
            </List>

            <Box>
              <HStack spacing={2} mb={2}>
                {CURRENCY_OPTIONS.slice(0, 3).map(({ key: c }) => (
                  <Button key={c} size="sm" borderRadius="8px" flex={1}
                    bg={currency === c ? '#4C5FD5' : 'white'}
                    color={currency === c ? 'white' : '#5a6a7a'}
                    borderWidth="1px" borderColor="#E8E8E3"
                    fontWeight="600" fontSize="11px"
                    _hover={{ bg: currency === c ? '#3D4FBF' : '#f8fafc' }}
                    onClick={() => setCurrency(c)}>
                    {currencyLabel(c)}
                  </Button>
                ))}
              </HStack>
              <HStack spacing={2}>
                {CURRENCY_OPTIONS.slice(3).map(({ key: c }) => (
                  <Button key={c} size="sm" borderRadius="8px" flex={1}
                    bg={currency === c ? '#4C5FD5' : 'white'}
                    color={currency === c ? 'white' : '#5a6a7a'}
                    borderWidth="1px" borderColor="#E8E8E3"
                    fontWeight="600" fontSize="11px"
                    _hover={{ bg: currency === c ? '#3D4FBF' : '#f8fafc' }}
                    onClick={() => setCurrency(c)}>
                    {currencyLabel(c)}
                  </Button>
                ))}
              </HStack>
            </Box>

            <Skeleton isLoaded={!pricesLoading} borderRadius="10px">
              <Button size="md" borderRadius="10px" w="full"
                bg="#4C5FD5" color="white" fontWeight="700" fontSize="14px"
                _hover={{ bg: '#3D4FBF' }}
                isLoading={loading} loadingText="Opening checkout…"
                onClick={handleUpgrade}>
                Upgrade to Pro — {label(currency)}/month
              </Button>
            </Skeleton>

            <Text fontSize="11px" color={muted} textAlign="center">
              Cancel anytime · Secure payment via Stripe
            </Text>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
