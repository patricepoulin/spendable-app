import {
  Box, Flex, VStack, Text, Icon, HStack,
  Avatar, Divider, IconButton, Tooltip,
  Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton,
  useDisclosure,
  Button,
} from '@chakra-ui/react';
import { Link, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  RiDashboardLine, RiMoneyDollarCircleLine,
  RiExchangeDollarLine, RiSettings3Line, RiLogoutBoxLine,
  RiWifiOffLine, RiLineChartLine,
  RiSignalWifiErrorLine, RiCalendarEventLine, RiMenuLine,
  RiAlertLine, RiExternalLinkLine, RiPercentLine,
} from 'react-icons/ri';
import { useAuth } from '../../hooks/useAuth';
import { SpendableMark } from '../ui/SpendableMark';
import { useSubscription } from '../../hooks/useSubscription';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { PAGE_BG } from '../../theme';
import { openCustomerPortal } from '../../services/stripe';
import { useState } from 'react';

const NAV_ITEMS = [
  { label: 'Dashboard',    icon: RiDashboardLine,         href: '/'            },
  { label: 'Income',       icon: RiMoneyDollarCircleLine, href: '/income'      },
  { label: 'Expenses',     icon: RiExchangeDollarLine,    href: '/expenses'    },
  { label: 'Upcoming',     icon: RiCalendarEventLine,     href: '/upcoming'    },
  { label: 'Tax Tracker',  icon: RiPercentLine,           href: '/tax'         },
  { label: 'Forecast',     icon: RiLineChartLine,         href: '/forecast'    },
  { label: 'Settings',     icon: RiSettings3Line,         href: '/settings'    },
];

const S = {
  bg:            '#1C2B3A',
  border:        '#253344',
  activeBg:      '#253344',
  activeText:    '#FFFFFF',
  inactiveText:  '#8FABBF',
  hoverBg:       '#243040',
  hoverText:     '#FFFFFF',
  mutedText:     '#5a7085',
  calloutBg:     '#16222f',
  calloutBorder: '#2d3e50',
  calloutText:   '#8FABBF',
  calloutLabel:  '#6b84f5',
  divider:       '#253344',
  avatarBg:      '#4C5FD5',
  signoutHover:  '#EB5757',
};

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, signOut } = useAuth();
  const { pathname }      = useLocation();

  return (
    <Flex direction="column" bg={S.bg} h="100%" py={5} px={3}>

      {/* Logo */}
      <HStack px={3} mb={6} spacing={2.5} cursor="pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        _hover={{ opacity: 0.85 }} transition="opacity 0.15s">
        <SpendableMark size={32} rx={8} />
        <Box>
          <Text fontWeight="700" fontSize="15px" letterSpacing="-0.3px" lineHeight="1.1" color="white">
            Spendable
          </Text>
          <Text fontSize="10px" color={S.mutedText} letterSpacing="0.5px" textTransform="uppercase" fontWeight="500">
            Financial clarity
          </Text>
        </Box>
      </HStack>

      {/* Callout */}
      <Box mx={0} mb={5} px={3} py={2.5} bg={S.calloutBg} borderRadius="8px"
        border="1px solid" borderColor={S.calloutBorder}>
        <Text fontSize="10px" fontWeight="700" color={S.calloutLabel} textTransform="uppercase" letterSpacing="0.7px" mb={0.5}>
          Your question
        </Text>
        <Text fontSize="12px" color={S.calloutText} fontWeight="500" lineHeight="1.45">
          "How much can I safely spend right now?"
        </Text>
      </Box>

      {/* Nav items */}
      <VStack spacing={0.5} align="stretch" flex={1}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link to={item.href} key={item.href} onClick={onClose}>
              <HStack
                px={3} py={2.5} borderRadius="8px" spacing={3}
                bg={isActive ? S.activeBg : 'transparent'}
                color={isActive ? S.activeText : S.inactiveText}
                borderLeft={isActive ? '3px solid #4C5FD5' : '3px solid transparent'}
                _hover={{ bg: S.hoverBg, color: S.hoverText }}
                transition="all 0.12s" cursor="pointer"
              >
                <Icon as={item.icon} boxSize="16px" flexShrink={0} />
                <Text fontSize="13.5px" fontWeight={isActive ? '600' : '500'} letterSpacing="-0.1px">
                  {item.label}
                </Text>
              </HStack>
            </Link>
          );
        })}
      </VStack>

      {/* User footer */}
      <Box>
        <Divider borderColor={S.divider} mb={4} />
        <HStack px={3} justify="space-between">
          <HStack spacing={2.5} overflow="hidden">
            <Avatar size="xs" name={user?.email ?? ''}
              bg={S.avatarBg} color="white" fontSize="10px" />
            <Text fontSize="12px" color={S.inactiveText} isTruncated maxW="120px" fontWeight="500">
              {user?.email}
            </Text>
          </HStack>
          <Tooltip label="Sign out" placement="right">
            <IconButton
              aria-label="Sign out"
              icon={<Icon as={RiLogoutBoxLine} boxSize="14px" />}
              size="xs" variant="ghost"
              color={S.mutedText}
              _hover={{ color: S.signoutHover, bg: 'transparent' }}
              onClick={() => signOut()}
            />
          </Tooltip>
        </HStack>
      </Box>
    </Flex>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isMockMode }              = useAuth();
  const isOnline                    = useOnlineStatus();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isPaymentFailing }        = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const handleUpdateBilling = async () => {
    setPortalLoading(true);
    try { await openCustomerPortal('payment_method_update'); }
    catch { /* portal will handle errors */ }
    finally { setPortalLoading(false); }
  };

  const showMockBanner    = isMockMode && isOnline;
  const showOfflineBanner = !isOnline && !isMockMode;

  return (
    <Flex minH="100vh" bg={PAGE_BG}>

      {/* Desktop sidebar */}
      <Box display={{ base: 'none', md: 'flex' }}
        w="230px" borderRight="1px solid" borderColor={S.border}
        position="fixed" h="100vh" zIndex={10} flexDirection="column">
        <SidebarContent />
      </Box>

      {/* Mobile drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent bg={S.bg} maxW="230px">
          <DrawerCloseButton color="white" mt={1} />
          <SidebarContent onClose={onClose} />
        </DrawerContent>
      </Drawer>

      {/* Main content */}
      <Box flex={1} ml={{ base: 0, md: '230px' }} minH="100vh" bg={PAGE_BG}>

        {/* Mobile top bar */}
        <HStack display={{ base: 'flex', md: 'none' }} px={4} py={3} bg={S.bg}
          justify="space-between" position="sticky" top={0} zIndex={9}
          borderBottom="1px solid" borderColor={S.border}>
          <HStack spacing={2.5} cursor="pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            _hover={{ opacity: 0.85 }} transition="opacity 0.15s">
            <SpendableMark size={28} rx={7} />
            <Text fontWeight="700" fontSize="14px" color="white" letterSpacing="-0.3px">
              Spendable
            </Text>
          </HStack>
          <IconButton aria-label="Open menu" icon={<Icon as={RiMenuLine} boxSize="18px" />}
            size="sm" variant="ghost" color="white" _hover={{ bg: '#253344' }}
            onClick={onOpen} />
        </HStack>

        {showMockBanner && (
          <HStack px={4} py={2} bg="#fef9c3" borderBottom="1px solid #fde68a" spacing={2}>
            <Icon as={RiWifiOffLine} color="#b45309" boxSize="14px" />
            <Text fontSize="12px" fontWeight="600" color="#b45309">
              Offline mode — using mock data. Changes are saved locally and won't sync to Supabase.
            </Text>
          </HStack>
        )}

        {showOfflineBanner && (
          <HStack px={4} py={2} bg="#fef9c3" borderBottom="1px solid #fde68a" spacing={2}>
            <Icon as={RiSignalWifiErrorLine} color="#b45309" boxSize="14px" flexShrink={0} />
            <Text fontSize="12px" fontWeight="600" color="#b45309">
              You're offline — showing your last saved data. Changes are disabled until you reconnect.
            </Text>
          </HStack>
        )}

        {isPaymentFailing && (
          <HStack
            px={4} py={2.5}
            bg="#fff1f2" borderBottom="1px solid #fecdd3"
            spacing={3} justify="space-between" flexWrap="wrap"
          >
            <HStack spacing={2}>
              <Icon as={RiAlertLine} color="#e11d48" boxSize="15px" flexShrink={0} />
              <Text fontSize="12px" fontWeight="600" color="#9f1239">
                Payment issue — your last payment failed. Please update your billing details to keep Pro access.
              </Text>
            </HStack>
            <Button
              size="xs"
              rightIcon={<Icon as={RiExternalLinkLine} boxSize="11px" />}
              bg="#e11d48" color="white"
              borderRadius="6px" fontWeight="700" fontSize="11px"
              _hover={{ bg: '#be123c' }}
              flexShrink={0}
              isLoading={portalLoading}
              loadingText="Opening…"
              onClick={handleUpdateBilling}
            >
              Update billing
            </Button>
          </HStack>
        )}

        {children}
      </Box>
    </Flex>
  );
}
