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

export function TermsPage() {
  usePageTitle('Terms of Service');
  const navigate = useNavigate();
  return (
    <Box minH="100vh" bg={PAGE_BG} py={12} px={6}>
      <Box maxW="720px" mx="auto">

        {/* Header */}
        <HStack spacing={3} mb={8}>
          <SpendableMark size={36} rx={9} />
          <Box>
            <Text fontWeight="800" fontSize="20px" letterSpacing="-0.5px" color="#1C2B3A">Spendable</Text>
            <Text fontSize="12px" color="#8a9aaa">Terms of Service</Text>
          </Box>
        </HStack>

        <Box bg="white" border="1px solid #E8E8E3" borderRadius="16px" p={{ base: 6, md: 10 }}
          boxShadow="0 1px 3px rgba(0,0,0,0.05)">

          <Text fontFamily="'Inter', sans-serif" fontWeight="800" fontSize="28px"
            letterSpacing="-1px" color="#1C2B3A" mb={2}>
            Terms of Service
          </Text>
          <Text fontSize="13px" color="#8a9aaa" mb={8}>
            Effective date: {EFFECTIVE_DATE} · {COMPANY}
          </Text>

          <VStack spacing={7} align="stretch">

            <Section title="1. Acceptance of Terms">
              <Text>By creating an account or using Spendable, you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the service. These terms apply to all users including those on the Free plan and paying Pro subscribers.</Text>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="2. Description of Service">
              <Text>Spendable is a personal finance tool designed to help freelancers and self-employed individuals understand how much they can safely spend given their income, tax obligations, and expenses. Spendable is a financial planning aid — it does not constitute financial advice. Always consult a qualified financial adviser for decisions of material consequence.</Text>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="3. Account Registration">
              <VStack spacing={2} align="stretch">
                <Text>You must provide a valid email address to create an account. You are responsible for maintaining the confidentiality of your password and for all activity that occurs under your account.</Text>
                <Text>You must be at least 18 years old to use Spendable. By registering, you confirm that you meet this requirement.</Text>
                <Text>You agree not to create accounts for others without their permission, or use automated means to create accounts.</Text>
              </VStack>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="4. Subscription Plans and Billing">
              <VStack spacing={2} align="stretch">
                <Text><strong>Free plan:</strong> Available at no cost with limits on income entries and expenses. No credit card is required.</Text>
                <Text><strong>Pro plan:</strong> Charged monthly at the rate displayed at checkout (USD, GBP, EUR, CAD, or AUD depending on your region). Payments are processed securely by Stripe. We do not store your payment card details.</Text>
                <Text><strong>Cancellation:</strong> You may cancel your Pro subscription at any time from the Settings page. Your access continues until the end of the current billing period. After cancellation, you retain the ability to export your data for 30 days (grace period).</Text>
                <Text><strong>Refunds:</strong> We do not offer refunds for partial months. If you believe you have been charged in error, contact us at <ChakraLink href={`mailto:${EMAIL}`} color="#4C5FD5" fontWeight="600">{EMAIL}</ChakraLink> within 14 days.</Text>
                <Text><strong>Price changes:</strong> We will give at least 30 days' notice of any price change. Continued use after the notice period constitutes acceptance of the new price.</Text>
              </VStack>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="5. Your Data">
              <VStack spacing={2} align="stretch">
                <Text>You retain full ownership of all financial data you enter into Spendable. We do not sell, rent, or share your personal financial data with third parties except as necessary to operate the service (e.g. authentication via Supabase).</Text>
                <Text>All financial calculations happen client-side in your browser. We do not require you to connect bank accounts.</Text>
                <Text>You may request deletion of your account and all associated data at any time from Settings → Danger Zone. See our Privacy Policy for full details on data handling.</Text>
              </VStack>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="6. Acceptable Use">
              <Text mb={2}>You agree not to:</Text>
              <VStack spacing={1} align="stretch" pl={4}>
                {[
                  'Use the service for any unlawful purpose or in violation of any regulations',
                  'Attempt to gain unauthorised access to other users\' accounts or data',
                  'Reverse-engineer, scrape, or copy the service',
                  'Use the service to process or store data on behalf of others without their consent',
                  'Transmit malware, spam, or any harmful content through the service',
                ].map(item => (
                  <HStack key={item} spacing={2} align="flex-start">
                    <Text color="#EB5757" flexShrink={0} mt="2px">–</Text>
                    <Text>{item}</Text>
                  </HStack>
                ))}
              </VStack>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="7. Disclaimer of Warranties">
              <Text>Spendable is provided "as is" without warranties of any kind, express or implied. We do not warrant that the service will be error-free, uninterrupted, or accurate. Financial figures shown are estimates based on the data you provide and should not be relied upon as the sole basis for financial decisions.</Text>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="8. Limitation of Liability">
              <Text>To the maximum extent permitted by applicable law, {COMPANY} shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of Spendable, including but not limited to financial losses resulting from reliance on calculations provided by the service. Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.</Text>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="9. Governing Law">
              <Text>These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</Text>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="10. Changes to These Terms">
              <Text>We may update these terms from time to time. We will notify you by email and/or by a notice in the app at least 14 days before any material changes take effect. Continued use after that date constitutes acceptance.</Text>
            </Section>

            <Divider borderColor="#F0EFE9" />

            <Section title="11. Contact">
              <Text>Questions about these terms? Email us at <ChakraLink href={`mailto:${EMAIL}`} color="#4C5FD5" fontWeight="600">{EMAIL}</ChakraLink> — we respond within 2 business days.</Text>
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
          <Link to="/privacy">
            <Text fontSize="13px" color="#8a9aaa" _hover={{ color: '#4C5FD5' }} transition="color 0.15s" fontWeight="500">
              Privacy Policy
            </Text>
          </Link>
        </HStack>
      </Box>
    </Box>
  );
}
