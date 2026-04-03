-- ============================================================
-- Spendable — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── user_settings ───────────────────────────────────────────
create table if not exists public.user_settings (
  id                     uuid primary key default uuid_generate_v4(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  tax_rate               numeric(5,4) not null default 0.25,   -- e.g. 0.25 = 25%
  emergency_buffer_months integer not null default 3,
  starting_balance       numeric(12,2) not null default 0,
  currency               text not null default 'USD',
  tax_schedule           text not null default 'annual'
                         check (tax_schedule in ('annual', 'quarterly')),
  updated_at             timestamptz not null default now(),
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
