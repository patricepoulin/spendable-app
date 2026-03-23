import { Box, VStack, HStack, Text, Button, Icon } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import {
  RiAddLine, RiRepeatLine, RiPercentLine,
  RiCheckLine, RiArrowRightLine,
} from 'react-icons/ri';
import { PAGE_BG } from '../../theme';
import { SpendableMark } from '../ui/SpendableMark';

// ─── Step definition ──────────────────────────────────────────────────────────

interface Step {
  number:      number;
  icon:        React.ElementType;
  iconBg:      string;
  iconColor:   string;
  title:       string;
  description: string;
  cta:         string;
  route:       string;
}

const STEPS: Step[] = [
  {
    number:      1,
    icon:        RiAddLine,
    iconBg:      '#eef0fb',
    iconColor:   '#4C5FD5',
    title:       'Add your income',
    description: 'Record a recent payment or invoice to start building your financial picture.',
    cta:         'Add Income',
    route:       '/income',
  },
  {
    number:      2,
    icon:        RiRepeatLine,
    iconBg:      '#f0fdf4',
    iconColor:   '#27AE60',
    title:       'Add recurring expenses',
    description: 'Add your regular outgoings — rent, subscriptions, insurance — so we know your baseline costs.',
    cta:         'Add Expenses',
    route:       '/expenses',
  },
  {
    number:      3,
    icon:        RiPercentLine,
    iconBg:      '#fffbeb',
    iconColor:   '#D4A800',
    title:       'Set your tax rate & payment schedule',
    description: 'Set your effective tax rate and choose your tax payment schedule (annual for UK, quarterly for US/CA/AU) so the Tax Tracker shows the right deadlines for your region.',
    cta:         'Go to Settings',
    route:       '/settings',
  },
];

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ step, index }: { step: Step; index: number }) {
  const navigate = useNavigate();

  return (
    <Box
      bg="white"
      border="1px solid #E8E8E3"
      borderRadius="14px"
      p={5}
      position="relative"
      transition="all 0.15s"
      _hover={{ borderColor: '#4C5FD5', shadow: 'sm' }}
    >
      <HStack spacing={4} align="flex-start">
        {/* Step number + icon */}
        <VStack spacing={1.5} align="center" flexShrink={0}>
          <Box
            w={10} h={10} borderRadius="12px"
            bg={step.iconBg}
            display="flex" alignItems="center" justifyContent="center"
          >
            <Icon as={step.icon} color={step.iconColor} boxSize="18px" />
          </Box>
          <Box
            w={5} h={5} borderRadius="full"
            bg="#f1f5f9"
            display="flex" alignItems="center" justifyContent="center"
          >
            <Text fontSize="10px" fontWeight="700" color="#64748b">{index + 1}</Text>
          </Box>
        </VStack>

        {/* Content */}
        <Box flex={1} pt={0.5}>
          <Text fontSize="14px" fontWeight="700" color="#1C2B3A" mb={1}>
            {step.title}
          </Text>
          <Text fontSize="12px" color="#64748b" lineHeight="1.6" mb={3}>
            {step.description}
          </Text>
          <Button
            rightIcon={<Icon as={RiArrowRightLine} />}
            size="sm"
            h="34px"
            px={4}
            bg="#4C5FD5"
            color="white"
            borderRadius="9px"
            fontWeight="600"
            fontSize="12px"
            _hover={{ bg: '#3D4FBF' }}
            onClick={() => navigate(step.route)}
          >
            {step.cta}
          </Button>
        </Box>
      </HStack>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingEmptyState() {
  return (
    <Box bg={PAGE_BG} minH="100vh">
      {/* Subtle background blobs */}
      <Box position="fixed" top="-100px" right="-100px" w="500px" h="500px" borderRadius="full"
        bg="radial-gradient(circle, rgba(76,95,213,0.06) 0%, transparent 70%)" pointerEvents="none" zIndex={0} />
      <Box position="fixed" bottom="-60px" left="-60px" w="400px" h="400px" borderRadius="full"
        bg="radial-gradient(circle, rgba(39,174,96,0.05) 0%, transparent 70%)" pointerEvents="none" zIndex={0} />

      <Box
        position="relative" zIndex={1}
        maxW="520px" mx="auto"
        px={{ base: 4, md: 0 }}
        pt={{ base: 12, md: 20 }}
        pb={16}
      >
        {/* Logo mark */}
        <Box display="flex" justifyContent="center" mb={6}
          filter="drop-shadow(0 6px 20px rgba(76,95,213,0.22))">
          <SpendableMark size={56} rx={15} />
        </Box>

        {/* Headline */}
        <VStack spacing={2} mb={8} textAlign="center">
          <Text fontSize={{ base: '22px', md: '26px' }} fontWeight="800" color="#1C2B3A" letterSpacing="-0.5px">
            Welcome to Spendable
          </Text>
          <Text fontSize="14px" color="#64748b" maxW="380px" mx="auto" lineHeight="1.7">
            Let's set up the basics so Spendable can calculate how much you can safely spend.
          </Text>
        </VStack>

        {/* Steps */}
        <VStack spacing={3} align="stretch" mb={8}>
          {STEPS.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </VStack>

        {/* Footer reassurance */}
        <HStack spacing={2} justify="center">
          <Icon as={RiCheckLine} color="#27AE60" boxSize="14px" />
          <Text fontSize="12px" color="#94a3b8" textAlign="center">
            You can always change these later in Settings
          </Text>
        </HStack>
      </Box>
    </Box>
  );
}
