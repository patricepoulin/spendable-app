# Spendable — Financial Clarity for Freelancers

> **"How much money can I safely spend right now?"**

Spendable helps freelancers with irregular income answer that question with confidence. Not an accounting tool — a financial clarity tool that answers the one question that matters.

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

---

## Subscription Plans

| Feature | Free | Pro |
|---|---|---|
| Income entries | Up to 5 (all-time) | Unlimited |
| Recurring expenses | Up to 3 | Unlimited |
| Upcoming expenses | Up to 3 | Unlimited |
| Safe-to-spend dashboard | ✓ | ✓ |
| Tax reserve tracking | ✓ | ✓ |
| Emergency buffer | ✓ | ✓ |
| Financial confidence score | ✓ | ✓ |
| 6-month forecast | — | ✓ |
| CSV & XLSX export | — | ✓ (+ 30-day grace after cancel) |
| CSV / XLSX income import | ✓ (up to free limit) | ✓ (unlimited) |
| Currencies | USD, GBP, EUR, CAD, AUD | USD, GBP, EUR, CAD, AUD |
| Pricing | Free | $9 / £9 / €9 / C$9 / A$9 per month |

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
│   │   │   └── AppShell.tsx      # Sidebar (desktop fixed), mobile hamburger drawer, offline/mock banners
│   │   ├── subscription/         # UpgradeModal, SubscriptionCard
│   │   └── ui/                   # PageHeader, ErrorBoundary, SpendableMark, LastUpdatedIndicator
│   ├── hooks/
│   │   ├── useAuth.tsx               # Auth context + hook
│   │   ├── useFinancials.ts          # Central data + metrics hook (with localStorage cache)
│   │   ├── useIncomeByYear.ts        # Lazy year-based income loading
│   │   ├── useOnlineStatus.ts        # Online/offline detection
│   │   ├── usePageTitle.ts           # Sets document.title per page
│   │   ├── useSubscription.ts        # Plan, limits, feature gating, grace period
│   │   └── useSubscriptionContext.tsx # Single shared subscription row fetch (context)
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client + all API helpers (incl. batchInsert, count)
│   │   └── mockStore.ts          # Offline seed data + in-memory store
│   ├── pages/
│   │   ├── AuthPage.tsx          # Sign in / sign up with forgot-password
│   │   ├── DashboardPage.tsx     # Safe-to-spend hero, KPI cards, charts
│   │   ├── IncomePage.tsx        # Year-grouped timeline, CSV import, lazy year loading
│   │   ├── ExpensesPage.tsx      # Recurring expense table + mobile card view
│   │   ├── UpcomingPage.tsx      # One-off upcoming costs with due-date badges
│   │   ├── ForecastPage.tsx      # 6-month forecast (Pro only)
│   │   ├── SettingsPage.tsx      # Tax, buffer, currency, subscription card, danger zone
│   │   ├── TermsPage.tsx         # Full Terms of Service
│   │   └── PrivacyPage.tsx       # Full GDPR/UK GDPR Privacy Policy
│   ├── services/
│   │   └── stripe.ts             # createCheckoutSession(), openCustomerPortal(), plan constants
│   ├── types/
│   │   ├── index.ts              # All core TypeScript types incl. subscription types
│   │   └── csvImport.ts          # CSV import step types, field mappings, row shape
│   └── utils/
│       ├── calculations.ts       # All financial calculations (pure functions)
│       ├── csvImport.ts          # CSV parsing, auto-mapping, date parsing, row validation
│       ├── exportCsv.ts          # CSV export — income, expenses, full snapshot
│       ├── forecast.ts           # 6-month projection logic
│       └── incomeMonths.ts       # Year/month timeline grouping helpers
├── supabase/
│   ├── functions/
│   │   ├── create-checkout/      # Creates Stripe Checkout session (JWT-verified)
│   │   ├── customer-portal/      # Opens Stripe Customer Portal (JWT-verified)
│   │   └── stripe-webhook/       # Handles Stripe events, updates user_subscriptions
│   └── config.toml               # Disables gateway JWT check (functions verify internally)
├── .env.example                  # All required environment variables
├── package.json
└── vite.config.ts
```

---

## Quick Start

### 1. Install

```bash
cd spendable
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
2. Run the schema SQL in the Supabase SQL Editor. Create the following tables: `user_settings`, `income_events`, `recurring_expenses`, `upcoming_expenses`, `user_subscriptions` — with RLS enabled and all columns matching the TypeScript types in `src/types/index.ts`.
3. Deploy the three Edge Functions:

```bash
supabase link --project-ref <your-project-ref>
supabase functions deploy create-checkout
supabase functions deploy customer-portal
supabase functions deploy stripe-webhook
supabase functions deploy delete-account
```

4. Set secrets in Supabase Dashboard → Edge Functions → Secrets:

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Stripe Setup

1. Create a **Spendable Pro** product with five monthly prices: USD ($9), GBP (£9), EUR (€9), CAD (C$9), AUD (A$9)
2. Copy the price IDs into `.env`:

```
VITE_STRIPE_PRICE_USD=price_...
VITE_STRIPE_PRICE_GBP=price_...
VITE_STRIPE_PRICE_EUR=price_...
VITE_STRIPE_PRICE_CAD=price_...
VITE_STRIPE_PRICE_AUD=price_...
```

3. Register the webhook in Stripe Dashboard → Developers → Webhooks:
   - URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`
4. Add your Terms of Service and Privacy Policy URLs in Stripe account settings before going live.

For local testing:

```bash
stripe listen --forward-to https://<project-ref>.supabase.co/functions/v1/stripe-webhook
```

---

## CSV Import (Income Only)

The CSV import feature supports importing historical income entries from a CSV file.

**Supported formats:** `.csv` and `.xlsx` / `.xls`

```
Date,Source,Amount,Notes
2026-01-05,Client Payment,1500,Website redesign
2026-02-01,Retainer Client,1200,Monthly retainer
```

**Import flow:**
1. Upload `.csv` file (drag & drop or file picker)
2. Map CSV columns to Spendable fields (auto-detected where possible)
3. Preview first 5 rows with per-row validation
4. Confirm and import (batch insert in chunks of 50)

**Rules:**
- Income entries only — recurring expenses and upcoming bills must be added manually
- Maximum 500 rows per import
- Free plan: blocked if import would exceed the 5-entry limit (Upgrade to Pro modal shown)
- Duplicate detection: rows sharing the same source + amount + date are flagged; users can choose to skip them
- Accepted date formats: `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, `DD-MM-YYYY`, and most browser-parseable formats
- Amounts can include currency symbols (`£`, `$`, `€`) and commas — stripped automatically
- Excel dates (serial numbers and formatted date cells) are handled automatically by SheetJS
- A CSV template can be downloaded from the import modal

---

## Offline Support

Spendable works read-only when the user loses internet connection:

- All financial data is cached to `localStorage` after every successful fetch
- On reconnect the cache is refreshed automatically
- A yellow banner is shown when offline
- Write actions (Add Income, Import CSV, Add Expense) are disabled until reconnected
- Mock mode (`VITE_MOCK_AUTH=true`) uses its own separate in-memory store and is always available

**Mock mode note:** `VITE_MOCK_AUTH=true` is ignored in production builds (`import.meta.env.PROD === true`). Safe to leave in `.env.example`.

---

## Core Calculations

All calculations are pure TypeScript functions in `src/utils/calculations.ts`.

```ts
tax_reserve    = total_income_12mo * tax_rate
buffer         = monthly_expenses * emergency_buffer_months
safe_to_spend  = balance - tax_reserve - buffer - all_unpaid_upcoming
runway_months  = safe_to_spend / monthly_expenses
smoothed       = sum(last_6_months_income) / 6
weekly         = safe_to_spend / (runway_months * 4.33)
```

---

## Pages

| Route | Page | Key features |
|---|---|---|
| `/` | Dashboard | Safe-to-spend hero, KPI cards, income trend chart, balance breakdown |
| `/income` | Income | Year-grouped timeline, lazy year loading, CSV import, add/edit/delete |
| `/expenses` | Recurring Expenses | Expense table, active toggle, category badges, mobile card view |
| `/upcoming` | Upcoming Expenses | One-off costs with due-date badges, mark paid, edit/delete |
| `/tax`      | Tax Tracker | YTD income, estimated bill, pot progress, payment schedule (annual/quarterly) |
| `/forecast` | Forecast | 6-month area chart, monthly table, runway card (Pro only) |
| `/settings` | Settings | Tax rate, payment schedule, buffer, currency, subscription card, data export, danger zone |
| `/terms` | Terms of Service | Full ToS (England & Wales) |
| `/privacy` | Privacy Policy | Full GDPR/UK GDPR policy |

---

## Database Tables

- `user_settings` — tax rate, tax schedule (annual/quarterly), buffer months, starting balance, currency
- `income_events` — amount, date, source, notes
- `recurring_expenses` — name, amount, frequency, category, is_active
- `upcoming_expenses` — name, amount, due_date, is_paid
- `user_subscriptions` — plan, status, stripe_customer_id, period_end

All tables have Row Level Security enabled. The `user_subscriptions` table is write-protected to service role only — only the webhook Edge Function can update subscription status.

---

## Mock / Offline Mode

Set `VITE_MOCK_AUTH=true` in `.env` to run without any Supabase connection. Seed data includes 12 months of income, 8 expenses, and an $18,500 starting balance. Data persists to `localStorage`. A yellow banner appears when active. Reset via Settings → Reset mock data.

---

## Roadmap

- [x] Grace period export after subscription cancellation (30 days)
- [x] CSV import for income history
- [x] Mobile-responsive layout (drawer nav, card views)
- [x] Upcoming expenses with due-date badges
- [x] Terms of Service + Privacy Policy pages
- [ ] Plaid bank sync
- [ ] Invoice tracking
- [ ] Mobile app (React Native)
- [ ] Quarterly tax reminders
- [ ] Goal-based savings targets

---

## License

MIT
