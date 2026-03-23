import { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Input, Button, Icon,
  FormControl, FormLabel, Alert, AlertIcon,
  Tabs, TabList, Tab, TabPanels, TabPanel,
  Link, InputGroup, InputRightElement, IconButton,
} from '@chakra-ui/react';
import { RiEyeLine, RiEyeOffLine } from 'react-icons/ri';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { supabase } from '../lib/supabase';
import { Link as RouterLink } from 'react-router-dom';
import { SpendableMark } from '../components/ui/SpendableMark';
import { PAGE_BG } from '../theme';

const colors = {
  navy: '#1C2B3A', brand: '#4C5FD5', brandHover: '#3D4FBF',
  surface: '#FFFFFF',
  border: '#E8E8E3', surface2: '#F0EFE9',
  text: '#1C2B3A', muted: '#5a6a7a', subtle: '#8a9aaa',
  positive: '#27AE60',
};

const TRUST_SIGNALS = [
  'Tax reserves calculated automatically from your income',
  'Income smoothed over 6 months for irregular earners',
  'Know your runway and safe spending at a glance',
];

export function AuthPage() {
  const [activeTab, setActiveTab] = useState(0);
  usePageTitle(activeTab === 0 ? 'Sign In' : 'Create Account');
  const { signIn, signUp } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]         = useState('');
  const [showReset, setShowReset]     = useState(false);
  const [showResend, setShowResend]   = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Detect Supabase password-recovery redirect (email link → /auth#access_token=...)
  // Supabase fires onAuthStateChange with event='PASSWORD_RECOVERY' in this case.
  useEffect(() => {
    import('../lib/supabase').then(({ supabase: _sb }) => {
      if (!_sb) return;
      const { data: { subscription: sub } } = _sb.auth.onAuthStateChange((event: string) => {
        if (event === 'PASSWORD_RECOVERY') setIsRecoveryMode(true);
      });
      return () => sub.unsubscribe();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handle = async (type: 'signin' | 'signup') => {
    setError(''); setSuccess('');
    // Validate before setting loading — avoids spinner getting stuck on early return
    if (type === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters.'); return;
    }
    if (type === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.'); return;
    }
    setLoading(true);
    try {
      if (type === 'signin') await signIn(email, password);
      else {
        const result = await signUp(email, password);
        // Supabase returns an empty identities array when the email already
        // belongs to a confirmed account — show a clear message instead of
        // the misleading "Check your email" success copy.
        if (result.identities !== undefined && result.identities !== null && result.identities.length === 0) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setSuccess('Check your email to confirm your account!');
          setShowResend(true);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (type === 'signup' && (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('user already exists'))) {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (type === 'signin' && (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials'))) {
        setError('Incorrect email or password. Please try again.');
      } else {
        setError(msg || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) { setShowReset(true); return; }
    setError(''); setShowReset(false); setLoading(true);
    try {
      const { error } = await supabase!.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) { setShowReset(true); return; }  // same nudge as handleReset: highlight email field
    setError(''); setLoading(true);
    try {
      const { error } = await supabase!.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setSuccess('Confirmation email resent! Check your inbox.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resend confirmation email');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError(''); setLoading(true);
    try {
      const { supabase: _sb } = await import('../lib/supabase');
      const { error } = await _sb!.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess('Password updated! Taking you to sign in…');
      setNewPassword('');
      // After 2s: leave recovery mode and land on the Sign In tab
      setTimeout(() => {
        setIsRecoveryMode(false);
        setSuccess('');
        setActiveTab(0);
      }, 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg={PAGE_BG} display="flex" alignItems="center" justifyContent="center" p={6}>
      <Box w="full" maxW="420px">

        {/* Logo */}
        <VStack mb={7} spacing={1} align="center">
          <HStack spacing={3} mb={1}>
            <SpendableMark size={44} rx={12} />
            <Text fontWeight="800" fontSize="24px" letterSpacing="-0.8px" color={colors.text}>Spendable</Text>
          </HStack>
          <Text color={colors.muted} fontSize="14px" textAlign="center" maxW="280px" lineHeight="1.5">
            Financial confidence for freelancers with irregular income
          </Text>
        </VStack>

        {/* Password recovery form — shown after user clicks the reset email link */}
        {isRecoveryMode ? (
          <Box bg={colors.surface} border="1px solid" borderColor={colors.border}
            borderRadius="12px" p={6}
            boxShadow="0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)"
          >
            <Text fontWeight="700" fontSize="16px" color={colors.text} mb={1}>Set a new password</Text>
            <Text fontSize="13px" color={colors.muted} mb={5}>Choose a strong password for your account.</Text>
            <VStack spacing={4}>
              {error   && <Alert status="error"   borderRadius="8px" fontSize="13px"><AlertIcon />{error}</Alert>}
              {success && <Alert status="success" borderRadius="8px" fontSize="13px"><AlertIcon />{success}</Alert>}
              {!success && (
                <FormControl>
                  <FormLabel fontSize="12px" fontWeight="600" color={colors.muted} mb={1.5}>New password</FormLabel>
                  <InputGroup>
                    <Input type={showNewPassword ? 'text' : 'password'} placeholder="8+ characters" value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      borderRadius="8px" h="42px" fontSize="14px" borderColor={colors.border}
                      _hover={{ borderColor: colors.brand }} bg={colors.surface}
                      onKeyDown={e => e.key === 'Enter' && handleSetNewPassword()} />
                    <InputRightElement h="42px">
                      <IconButton aria-label={showNewPassword ? 'Hide' : 'Show'}
                        icon={<Icon as={showNewPassword ? RiEyeOffLine : RiEyeLine} boxSize="16px" />}
                        size="sm" variant="ghost" color={colors.muted} _hover={{ color: colors.brand, bg: 'transparent' }}
                        onClick={() => setShowNewPassword(v => !v)} />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
              )}
              {!success && (
                <Button w="full" h="42px" borderRadius="8px" bg={colors.brand} color="white"
                  fontWeight="600" fontSize="14px" _hover={{ bg: colors.brandHover }}
                  isLoading={loading} onClick={handleSetNewPassword}>
                  Update password
                </Button>
              )}
            </VStack>
          </Box>
        ) : (
          <Box bg={colors.surface} border="1px solid" borderColor={colors.border}
            borderRadius="12px" p={6}
            boxShadow="0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)"
          >
          <Tabs colorScheme="brand" variant="unstyled" size="sm" index={activeTab} onChange={setActiveTab}>
            <TabList
              mb={5} bg={colors.surface2} p={1} borderRadius="8px"
              border="1px solid" borderColor={colors.border}
            >
              {['Sign In', 'Create Account'].map((label, i) => (
                <Tab
                  key={label} flex={1} fontWeight="600" fontSize="13px"
                  borderRadius="6px" color={colors.muted}
                  _selected={{ bg: colors.surface, color: colors.text, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                  transition="all 0.15s"
                  onClick={() => { setError(''); setSuccess(''); setShowReset(false); setShowResend(false); setConfirmPassword(''); setActiveTab(i); }}
                >
                  {label}
                </Tab>
              ))}
            </TabList>

            <TabPanels>
              {/* Sign In */}
              <TabPanel p={0}>
                <VStack spacing={4}>
                  {error && <Alert status="error" borderRadius="8px" fontSize="13px"><AlertIcon />{error}</Alert>}
                  {success && <Alert status="success" borderRadius="8px" fontSize="13px"><AlertIcon />{success}</Alert>}
                  <FormControl>
                    <FormLabel fontSize="12px" fontWeight="600" color={colors.muted} mb={1.5}>Email</FormLabel>
                    <Input type="email" placeholder="you@example.com" value={email}
                      onChange={e => { setEmail(e.target.value); if (showReset) setShowReset(false); }}
                      borderRadius="8px" h="42px" fontSize="14px" borderColor={showReset ? colors.brand : colors.border}
                      _hover={{ borderColor: colors.brand }} bg={colors.surface} />
                    {showReset && (
                      <Text fontSize="11px" color={colors.brand} mt={1} fontWeight="500">
                        Enter your email above, then click "Forgot password?" to send a reset link.
                      </Text>
                    )}
                  </FormControl>
                  <FormControl>
                    <HStack justify="space-between" mb={1.5}>
                      <FormLabel fontSize="12px" fontWeight="600" color={colors.muted} mb={0}>Password</FormLabel>
                      <Link
                        fontSize="12px" color={colors.brand} fontWeight="500"
                        onClick={handleReset} cursor="pointer"
                        _hover={{ textDecoration: 'underline' }}
                      >
                        Forgot password?
                      </Link>
                    </HStack>
                    <InputGroup>
                      <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                        onChange={e => setPassword(e.target.value)}
                        borderRadius="8px" h="42px" fontSize="14px" borderColor={colors.border}
                        _hover={{ borderColor: colors.brand }} bg={colors.surface}
                        onKeyDown={e => e.key === 'Enter' && handle('signin')} />
                      <InputRightElement h="42px">
                        <IconButton aria-label={showPassword ? 'Hide' : 'Show'}
                          icon={<Icon as={showPassword ? RiEyeOffLine : RiEyeLine} boxSize="16px" />}
                          size="sm" variant="ghost" color={colors.muted} _hover={{ color: colors.brand, bg: 'transparent' }}
                          onClick={() => setShowPassword(v => !v)} />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>
                  <Button w="full" h="42px" borderRadius="8px" bg={colors.brand} color="white"
                    fontWeight="600" fontSize="14px" _hover={{ bg: colors.brandHover }}
                    isLoading={loading} onClick={() => handle('signin')}>
                    Sign In
                  </Button>
                </VStack>
              </TabPanel>

              {/* Sign Up */}
              <TabPanel p={0}>
                <VStack spacing={4}>
                  {error && <Alert status="error" borderRadius="8px" fontSize="13px"><AlertIcon />{error}</Alert>}
                  {success && <Alert status="success" borderRadius="8px" fontSize="13px"><AlertIcon />{success}</Alert>}
                  {showResend && (
                    <Button
                      variant="outline" w="full" h="38px" borderRadius="8px"
                      borderColor={colors.border} color={colors.muted}
                      fontWeight="600" fontSize="13px"
                      isLoading={loading} loadingText="Sending…"
                      onClick={handleResend}
                    >
                      Resend confirmation email
                    </Button>
                  )}
                  <FormControl>
                    <FormLabel fontSize="12px" fontWeight="600" color={colors.muted} mb={1.5}>Email</FormLabel>
                    <Input type="email" placeholder="you@example.com" value={email}
                      onChange={e => setEmail(e.target.value)}
                      borderRadius="8px" h="42px" fontSize="14px" borderColor={colors.border}
                      _hover={{ borderColor: colors.brand }} bg={colors.surface} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="12px" fontWeight="600" color={colors.muted} mb={1.5}>Password</FormLabel>
                    <InputGroup>
                      <Input type={showPassword ? 'text' : 'password'} placeholder="8+ characters" value={password}
                        onChange={e => setPassword(e.target.value)}
                        borderRadius="8px" h="42px" fontSize="14px" borderColor={colors.border}
                        _hover={{ borderColor: colors.brand }} bg={colors.surface} />
                      <InputRightElement h="42px">
                        <IconButton aria-label={showPassword ? 'Hide' : 'Show'}
                          icon={<Icon as={showPassword ? RiEyeOffLine : RiEyeLine} boxSize="16px" />}
                          size="sm" variant="ghost" color={colors.muted} _hover={{ color: colors.brand, bg: 'transparent' }}
                          onClick={() => setShowPassword(v => !v)} />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="12px" fontWeight="600" color={colors.muted} mb={1.5}>Confirm Password</FormLabel>
                    <InputGroup>
                      <Input type={showConfirmPassword ? 'text' : 'password'} placeholder="Re-enter your password" value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        borderRadius="8px" h="42px" fontSize="14px" borderColor={colors.border}
                        _hover={{ borderColor: colors.brand }} bg={colors.surface}
                        onKeyDown={e => e.key === 'Enter' && handle('signup')} />
                      <InputRightElement h="42px">
                        <IconButton aria-label={showConfirmPassword ? 'Hide' : 'Show'}
                          icon={<Icon as={showConfirmPassword ? RiEyeOffLine : RiEyeLine} boxSize="16px" />}
                          size="sm" variant="ghost" color={colors.muted} _hover={{ color: colors.brand, bg: 'transparent' }}
                          onClick={() => setShowConfirmPassword(v => !v)} />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>
                  <Button w="full" h="42px" borderRadius="8px" bg={colors.brand} color="white"
                    fontWeight="600" fontSize="14px" _hover={{ bg: colors.brandHover }}
                    isLoading={loading} onClick={() => handle('signup')}>
                    Get Started Free
                  </Button>
                  <Text fontSize="11px" color={colors.subtle} textAlign="center" lineHeight="1.5">
                    By creating an account you agree to our{' '}
                    <RouterLink to="/terms">
                      <Text as="span" color={colors.brand} _hover={{ textDecoration: 'underline' }}>Terms of Service</Text>
                    </RouterLink>
                    {' '}and{' '}
                    <RouterLink to="/privacy">
                      <Text as="span" color={colors.brand} _hover={{ textDecoration: 'underline' }}>Privacy Policy</Text>
                    </RouterLink>.
                  </Text>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
          </Box>
        )}

        {/* Trust signals */}
        <Box mt={4} p={4} bg={colors.surface} border="1px solid" borderColor={colors.border} borderRadius="10px">
          <VStack spacing={2.5} align="stretch">
            {TRUST_SIGNALS.map(s => (
              <HStack key={s} spacing={2.5}>
                <Box w={1.5} h={1.5} borderRadius="full" bg={colors.positive} flexShrink={0} mt="2px" />
                <Text fontSize="12px" color={colors.muted} fontWeight="500">{s}</Text>
              </HStack>
            ))}
          </VStack>
        </Box>

        <Text textAlign="center" mt={5} fontSize="11px" color={colors.subtle}>
          Your data is private. All calculations run client-side.
        </Text>
      </Box>
    </Box>
  );
}
