import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DashboardView } from '@/features/dashboard/dashboard-view';
import type { DashboardSummary } from '@/features/dashboard/types';

const mocks = vi.hoisted(() => ({
  tenantLoading: false,
  selectedSlug: 'personal' as string | null,
  selectedTenant: { id: 1, slug: 'personal', name: 'Personal' } as { id: number; slug: string; name: string } | null,
  getSummary: vi.fn(),
}));

vi.mock('@/features/auth/auth-context', () => ({ useAuth: () => ({ user: { id: 1, name: 'Avery Patient', email: 'avery@example.com' } }) }));
vi.mock('@/features/tenants/tenant-context', () => ({ useTenant: () => ({ loading: mocks.tenantLoading, selectedSlug: mocks.selectedSlug, selectedTenant: mocks.selectedTenant }) }));
vi.mock('@/features/dashboard/service', () => ({ getDashboardSummary: mocks.getSummary }));

const reconciliations = [
  { status: 'never_reconciled' as const, needs_attention: true, latest_valid: null, latest_attempt: null },
  { status: 'up_to_date' as const, needs_attention: false, latest_valid: { statement_date: '2026-08-20', reconciled_at: '2026-08-21T12:00:00Z' }, latest_attempt: { statement_date: '2026-08-20', is_valid: true } },
  { status: 'activity_after_reconciliation' as const, needs_attention: true, latest_valid: { statement_date: '2026-07-31', reconciled_at: '2026-08-01T12:00:00Z' }, latest_attempt: { statement_date: '2026-07-31', is_valid: true } },
  { status: 'latest_attempt_invalid' as const, needs_attention: true, latest_valid: null, latest_attempt: { statement_date: '2026-08-20', is_valid: false } },
];

function summary(month = '2026-08'): DashboardSummary {
  return {
    period: { month, start_date: `${month}-01`, end_date: `${month}-31` },
    as_of_date: '2026-08-25',
    accounts: reconciliations.map((reconciliation, index) => ({
      id: index + 1,
      name: ['Clinic Chequing', 'Savings', 'Operating', 'Cash'][index]!,
      type: index === 1 ? 'savings' : 'chequing',
      currency: index === 1 ? 'USD' : 'CAD',
      current_balance: index === 1 ? '900.0000' : '1250.4000',
      last_posted_transaction_date: index === 3 ? null : '2026-08-24',
      reconciliation,
    })),
    account_totals_by_currency: [{ currency: 'CAD', amount: '3751.2000' }, { currency: 'USD', amount: '900.0000' }],
    period_activity: {
      posted_transactions_count: 24,
      by_currency: [
        { currency: 'CAD', posted_transactions_count: 20, amounts_by_type: { income: '10000.0000', expense: '-7250.0000', transfer: '-500.0000' }, uncategorized_amount: '-25.0000', confirmed_net_change: '2225.0000', groups: [{ category: { id: 3, name: 'Operations', type: 'expense', level: 1 }, amounts_by_type: { income: '100.0000', expense: '-7250.0000', transfer: '-500.0000' }, net_change: '-7650.0000' }] },
        { currency: 'USD', posted_transactions_count: 4, amounts_by_type: { income: '0.0000', expense: '0.0000', transfer: '0.0000' }, uncategorized_amount: '650.0000', confirmed_net_change: '650.0000', groups: [] },
      ],
    },
    workflow: { pending_transactions_count: 3, uncategorized_posted_count: 2, uncategorized_pending_count: 1, accounts_needing_attention_count: 7 },
  };
}

async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }

describe('management dashboard view', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-25T16:00:00Z'));
    mocks.tenantLoading = false;
    mocks.selectedSlug = 'personal';
    mocks.selectedTenant = { id: 1, slug: 'personal', name: 'Personal' };
    mocks.getSummary.mockResolvedValue({ data: summary() });
  });

  afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

  it('shows the authenticated greeting, selected profile, all trustworthy sections, and separate CAD/USD values', async () => {
    const responseWithPrivateFields = summary() as DashboardSummary & { tenant_id?: number };
    responseWithPrivateFields.tenant_id = 99;
    Object.assign(responseWithPrivateFields.accounts[0]!, { account_number: '123456789' });
    mocks.getSummary.mockResolvedValue({ data: responseWithPrivateFields });
    render(<DashboardView />);
    expect(screen.getByRole('heading', { level: 1, name: 'Good to see you, Avery' })).toBeVisible();
    expect(await screen.findByText('Personal management overview')).toBeVisible();
    expect(screen.getByText('Total CAD balance')).toBeVisible();
    expect(screen.getByText('Total USD balance')).toBeVisible();
    expect(screen.queryByText('Total balance')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CAD activity' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'USD activity' })).toBeVisible();
    expect(screen.getByText(/Currencies are shown separately/)).toBeVisible();
    expect(screen.getByText(/not accounting profit/)).toBeVisible();
    expect(screen.queryByText(/net income|tax liability|free cash flow/i)).not.toBeInTheDocument();
    expect(screen.getAllByText('Not reconciled').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Up to date').length).toBeGreaterThan(0);
    expect(screen.getAllByText('New activity since reconciliation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reconciliation needs attention').length).toBeGreaterThan(0);
    const desktopBalances = screen.getByRole('table', { name: 'Current confirmed account balances' });
    expect(within(desktopBalances).getByText('No bank balance has been confirmed for this account.')).toBeVisible();
    expect(within(desktopBalances).getByText('Posted activity exists after the latest valid reconciled-through date.')).toBeVisible();
    expect(within(desktopBalances).getByText('The latest comparison no longer agrees with MG5’s calculated balance.')).toBeVisible();
    expect(within(desktopBalances).queryByText(/balances agree/i)).not.toBeInTheDocument();
    expect(screen.getByText(/7 accounts need reconciliation attention/)).toBeVisible();
    expect(screen.getByText('3')).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'Review transactions' })[0]).toHaveAttribute('href', '/dashboard/transactions');
    expect(screen.queryByText(/123456789|tenant_id/i)).not.toBeInTheDocument();
  });

  it('distinguishes tenant loading, no tenant, and initial dashboard loading', async () => {
    mocks.tenantLoading = true;
    const { rerender } = render(<DashboardView />);
    expect(screen.getByText('Loading financial profiles…')).toBeVisible();

    mocks.tenantLoading = false; mocks.selectedSlug = null; mocks.selectedTenant = null; rerender(<DashboardView />);
    expect(screen.getByText('Choose Personal or Clinic to load its dashboard.')).toBeVisible();

    mocks.selectedSlug = 'personal'; mocks.selectedTenant = { id: 1, slug: 'personal', name: 'Personal' }; mocks.getSummary.mockReturnValue(new Promise(() => {})); rerender(<DashboardView />);
    await flush();
    expect(screen.getByLabelText('Loading dashboard summary')).toBeVisible();
  });

  it('shows a retryable API failure without presenting successful zero values', async () => {
    mocks.getSummary.mockRejectedValueOnce(new Error('network'));
    render(<DashboardView />);
    expect(await screen.findByText('Unable to load the management dashboard.')).toBeVisible();
    expect(screen.queryByText('Confirmed net movement')).not.toBeInTheDocument();
    mocks.getSummary.mockResolvedValue({ data: summary() });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Current confirmed balances' })).toBeVisible();
  });

  it('shows the true empty state and links to Accounts', async () => {
    const empty = summary();
    empty.accounts = []; empty.account_totals_by_currency = []; empty.period_activity = { posted_transactions_count: 0, by_currency: [] };
    empty.workflow = { pending_transactions_count: 0, uncategorized_posted_count: 0, uncategorized_pending_count: 0, accounts_needing_attention_count: 0 };
    mocks.getSummary.mockResolvedValue({ data: empty });
    render(<DashboardView />);
    expect(await screen.findByText('No accounts or posted activity yet')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to Accounts' })).toHaveAttribute('href', '/dashboard/accounts');
  });

  it('does not manufacture a currency card when accounts exist but the selected month has no activity', async () => {
    const noActivity = summary();
    noActivity.period_activity = { posted_transactions_count: 0, by_currency: [] };
    mocks.getSummary.mockResolvedValue({ data: noActivity });
    render(<DashboardView />);
    expect(await screen.findByText('No posted transactions were found for August 2026. No currency amount is inferred.')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'CAD activity' })).not.toBeInTheDocument();
  });

  it('retains useful data with a visible indicator during same-month refresh', async () => {
    let resolveRefresh!: (value: unknown) => void;
    mocks.getSummary.mockResolvedValueOnce({ data: summary() }).mockReturnValueOnce(new Promise((resolve) => { resolveRefresh = resolve; }));
    render(<DashboardView />);
    expect(await screen.findByText('Total CAD balance')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }));
    expect(await screen.findByText(/Refreshing dashboard while current data remains visible/)).toBeVisible();
    expect(screen.getByText('Total CAD balance')).toBeVisible();
    await act(async () => resolveRefresh({ data: summary() }));
  });

  it('clears old month amounts immediately while retaining current workflow counts', async () => {
    let resolveJuly!: (value: unknown) => void;
    mocks.getSummary.mockResolvedValueOnce({ data: summary() }).mockReturnValueOnce(new Promise((resolve) => { resolveJuly = resolve; }));
    render(<DashboardView />);
    expect(await screen.findByText('Total CAD balance')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Activity month'), { target: { value: '2026-07' } });
    expect(screen.queryByText('Total CAD balance')).not.toBeInTheDocument();
    expect(screen.getByText('Pending transactions').previousElementSibling).toHaveTextContent('3');
    await act(async () => resolveJuly({ data: summary('2026-07') }));
    expect(await screen.findByRole('heading', { name: 'Posted activity · July 2026' })).toBeVisible();
  });

  it('does not let a late response from the previous month replace the current month', async () => {
    let resolveAugust!: (value: unknown) => void;
    mocks.getSummary
      .mockReturnValueOnce(new Promise((resolve) => { resolveAugust = resolve; }))
      .mockResolvedValueOnce({ data: summary('2026-07') });
    render(<DashboardView />);
    await flush();
    fireEvent.change(screen.getByLabelText('Activity month'), { target: { value: '2026-07' } });
    expect(await screen.findByRole('heading', { name: 'Posted activity · July 2026' })).toBeVisible();
    await act(async () => resolveAugust({ data: summary('2026-08') }));
    expect(screen.getByRole('heading', { name: 'Posted activity · July 2026' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Posted activity · August 2026' })).not.toBeInTheDocument();
  });

  it('remounts on tenant switch, resets the month, and ignores a late old-tenant response', async () => {
    let resolvePersonal!: (value: unknown) => void;
    mocks.getSummary.mockReturnValueOnce(new Promise((resolve) => { resolvePersonal = resolve; })).mockResolvedValueOnce({ data: summary() });
    const { rerender } = render(<DashboardView />);
    await flush();
    mocks.selectedSlug = 'clinic'; mocks.selectedTenant = { id: 2, slug: 'clinic', name: 'Clinic' }; rerender(<DashboardView />);
    expect(screen.getByLabelText('Activity month')).toHaveValue('2026-08');
    expect(await screen.findByText('Clinic management overview')).toBeVisible();
    await act(async () => resolvePersonal({ data: { ...summary(), account_totals_by_currency: [{ currency: 'CAD', amount: '9999.0000' }] } }));
    expect(screen.queryByText('$9,999.00')).not.toBeInTheDocument();
    expect(mocks.getSummary).toHaveBeenLastCalledWith('clinic', '2026-08', expect.any(AbortSignal));
  });
});
