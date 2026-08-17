/**
 * Supabase Edge Function: weekly-digest
 *
 * Sends the weekly "safe to spend" email to every user who hasn't opted
 * out. Triggered by a GitHub Actions scheduled workflow (Monday 8am UTC),
 * not by Supabase's own pg_cron — simpler to operate since it reuses
 * GitHub's secrets UI instead of adding pg_cron/pg_net/Vault to the mix.
 *
 * Required secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY            ← from resend.com → API Keys (separate from
 *                                the SMTP host/port used by Supabase Auth)
 *   CRON_SECRET                ← random string, must match the GitHub
 *                                Actions workflow's Authorization header
 *   EMAIL_UNSUBSCRIBE_SECRET    ← random string, signs the unsubscribe link
 *
 * The math here (safe-to-spend, tax reserve, next deadline, etc.) is a
 * deliberate duplicate of src/utils/calculations.ts and src/utils/taxTracker.ts
 * — if those formulas change, this file needs updating too. Kept as one
 * self-contained file with no local imports for deploy reliability (see
 * the other functions in this project for why).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET')!;
const UNSUB_SECRET = Deno.env.get('EMAIL_UNSUBSCRIBE_SECRET')!;

const APP_URL = 'https://app.spendable.finance';
const UNSUBSCRIBE_FN_URL = `${SUPABASE_URL}/functions/v1/unsubscribe-digest`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Types (mirrors src/types/index.ts, trimmed to what's needed) ────────────

interface IncomeEvent { amount: number; date: string; }
interface RecurringExpense { amount: number; frequency: 'weekly' | 'monthly' | 'quarterly' | 'annually'; is_active: boolean; }
interface UpcomingExpense { amount: number; is_paid: boolean; }
interface UserSettings {
  tax_rate: number;
  emergency_buffer_months: number;
  starting_balance: number;
  starting_balance_updated_at: string;
  currency: string;
  tax_schedule: 'annual' | 'quarterly';
  email_digest_enabled: boolean;
}

// ─── Calculation helpers — ported from src/utils/calculations.ts ─────────────

function toMonthlyAmount(amount: number, frequency: RecurringExpense['frequency']): number {
  switch (frequency) {
    case 'weekly':    return amount * 52 / 12;
    case 'monthly':   return amount;
    case 'quarterly': return amount / 3;
    case 'annually':  return amount / 12;
  }
}

function calcMonthlyExpenses(expenses: RecurringExpense[]): number {
  return expenses.filter(e => e.is_active).reduce((sum, e) => sum + toMonthlyAmount(e.amount, e.frequency), 0);
}

function calcTaxReserve(events: IncomeEvent[], taxRate: number): number {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const recentIncome = events.filter(e => new Date(e.date) >= oneYearAgo).reduce((sum, e) => sum + e.amount, 0);
  return recentIncome * taxRate;
}

function calcSafeToSpend(balance: number, taxReserve: number, emergencyBuffer: number, upcomingExpenses: number): number {
  return Math.max(0, balance - taxReserve - emergencyBuffer - upcomingExpenses);
}

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

/** Mirrors useFinancials.ts's currentBalance derivation exactly. */
function calcCurrentBalance(settings: UserSettings, income: IncomeEvent[], expenses: RecurringExpense[]): number {
  const totalIncome = income.reduce((sum, e) => sum + e.amount, 0);
  const monthlyExpTotal = calcMonthlyExpenses(expenses);
  const now = new Date();
  const anchor = new Date(settings.starting_balance_updated_at);
  const monthsSinceAnchor = Math.max(0, (now.getTime() - anchor.getTime()) / (30 * 24 * 3600 * 1000));
  return Math.max(0, settings.starting_balance + totalIncome - monthlyExpTotal * monthsSinceAnchor);
}

// ─── Tax deadline helpers — ported from src/utils/taxTracker.ts, trimmed to
// just "what's the next deadline and how much" (the digest doesn't need the
// full payment-history schedule the Tax Tracker page shows) ──────────────────

function ukTaxYear(now: Date): { start: Date; end: Date } {
  const y = now.getFullYear();
  const april6 = new Date(y, 3, 6);
  return now >= april6
    ? { start: new Date(y, 3, 6), end: new Date(y + 1, 3, 5, 23, 59, 59) }
    : { start: new Date(y - 1, 3, 6), end: new Date(y, 3, 5, 23, 59, 59) };
}

function calendarTaxYear(now: Date): { start: Date; end: Date } {
  const y = now.getFullYear();
  return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59) };
}

function getQuarterlyDates(currency: string, baseYear: number): { date: Date; label: string }[] {
  const configs: Record<string, { months: number[]; days: number[]; labels: string[] }> = {
    USD: { months: [3, 5, 8, 0],  days: [15, 17, 16, 15], labels: ['Q1 estimated tax', 'Q2 estimated tax', 'Q3 estimated tax', 'Q4 estimated tax'] },
    CAD: { months: [2, 5, 8, 11], days: [15, 15, 15, 15], labels: ['Q1 instalment', 'Q2 instalment', 'Q3 instalment', 'Q4 instalment'] },
    AUD: { months: [10, 1, 4, 7], days: [28, 28, 28, 28], labels: ['Q1 PAYG instalment', 'Q2 PAYG instalment', 'Q3 PAYG instalment', 'Q4 PAYG instalment'] },
  };
  const config = configs[currency.toUpperCase()] ?? { months: [2, 5, 8, 11], days: [31, 30, 30, 31], labels: ['Q1 instalment', 'Q2 instalment', 'Q3 instalment', 'Q4 instalment'] };
  const q1Date = new Date(baseYear, config.months[0], config.days[0]);
  return config.months.map((month, i) => {
    let year = baseYear;
    const candidate = new Date(year, month, config.days[i]);
    if (i > 0 && candidate < q1Date) year = baseYear + 1;
    return { date: new Date(year, month, config.days[i]), label: config.labels[i] };
  });
}

/** Returns the next unpaid-looking deadline (soonest future date) and its estimated amount, or null. */
function getNextTaxDeadline(
  ytdIncomeAmount: number, taxRate: number, schedule: 'annual' | 'quarterly', currency: string, now: Date,
): { date: Date; label: string; amount: number } | null {
  const estimatedBill = ytdIncomeAmount * taxRate;

  if (schedule === 'annual') {
    const { end } = ukTaxYear(now);
    const endYear = end.getFullYear();
    const halfBill = estimatedBill / 2;
    const candidates = [
      { date: new Date(endYear, 0, 31), label: 'Balancing payment', amount: estimatedBill + halfBill },
      { date: new Date(endYear, 6, 31), label: '2nd payment on account', amount: halfBill },
    ];
    const future = candidates.filter(c => c.date >= now).sort((a, b) => a.date.getTime() - b.date.getTime());
    return future[0] ?? null;
  }

  const { start } = calendarTaxYear(now);
  const perQ = estimatedBill / 4;
  const dates = getQuarterlyDates(currency, start.getFullYear());
  const future = dates.filter(d => d.date >= now).sort((a, b) => a.date.getTime() - b.date.getTime());
  if (!future[0]) return null;
  return { date: future[0].date, label: future[0].label, amount: perQ };
}

function daysUntil(date: Date, now: Date): number {
  const a = new Date(now); a.setHours(0, 0, 0, 0);
  const b = new Date(date); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Unsubscribe token — HMAC-SHA256(user_id) so the link needs no login ─────

async function signUserId(userId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(UNSUB_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Email template ───────────────────────────────────────────────────────────

function buildEmailHtml(params: {
  currency: string;
  safeToSpend: number;
  deltaVsLastWeek: number | null;
  taxReserve: number;
  emergencyBuffer: number;
  upcomingTotal: number;
  nextDeadline: { label: string; amount: number; days: number } | null;
  unsubscribeUrl: string;
}): string {
  const { currency, safeToSpend, deltaVsLastWeek, taxReserve, emergencyBuffer, upcomingTotal, nextDeadline, unsubscribeUrl } = params;
  const fmt = (n: number) => formatCurrency(n, currency);

  const deltaLine = deltaVsLastWeek === null ? '' : `
    <td style="padding-left: 10px; font-size: 12px; color: #9DAAE0;">${deltaVsLastWeek <= 0 ? '↓' : '↑'} ${fmt(Math.abs(deltaVsLastWeek))} vs. last week</td>`;

  const deadlineBlock = !nextDeadline ? '' : `
    <tr><td style="padding: 18px 32px 0 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px;">
        <tr><td style="padding: 16px 18px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="font-size: 13px; font-weight: 700; color: #92400E;">Coming up: ${nextDeadline.label}</td>
              <td align="right" style="font-size: 13px; font-weight: 700; color: #92400E;">${nextDeadline.days} day${nextDeadline.days === 1 ? '' : 's'}</td>
            </tr>
          </table>
          <div style="font-size: 13px; color: #92400E; opacity: 0.85; margin-top: 4px;">~${fmt(nextDeadline.amount)} due — covered by your tax reserve.</div>
        </td></tr>
      </table>
    </td></tr>`;

  return `<!doctype html>
<html><body style="margin:0; padding:0; background-color:#EEF1FA;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #EEF1FA;">
<tr><td style="padding: 40px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border-radius: 14px; border: 1px solid #E8E8E3; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <tr><td style="padding: 28px 32px 0 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="width: 30px; height: 30px; background-color: #4C5FD5; border-radius: 8px; text-align: center; vertical-align: middle;"><span style="color:#fff; font-size:15px; font-weight:700; line-height:30px;">S</span></td>
      <td style="padding-left: 10px; font-size: 16px; font-weight: 700; color: #1C2B3A; letter-spacing: -0.2px;">Spendable</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding: 24px 32px 0 32px;">
    <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #4C5FD5;">Your weekly check-in</div>
  </td></tr>
  <tr><td style="padding: 20px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #1C2B3A; border-radius: 12px;">
      <tr><td style="padding: 26px 28px;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #9DAAE0;">Safe to spend right now</div>
        <div style="font-size: 40px; font-weight: 800; color: #ffffff; letter-spacing: -1px; margin-top: 6px;">${fmt(safeToSpend)}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top: 10px;"><tr>${deltaLine}</tr></table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding: 18px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="33%" style="padding-right: 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF8; border:1px solid #E8E8E3; border-radius:10px;"><tr><td style="padding:14px;">
        <div style="font-size:10px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; color:#8A9AAA;">Tax reserve</div>
        <div style="font-size:17px; font-weight:700; color:#1C2B3A; margin-top:4px;">${fmt(taxReserve)}</div>
      </td></tr></table></td>
      <td width="34%" style="padding:0 3px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF8; border:1px solid #E8E8E3; border-radius:10px;"><tr><td style="padding:14px;">
        <div style="font-size:10px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; color:#8A9AAA;">Buffer</div>
        <div style="font-size:17px; font-weight:700; color:#1C2B3A; margin-top:4px;">${fmt(emergencyBuffer)}</div>
      </td></tr></table></td>
      <td width="33%" style="padding-left:6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF8; border:1px solid #E8E8E3; border-radius:10px;"><tr><td style="padding:14px;">
        <div style="font-size:10px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; color:#8A9AAA;">Bills due</div>
        <div style="font-size:17px; font-weight:700; color:#1C2B3A; margin-top:4px;">${fmt(upcomingTotal)}</div>
      </td></tr></table></td>
    </tr></table>
  </td></tr>
  ${deadlineBlock}
  <tr><td style="padding: 26px 32px 8px 32px;" align="center">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color:#4C5FD5; border-radius:10px;">
      <a href="${APP_URL}" style="display:inline-block; padding:13px 32px; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none;">Open Spendable</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding: 24px 32px 28px 32px;">
    <div style="height:1px; background-color:#E8E8E3; margin-bottom:20px;"></div>
    <div style="font-size:12px; color:#8A9AAA; line-height:1.6;">
      You're getting this because you have a Spendable account. It goes out once a week, same day, same time — no other emails in between.<br />
      <a href="${unsubscribeUrl}" style="color:#8A9AAA; text-decoration:underline;">Unsubscribe</a>
    </div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ─── Per-user processing ─────────────────────────────────────────────────────

async function processUser(userId: string, email: string): Promise<'sent' | 'skipped'> {
  const { data: settingsRow } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
  const settings: UserSettings = settingsRow ?? {
    tax_rate: 0.25, emergency_buffer_months: 3, starting_balance: 0,
    starting_balance_updated_at: new Date().toISOString(), currency: 'USD',
    tax_schedule: 'annual', email_digest_enabled: true,
  };

  if (settings.email_digest_enabled === false) return 'skipped';

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const windowStart = twelveMonthsAgo.toISOString().split('T')[0];

  const [{ data: income }, { data: expenses }, { data: upcoming }] = await Promise.all([
    supabase.from('income_events').select('amount, date').eq('user_id', userId).gte('date', windowStart),
    supabase.from('recurring_expenses').select('amount, frequency, is_active').eq('user_id', userId),
    supabase.from('upcoming_expenses').select('amount, is_paid').eq('user_id', userId),
  ]);

  const incomeRows = (income ?? []) as IncomeEvent[];
  const expenseRows = (expenses ?? []) as RecurringExpense[];
  const upcomingRows = (upcoming ?? []) as UpcomingExpense[];

  // Nothing to report yet for a brand-new, unonboarded account.
  if (incomeRows.length === 0 && expenseRows.length === 0) return 'skipped';

  const currentBalance = calcCurrentBalance(settings, incomeRows, expenseRows);
  const monthlyExpenses = calcMonthlyExpenses(expenseRows);
  const taxReserve = calcTaxReserve(incomeRows, settings.tax_rate);
  const emergencyBuffer = monthlyExpenses * settings.emergency_buffer_months;
  const upcomingTotal = upcomingRows.filter(u => !u.is_paid).reduce((sum, u) => sum + u.amount, 0);
  const safeToSpend = calcSafeToSpend(currentBalance, taxReserve, emergencyBuffer, upcomingTotal);

  // Next tax deadline — needs income scoped to the current tax year specifically.
  const now = new Date();
  const taxYearStart = settings.tax_schedule === 'annual' ? ukTaxYear(now).start : calendarTaxYear(now).start;
  const { data: taxYearIncome } = await supabase
    .from('income_events').select('amount, date').eq('user_id', userId)
    .gte('date', taxYearStart.toISOString().split('T')[0]);
  const ytdIncomeAmount = (taxYearIncome ?? []).reduce((sum: number, e: { amount: number }) => sum + e.amount, 0);
  const rawDeadline = getNextTaxDeadline(ytdIncomeAmount, settings.tax_rate, settings.tax_schedule, settings.currency, now);
  const nextDeadline = rawDeadline && rawDeadline.amount > 0 && daysUntil(rawDeadline.date, now) <= 45
    ? { label: rawDeadline.label, amount: rawDeadline.amount, days: daysUntil(rawDeadline.date, now) }
    : null;

  const { data: priorState } = await supabase.from('user_digest_state').select('last_safe_to_spend').eq('user_id', userId).single();
  const deltaVsLastWeek = priorState?.last_safe_to_spend != null ? safeToSpend - priorState.last_safe_to_spend : null;

  const token = await signUserId(userId);
  const unsubscribeUrl = `${UNSUBSCRIBE_FN_URL}?user_id=${userId}&token=${token}`;

  const html = buildEmailHtml({
    currency: settings.currency, safeToSpend, deltaVsLastWeek, taxReserve, emergencyBuffer,
    upcomingTotal, nextDeadline, unsubscribeUrl,
  });

  const resendResp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Spendable <hello@spendable.finance>',
      to: [email],
      subject: `Your safe-to-spend this week: ${formatCurrency(safeToSpend, settings.currency)}`,
      html,
    }),
  });
  if (!resendResp.ok) {
    throw new Error(`Resend API error ${resendResp.status}: ${await resendResp.text()}`);
  }

  await supabase.from('user_digest_state').upsert(
    { user_id: userId, last_sent_at: new Date().toISOString(), last_safe_to_spend: safeToSpend },
    { onConflict: 'user_id' },
  );

  return 'sent';
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const results = { sent: 0, skipped: 0, failed: 0 };

  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) break;

    for (const user of data.users) {
      if (!user.email || !user.email_confirmed_at) { results.skipped++; continue; }
      try {
        const outcome = await processUser(user.id, user.email);
        if (outcome === 'sent') results.sent++; else results.skipped++;
      } catch (err) {
        console.error('weekly-digest: failed for user', user.id, err);
        results.failed++;
      }
    }

    if (data.users.length < perPage) break;
    page++;
  }

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
});
