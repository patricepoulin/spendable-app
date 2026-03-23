import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ChakraProvider, extendTheme, Spinner, Center } from '@chakra-ui/react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SubscriptionProvider } from './hooks/useSubscriptionContext';
import { AppShell } from './components/layout/AppShell';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { IncomePage } from './pages/IncomePage';
import { ExpensesPage } from './pages/ExpensesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ForecastPage } from './pages/ForecastPage';
import { UpcomingPage } from './pages/UpcomingPage';
import { TaxTrackerPage } from './pages/TaxTrackerPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';

// ─── Chakra Theme ─────────────────────────────────────────────────────────────

// ─── YNAB-inspired Color Tokens ───────────────────────────────────────────────
//
// Sidebar:   deep navy  #1C2B3A  (YNAB's dark left panel)
// Page bg:   warm off-white #F5F4EF  (YNAB's content background)
// Surface:   pure white  #FFFFFF
// Primary:   indigo-blue #4C5FD5  (YNAB's action / accent blue)
// Positive:  YNAB green  #27AE60
// Caution:   YNAB amber  #F2C94C
// Overspent: YNAB red    #EB5757
// Border:    light grey  #E8E8E3

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  fonts: {
    heading: `'Inter', -apple-system, sans-serif`,
    body: `'Inter', -apple-system, sans-serif`,
  },
  colors: {
    // YNAB indigo-blue primary
    brand: {
      50:  '#eef0fb',
      100: '#d5d9f5',
      200: '#adb4ec',
      300: '#8590e2',
      400: '#6270d9',
      500: '#4C5FD5',  // ← YNAB primary blue
      600: '#3D4FBF',
      700: '#2e3d99',
      800: '#222e72',
      900: '#16204c',
    },
    // YNAB navy (sidebar)
    navy: {
      700: '#253344',
      800: '#1C2B3A',  // ← YNAB sidebar bg
      900: '#141f2b',
    },
    // YNAB positive green
    ynabGreen: {
      50:  '#eafaf1',
      100: '#d5f5e3',
      500: '#27AE60',  // ← YNAB "in the green"
      600: '#219653',
      700: '#1a7a43',
    },
    // YNAB caution amber
    ynabAmber: {
      50:  '#fefae8',
      100: '#fdf3c0',
      500: '#F2C94C',  // ← YNAB underfunded amber
      600: '#d4a800',
    },
    // YNAB overspent red
    ynabRed: {
      50:  '#fef2f2',
      100: '#fde0e0',
      500: '#EB5757',  // ← YNAB overspent red
      600: '#c93c3c',
    },
  },
  semanticTokens: {
    colors: {
      // Surfaces
      'page-bg':   { default: '#F5F4EF', _dark: '#141f2b' },  // YNAB warm off-white
      'surface':   { default: '#FFFFFF', _dark: '#1C2B3A'  },
      'surface-2': { default: '#F0EFE9', _dark: '#253344'  },
      'border':    { default: '#E8E8E3', _dark: '#2d3e50'  },
      // Text
      'text-primary':   { default: '#1C2B3A', _dark: '#f0f0ea' },
      'text-secondary': { default: '#5a6a7a', _dark: '#a0aeba' },
      'text-muted':     { default: '#8a9aaa', _dark: '#6a7a8a' },
      // Semantic
      'color-positive': { default: '#27AE60', _dark: '#4eca80' },
      'color-caution':  { default: '#D4A800', _dark: '#F2C94C' },
      'color-negative': { default: '#EB5757', _dark: '#f07070' },
      'color-brand':    { default: '#4C5FD5', _dark: '#7b8fec' },
    },
  },
  components: {
    Button: {
      baseStyle: { fontWeight: '600', borderRadius: '8px' },
      variants: {
        solid: (props: { colorScheme: string }) => ({
          ...(props.colorScheme === 'brand' ? {
            bg: '#4C5FD5',
            color: 'white',
            _hover: { bg: '#3D4FBF' },
            _active: { bg: '#2e3d99' },
          } : {}),
        }),
      },
    },
    Input: {
      defaultProps: { focusBorderColor: 'brand.500' },
      baseStyle: { field: { borderRadius: '8px' } },
    },
    Select: {
      defaultProps: { focusBorderColor: 'brand.500' },
    },
  },
  styles: {
    global: {
      'html, body': {
        fontFamily: `'Inter', -apple-system, sans-serif`,
        bg: '#eef1fe',
        color: '#1C2B3A',
        fontSize: '14px',
        lineHeight: '1.6',
        '-webkit-font-smoothing': 'antialiased',
      },
    },
  },
});

// ─── App Shell Routes ─────────────────────────────────────────────────────────

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="lg" color="brand.500" />
      </Center>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/income" element={<IncomePage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/upcoming" element={<UpcomingPage />} />
        <Route path="/tax"      element={<TaxTrackerPage />} />
        <Route path="/forecast" element={<ForecastPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <ChakraProvider theme={theme}>
        <BrowserRouter>
          <AuthProvider>
            <SubscriptionProvider>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </SubscriptionProvider>
          </AuthProvider>
        </BrowserRouter>
      </ChakraProvider>
    </ErrorBoundary>
  );
}
