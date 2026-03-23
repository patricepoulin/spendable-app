import { Box, VStack, Text, HStack, Icon, Divider, Link as ChakraLink,
} from '@chakra-ui/react';
import { RiArrowLeftLine } from 'react-icons/ri';
import { SpendableMark } from '../components/ui/SpendableMark';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { PAGE_BG } from '../theme';

const EFFECTIVE_DATE = '15 March 2026';
const COMPANY = 'Spendable';
const EMAIL = 'hello@spendable.finance';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Text fontWeight="700" fontSize="16px" color="#1C2B3A" mb={3}>{title}</Text>
      <Box fontSize="14px" color="#5a6a7a" lineHeight="1.8">{children}</Box>
    </Box>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack align="flex-start" spacing={3} py={2} borderBottom="1px solid #F0EFE9">
      <Text fontSize="13px" fontWeight="600" color="#1C2B3A" w="180px" flexShrink={0}>{label}</Text>
      <Text fontSize="13px" color="#5a6a7a" flex={1}>{value}</Text>
    </HStack>
  );
}

export function PrivacyPage() {
  usePageTitle('Privacy Policy');
  const navigate = useNavigate();
  return (
    <Box minH="100vh" bg={PAGE_BG} py={12} px={6}>
      <Box maxW="720px" mx="auto">

        {/* Header */}
        <HStack spacing={3} mb={8}>
          <SpendableMark size={36} rx={9} />
          <Box>
            <Text fontWeight="800" fontSize="20px" letterSpacing="-0.5px" color="#1C2B3A">Spendable</Text>
            <Text fontSize="12px" color="#8a9aaa">Privacy Policy</Text>
          </Box>
        </HStack>

        <Box bg="white" border="1px solid #E8E8E3" borderRadius="16px" p={{ base: 6, md: 10 }}
          boxShadow="0 1px 3px rgba(0,0,0,0.05)">

          <Text fontFamily="'Inter', sans-serif" fontWeight="800" fontSize="28px"
            letterSpacing="-1px" color="#1C2B3A" mb={2}>
            Privacy Policy
          </Text>
          <Text fontSize="13px" color="#8a9aaa" mb={4}>
            Effective date: {EFFECTIVE_DATE} · {COMPANY}
          </Text>

          {/* TL;DR */}
          <Box bg="#eef0fb" border="1px solid #c7d0f5" borderRadius="12px" p={4} mb={8}>
            <Text fontSize="13px" fontWeight="700" color="#3d4faf" mb={1}>The short version</Text>
            <Text fontSize="13px" color="#3d4faf" lineHeight="1.6">
              We collect only what's needed to run the service. We don't sell your data. All financial calculations happen in your browser. You can delete everything at any time.
            </Text>
          </Box>

          <VStack spacing={7} align="stretch">

            <Section title="1. Who We Are">
              <Text>{COMPANY} operates Spendable, a personal finance tool for freelancers. For GDPR purposes, we are the data controller for personal data collected through the service. Contact: <ChakraLink href={`mailto:${EMAIL}`} color="#4C5FD5" fontWeight="600">{EMAIL}</ChakraLink></Text>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="2. What Data We Collect">
              <VStack spacing={0} align="stretch" mb={3}>
                <DataRow label="Account data" value="Your email address and hashed password, used for authentication." />
                <DataRow label="Financial data" value="Income entries, recurring expenses, upcoming expenses, and settings you enter manually. We do not connect to your bank." />
                <DataRow label="Subscription data" value="Your Stripe customer ID and subscription status. We do not store card numbers — these are held by Stripe." />
                <DataRow label="Usage data" value="Basic anonymised analytics (page views, feature usage) to improve the product. No personally identifiable information is included." />
                <DataRow label="Technical data" value="IP address, browser type, and device type, collected by our infrastructure provider (Supabase) for security and debugging." />
              </VStack>
              <Text>We do not collect sensitive categories of personal data (race, health, political views, etc.).</Text>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="3. How We Use Your Data">
              <VStack spacing={1} align="stretch">
                {[
                  ['Providing the service', 'Storing your financial data and performing calculations on your behalf.'],
                  ['Authentication', 'Verifying your identity when you sign in.'],
                  ['Billing', 'Processing subscription payments via Stripe and managing your plan.'],
                  ['Product improvement', 'Anonymised usage analytics to understand how features are used.'],
                  ['Support', 'Responding to requests you send to our support email.'],
                  ['Legal compliance', 'Meeting our obligations under applicable law, including GDPR and UK GDPR.'],
                ].map(([basis, purpose]) => (
                  <HStack key={basis} align="flex-start" spacing={3}>
                    <Text fontSize="13px" fontWeight="600" color="#1C2B3A" w="170px" flexShrink={0}>{basis}</Text>
                    <Text fontSize="13px" color="#5a6a7a">{purpose}</Text>
                  </HStack>
                ))}
              </VStack>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="4. Legal Basis for Processing (GDPR / UK GDPR)">
              <VStack spacing={2} align="stretch">
                <Text><strong>Contract:</strong> Processing your account and financial data is necessary to provide the service you have signed up for.</Text>
                <Text><strong>Legitimate interests:</strong> Anonymised analytics and security monitoring to protect users and improve the product.</Text>
                <Text><strong>Legal obligation:</strong> Retaining billing records as required by financial regulations.</Text>
                <Text><strong>Consent:</strong> Where we ask for optional consent (e.g. marketing emails), you may withdraw it at any time.</Text>
              </VStack>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="5. Data Sharing">
              <Text mb={3}>We do not sell or rent your personal data. We share data only with trusted sub-processors necessary to operate the service:</Text>
              <VStack spacing={0} align="stretch">
                <DataRow label="Supabase" value="Database hosting and authentication. Servers located in the EU. Privacy policy: supabase.com/privacy" />
                <DataRow label="Stripe" value="Payment processing. Stripe is PCI-DSS compliant. Privacy policy: stripe.com/privacy" />
              </VStack>
              <Text mt={3}>We may disclose data if required by law, court order, or to protect the rights and safety of users.</Text>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="6. Data Retention">
              <VStack spacing={2} align="stretch">
                <Text><strong>Account data:</strong> Retained while your account is active. Deleted within 30 days of account deletion.</Text>
                <Text><strong>Financial data:</strong> Deleted immediately upon account deletion.</Text>
                <Text><strong>Billing records:</strong> Retained for 7 years as required by UK financial regulations, even after account deletion.</Text>
                <Text><strong>Anonymised analytics:</strong> Retained indefinitely (no personal data involved).</Text>
              </VStack>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="7. Your Rights">
              <Text mb={3}>Under UK GDPR and EU GDPR you have the right to:</Text>
              <VStack spacing={1} align="stretch" pl={2}>
                {[
                  'Access the personal data we hold about you',
                  'Correct inaccurate data',
                  'Request deletion of your data ("right to be forgotten")',
                  'Restrict or object to processing in certain circumstances',
                  'Data portability — export your data in a machine-readable format (use the CSV export in Settings)',
                  'Lodge a complaint with the UK Information Commissioner\'s Office (ICO) at ico.org.uk',
                ].map(right => (
                  <HStack key={right} spacing={2} align="flex-start">
                    <Text color="#27AE60" flexShrink={0}>✓</Text>
                    <Text>{right}</Text>
                  </HStack>
                ))}
              </VStack>
              <Text mt={3}>To exercise any of these rights, email <ChakraLink href={`mailto:${EMAIL}`} color="#4C5FD5" fontWeight="600">{EMAIL}</ChakraLink>. We will respond within 30 days.</Text>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="8. Cookies">
              <Text>We use only functional cookies necessary to keep you signed in (a session token). We do not use advertising or tracking cookies. No cookie consent banner is required as we do not use non-essential cookies.</Text>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="9. Security">
              <Text>All data is transmitted over HTTPS. Passwords are hashed and never stored in plain text. Database access is restricted to authenticated services. We conduct regular security reviews. However, no system is 100% secure — if you believe your account has been compromised, contact us immediately.</Text>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="10. Children">
              <Text>Spendable is not directed at children under 18. We do not knowingly collect data from anyone under 18. If you believe a child has provided us with data, please contact us and we will delete it promptly.</Text>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="11. Changes to This Policy">
              <Text>We will notify you by email of any material changes at least 14 days before they take effect. The current version will always be available at this URL.</Text>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="12. Contact & Complaints">
              <Text>
                Data controller: {COMPANY}<br />
                Email: <ChakraLink href={`mailto:${EMAIL}`} color="#4C5FD5" fontWeight="600">{EMAIL}</ChakraLink><br />
                If you are not satisfied with our response, you have the right to complain to the ICO at <ChakraLink href="https://ico.org.uk" color="#4C5FD5" isExternal>ico.org.uk</ChakraLink>.
              </Text>
            </Section>

          </VStack>
        </Box>

        <HStack mt={6} spacing={2}>
          <HStack spacing={1} color="#8a9aaa" _hover={{ color: '#4C5FD5' }} transition="color 0.15s"
            fontSize="13px" cursor="pointer" onClick={() => navigate(-1)}>
            <Icon as={RiArrowLeftLine} boxSize="14px" />
            <Text fontWeight="500">Back</Text>
          </HStack>
          <Text color="#E8E8E3">·</Text>
          <Link to="/terms">
            <Text fontSize="13px" color="#8a9aaa" _hover={{ color: '#4C5FD5' }} transition="color 0.15s" fontWeight="500">
              Terms of Service
            </Text>
          </Link>
        </HStack>
      </Box>
    </Box>
  );
}
