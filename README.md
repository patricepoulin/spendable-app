# Spendable — Financial Clarity for Freelancers

> **"How much money can I safely spend right now?"**

Spendable helps freelancers with irregular income answer that question with confidence. Not an accounting tool — a financial clarity tool that answers the one question that matters.

Live at **[app.spendable.finance](https://app.spendable.finance)**

---

## What It Does

| Metric | What It Means |
|---|---|
| **Safe to Spend** | Balance minus tax reserve, emergency buffer & upcoming bills |
| **Weekly Allowance** | Safe-to-spend divided over your runway |
| **Runway** | How many months until you're out of safe funds |
| **Smoothed Income** | 6-month rolling average to normalise income spikes |
| **Tax Reserve** | Auto-calculated set-aside based on the last 12 months |
| **Confidence Score** | 0–100 score based on runway, tax reserve, buffer & income history |
| **Tax Tracker** | YTD income vs estimated bill, payment schedule, mark as paid |

---

## Subscription Plans

| Feature | Free | Pro |
|---|---|---|
| Income entries | Up to 5 (all-time) | Unlimited |
| Recurring expenses | Up to 3 | Unlimited |
| Upcoming expenses | Up to 3 | Unlimited |
| Safe-to-spend dashboard | ✓ | ✓ |
| Tax reserve tracking | ✓ | ✓ |
| Tax Tracker | — | ✓ |
| Emergency buffer | ✓ | ✓ |
| Financial confidence score | ✓ | ✓ |
| 6-month forecast | — | ✓ |
| CSV & XLSX export | — | ✓ (+ 30-day grace after cancel) |
| CSV / XLSX income import | ✓ (up to free limit) | ✓ (unlimited) |
| Currencies | USD, GBP, EUR, CAD, AUD | USD, GBP, EUR, CAD, AUD |
| Pricing | Free | Fetched live from Stripe |

> Prices are fetched dynamically from Stripe via the `get-prices` Edge Function.
> Any price change in Stripe propagates to the UI automatically.

---

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Chakra UI v2 + Recharts
- **Backend**: Supabase (Auth + Postgres + Edge Functions)
- **Routing**: React Router v6
- **Payments**: Stripe (Checkout + Customer Portal + Webhooks)
- **CSV/XLSX parsing**: PapaParse + SheetJS (xlsx)

---

## Project Structure

```
spendable/
├── src/
│   ├── components/
│   │   ├── dashboard/            # IncomeTrendChart, BalanceBreakdown, RecentIncomeList
│   │   ├── forecast/             # ForecastChart, ForecastTable, RunwayCard
│   │   ├── income/               # IncomeYearGroup, IncomeEntryItem, CsvImportModal
│   │   ├── layout/
│   │   │   └── AppShell.tsx      # Sidebar (desktop fixed), mobile hamburger drawer, banners
│   │   ├── subscription/         # UpgradeModal (live prices), SubscriptionCard
│   │   └── ui/                   # PageHeader, ErrorBoundary, SpendableMark, LastUpdatedIndicator
│   ├── hooks/
│   │   ├── useAuth.tsx               # Auth context + hook
│   │   ├── useFinancials.ts          # Central data + metrics hook (with localStorage cache)
│   │   ├── useIncomeByYear.ts        # Lazy year-based income loading
│   │   ├── useOnlineStatus.ts        # Online/offline detection
│   │   ├── usePageTitle.ts           # Sets document.title per page
│   │   ├── usePrices.ts              # Fetches live Stripe prices via get-prices Edge Function
│   │   ├── useSubscription.ts        # Plan, limits, feature gating, grace period
│   │   └── useSubscriptionContext.tsx # Single shared subscription row fetch (context)
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client + all API helpers
│   │   └── mockStore.ts          # Offline seed data + in-memory store
│   ├── pages/
│   │   ├── AuthPage.tsx          # Sign in / sign up / forgot password / password reset
│   │   ├── DashboardPage.tsx     # Safe-to-spend hero, KPI cards, charts, stale income warning
│   │   ├── IncomePage.tsx        # Year-grouped timeline, CSV import, lazy year loading
│   │   ├── ExpensesPage.tsx      # Recurring expense table + mobile card view
│   │   ├── UpcomingPage.tsx      # One-off upcoming costs with due-date badges
│   │   ├── TaxTrackerPage.tsx    # Tax pot, YTD income, payment schedule, mark as paid
│   │   ├── ForecastPage.tsx      # 6-month forecast (Pro only)
│   │   ├── SettingsPage.tsx      # Tax, buffer, currency, payment schedule, subscription, danger zone
│   │   ├── TermsPage.tsx         # Full Terms of Service
│   │   └── PrivacyPage.tsx       # Full GDPR/UK GDPR Privacy Policy
│   ├── services/
│   │   └── stripe.ts             # createCheckoutSession(), openCustomerPortal(), plan constants
│   ├── types/
│   │   ├── index.ts              # All core TypeScript types incl. subscription + tax_schedule
│   │   └── csvImport.ts          # CSV import step types, field mappings, row shape
│   └── utils/
│       ├── calculations.ts       # All financial calculations (pure functions)
│       ├── csvImport.ts          # CSV parsing, auto-mapping, date parsing, row validation
│       ├── exportCsv.ts          # CSV export — income, expenses, full snapshot
│       ├── forecast.ts           # 6-month projection logic
│       ├── taxTracker.ts         # Tax year calc, payment schedule, deadline logic
│       └── incomeMonths.ts       # Year/month timeline grouping helpers
├── supabase/
│   ├── functions/
│   │   ├── create-checkout/      # Creates Stripe Checkout session (JWT-verified)
│   │   ├── customer-portal/      # Opens Stripe Customer Portal (JWT-verified)
│   │   ├── delete-account/       # Cancels Stripe sub + deletes all user data
│   │   ├── get-prices/           # Returns live Stripe prices (no auth required)
│   │   └── stripe-webhook/       # Handles Stripe events, updates user_subscriptions
│   └── config.toml               # Edge Function JWT configuration
├── supabase-schema.sql           # Full DB schema + migration for tax_schedule column
├── .env.example                  # All required environment variables (no real values)
├── package.json
└── vite.config.ts
```

---

## Quick Start

### 1. Install

```bash
cd spendable-app
yarn install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase and Stripe keys. Set `VITE_MOCK_AUTH=true` to run fully offline with seed data — no Supabase or Stripe connection needed.

### 3. Run

```bash
yarn dev    # http://localhost:3000
```

---

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase-schema.sql` in the Supabase SQL Editor (creates all tables with RLS)
3. If upgrading an existing database, run the migration block at the bottom of the schema file to add the `tax_schedule` column
4. Deploy all Edge Functions:

```bash
supabase link --project-ref <your-project-ref>
supabase functions deploy create-checkout
supabase functions deploy customer-portal
supabase functions deploy stripe-webhook
supabase functions deploy delete-account
supabase functions deploy get-prices
```

5. Set secrets in Supabase Dashboard → Edge Functions → Secrets:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_USD=price_...
STRIPE_PRICE_GBP=price_...
STRIPE_PRICE_EUR=price_...
STRIPE_PRICE_CAD=price_...
STRIPE_PRICE_AUD=price_...
SUPABASE_SERVICE_ROLE_KEY=...
```

> The `STRIPE_PRICE_*` secrets are used by `get-prices` to fetch live amounts from Stripe.
> They are server-side secrets — separate from the `VITE_STRIPE_PRICE_*` env vars used by the frontend for checkout.

---

## Stripe Setup

1. Create a **Spendable Pro** product with five monthly prices (USD, GBP, EUR, CAD, AUD)
2. Copy the price IDs into `.env` as `VITE_STRIPE_PRICE_*` (used for checkout) and into Supabase secrets as `STRIPE_PRICE_*` (used by `get-prices` for dynamic price display)
3. Register the webhook in Stripe Dashboard → Developers → Webhooks:
   - URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`
4. Add Terms of Service and Privacy Policy URLs in Stripe account settings:
   - Terms: `https://app.spendable.finance/terms`
   - Privacy: `https://app.spendable.finance/privacy`

---

## Dynamic Pricing

Prices shown in the UI are fetched live from Stripe via the `get-prices` Edge Function rather than hardcoded. This means any price change in Stripe automatically propagates to:

- The upgrade modal (UpgradeModal.tsx)
- The subscription card (SubscriptionCard.tsx)
- The forecast page upgrade prompt
- The landing page pricing section

Prices are cached in module memory for the duration of the browser session to avoid redundant fetches. Fallback values are used if the fetch fails.

---

## Security

- **In transit**: All traffic is encrypted via TLS (HTTPS enforced by Vercel)
- **At rest**: Passwords are hashed with bcrypt by Supabase Auth — never stored in plain text
- **API keys**: The Stripe secret key never touches the browser — all Stripe calls go through Supabase Edge Functions
- **Auth**: Every Edge Function verifies the user's Supabase JWT server-side. The `userId` is always extracted from the verified token, never trusted from the request body
- **RLS**: Row Level Security is enabled on all tables — users can only read and write their own data
- **Mock mode**: `VITE_MOCK_AUTH=true` is disabled in production builds (`import.meta.env.PROD`)

---

## CSV Import (Income Only)

**Supported formats:** `.csv` and `.xlsx` / `.xls`

```
Date,Source,Amount,Notes
2026-01-05,Client Payment,1500,Website redesign
2026-02-01,Retainer Client,1200,Monthly retainer
```

- Maximum 500 rows per import
- Free plan: blocked if import would exceed the 5-entry limit
- Duplicate detection: rows sharing the same source + amount + date are flagged
- Accepted date formats: `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, and most browser-parseable formats

---

## Offline Support

- All financial data cached to `localStorage` after every successful fetch
- On reconnect the cache is refreshed automatically
- A yellow banner is shown when offline
- Write actions are disabled until reconnected
- Cache is cleared on sign-out to prevent cross-user data leakage

---

## Core Calculations

```ts
tax_reserve    = total_income_12mo * tax_rate
buffer         = monthly_expenses * emergency_buffer_months
safe_to_spend  = balance - tax_reserve - buffer - all_unpaid_upcoming
runway_months  = safe_to_spend / monthly_expenses
smoothed       = sum(last_6_months_income) / 6
weekly         = safe_to_spend / (runway_months * 4.33)

// Tax Tracker
ytd_income     = income within current tax year (Apr–Apr for UK, Jan–Dec for others)
estimated_bill = ytd_income * tax_rate
pot_pct        = reserved / estimated_bill (clamped 0–100)
```

---

## Pages

| Route | Page | Key features |
|---|---|---|
| `/` | Dashboard | Safe-to-spend hero, KPI cards, income trend, stale income warning |
| `/income` | Income | Year-grouped timeline, lazy loading, CSV import, add/edit/delete |
| `/expenses` | Recurring Expenses | Expense table, active toggle, category badges |
| `/upcoming` | Upcoming Expenses | One-off costs, due-date badges, mark paid |
| `/tax` | Tax Tracker | YTD vs estimated bill, payment schedule (annual/quarterly), mark as paid (Pro only) |
| `/forecast` | Forecast | 6-month area chart, monthly table, runway card (Pro only) |
| `/settings` | Settings | Tax rate, payment schedule, buffer, currency, subscription, danger zone |
| `/terms` | Terms of Service | Full ToS (England & Wales) |
| `/privacy` | Privacy Policy | Full GDPR/UK GDPR policy |

---

## Database Tables

- `user_settings` — tax rate, tax schedule (`annual`/`quarterly`), buffer months, starting balance, currency
- `income_events` — amount, date, source, notes
- `recurring_expenses` — name, amount, frequency, category, is_active
- `upcoming_expenses` — name, amount, due_date, is_paid
- `user_subscriptions` — plan, status, stripe_customer_id, period_end

All tables have Row Level Security enabled. `user_subscriptions` is write-protected to service role only.

---

## License

MIT
