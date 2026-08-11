-- ============================================================
-- Spendable — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── user_settings ───────────────────────────────────────────
create table if not exists public.user_settings (
  id                        uuid primary key default uuid_generate_v4(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  tax_rate                  numeric(5,4) not null default 0.25,   -- e.g. 0.25 = 25%
  emergency_buffer_months   integer not null default 3,
  starting_balance          numeric(12,2) not null default 0,
  starting_balance_updated_at timestamptz not null default now(), -- when starting_balance was last re-anchored; used to accrue expenses since then, not since the last income entry
  currency                  text not null default 'USD',
  tax_schedule              text not null default 'annual'
                            check (tax_schedule in ('annual', 'quarterly')),
  updated_at                timestamptz not null default now(),
  unique(user_id)
);

-- ─── income_events ────────────────────────────────────────────
create table if not exists public.income_events (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  amount     numeric(12,2) not null check (amount > 0),
  date       date not null,
  source     text not null,
  notes      text,
  created_at timestamptz not null default now()
);

-- ─── recurring_expenses ──────────────────────────────────────
create table if not exists public.recurring_expenses (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  amount     numeric(12,2) not null check (amount > 0),
  frequency  text not null check (frequency in ('weekly','monthly','quarterly','annually')),
  category   text not null default 'other'
             check (category in ('housing','transport','food','health','software','insurance','entertainment','other')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── upcoming_expenses ───────────────────────────────────────
create table if not exists public.upcoming_expenses (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  amount     numeric(12,2) not null check (amount > 0),
  due_date   date not null,
  is_paid    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.user_settings       enable row level security;
alter table public.income_events        enable row level security;
alter table public.recurring_expenses   enable row level security;
alter table public.upcoming_expenses    enable row level security;

-- user_settings policies
create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- income_events policies
create policy "Users can view own income"
  on public.income_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own income"
  on public.income_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update own income"
  on public.income_events for update
  using (auth.uid() = user_id);

create policy "Users can delete own income"
  on public.income_events for delete
  using (auth.uid() = user_id);

-- recurring_expenses policies
create policy "Users can view own expenses"
  on public.recurring_expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert own expenses"
  on public.recurring_expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own expenses"
  on public.recurring_expenses for update
  using (auth.uid() = user_id);

create policy "Users can delete own expenses"
  on public.recurring_expenses for delete
  using (auth.uid() = user_id);

-- upcoming_expenses policies
create policy "Users can view own upcoming expenses"
  on public.upcoming_expenses for select
  using (auth.uid() = user_id);

create policy "Users can insert own upcoming expenses"
  on public.upcoming_expenses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own upcoming expenses"
  on public.upcoming_expenses for update
  using (auth.uid() = user_id);

create policy "Users can delete own upcoming expenses"
  on public.upcoming_expenses for delete
  using (auth.uid() = user_id);

-- ============================================================
-- Indexes for query performance
-- ============================================================

create index if not exists idx_income_events_user_date
  on public.income_events(user_id, date desc);

create index if not exists idx_recurring_expenses_user
  on public.recurring_expenses(user_id);

create index if not exists idx_upcoming_expenses_user_due
  on public.upcoming_expenses(user_id, due_date asc);

-- ============================================================
-- Subscription Support (run after initial schema)
-- ============================================================

create table if not exists public.user_subscriptions (
  id                              uuid primary key default uuid_generate_v4(),
  user_id                         uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id              text,
  subscription_plan               text not null default 'free'
                                  check (subscription_plan in ('free', 'pro')),
  subscription_status             text
                                  check (subscription_status in ('active', 'canceled', 'past_due', 'trialing', 'unpaid')),
  subscription_current_period_end timestamptz,
  updated_at                      timestamptz not null default now(),
  unique(user_id)
);

alter table public.user_subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

-- Service role only for writes (webhook handler uses service role key)
create policy "Service role can manage subscriptions"
  on public.user_subscriptions for all
  using (auth.role() = 'service_role');

create index if not exists idx_user_subscriptions_user
  on public.user_subscriptions(user_id);

-- Cooldown timestamp for create-checkout rate limiting (see Edge Function)
alter table public.user_subscriptions
  add column if not exists last_checkout_attempt_at timestamptz;

create index if not exists idx_user_subscriptions_customer
  on public.user_subscriptions(stripe_customer_id);

-- ============================================================
-- Migration: Tax Tracker (run on existing databases)
-- Safe to run multiple times — uses IF NOT EXISTS / DO NOTHING
-- ============================================================

alter table public.user_settings
  add column if not exists tax_schedule text not null default 'annual'
  check (tax_schedule in ('annual', 'quarterly'));

-- ============================================================
-- Migration: Recurring / Expected Monthly Income
-- Safe to run multiple times — uses IF NOT EXISTS
-- ============================================================

alter table public.user_settings
  add column if not exists expected_monthly_income numeric not null default 0;

-- ============================================================
-- Migration: Tax Tracker paid deadlines (DB-backed)
-- Safe to run multiple times — uses IF NOT EXISTS
-- ============================================================

alter table public.user_settings
  add column if not exists paid_tax_deadline_ids text[] not null default '{}';

-- ============================================================
-- Migration: Starting Balance Anchor (run on existing databases)
-- Safe to run multiple times — uses IF NOT EXISTS
-- Tracks when starting_balance was last re-anchored, so currentBalance can
-- accrue expenses since that anchor point instead of since the last income
-- entry (which understated elapsed time for anyone with regular income).
-- ============================================================

alter table public.user_settings
  add column if not exists starting_balance_updated_at timestamptz not null default now();

-- ============================================================
-- Migration: Server-Side Free Plan Limit Enforcement
-- Safe to run multiple times — uses CREATE OR REPLACE / DROP+CREATE
--
-- Free plan limits (FREE_INCOME_LIMIT / FREE_EXPENSE_LIMIT /
-- FREE_UPCOMING_LIMIT in src/services/stripe.ts) were previously enforced
-- only in the React client — RLS policies above only check row ownership,
-- not row count, so any authenticated user could call the Supabase client
-- directly (e.g. from devtools) and insert unlimited rows on the Free plan.
-- These triggers make the limit a real server-side boundary. They fire
-- AFTER INSERT FOR EACH STATEMENT, so a single-row insert or a bulk CSV
-- import are both checked as one unit — if a batch would push the user over
-- the limit, the whole statement (and transaction) is rolled back atomically.
-- ============================================================

create or replace function public.is_pro_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_subscriptions
    where user_id = p_user_id
      and subscription_plan = 'pro'
      and subscription_status in ('active', 'trialing')
  );
$$;

create or replace function public.enforce_free_plan_row_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := TG_ARGV[0]::integer;
  v_count integer;
begin
  if public.is_pro_user(auth.uid()) then
    return null;
  end if;

  execute format('select count(*) from public.%I where user_id = $1', TG_TABLE_NAME)
    into v_count
    using auth.uid();

  if v_count > v_limit then
    raise exception
      'Free plan limit of % reached for %. Upgrade to Pro for unlimited entries.',
      v_limit, TG_TABLE_NAME;
  end if;

  return null;
end;
$$;

drop trigger if exists enforce_income_limit on public.income_events;
create trigger enforce_income_limit
  after insert on public.income_events
  for each statement
  execute function public.enforce_free_plan_row_limit(5);

drop trigger if exists enforce_expense_limit on public.recurring_expenses;
create trigger enforce_expense_limit
  after insert on public.recurring_expenses
  for each statement
  execute function public.enforce_free_plan_row_limit(3);

drop trigger if exists enforce_upcoming_limit on public.upcoming_expenses;
create trigger enforce_upcoming_limit
  after insert on public.upcoming_expenses
  for each statement
  execute function public.enforce_free_plan_row_limit(3);
