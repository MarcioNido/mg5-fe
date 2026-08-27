import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Account } from '@/features/accounts/types';
import { differenceMeaning, reconciliationReviewHref, ReconciliationView, validBankBalance, validStatementDate } from '@/features/reconciliation/reconciliation-view';
import { ApiError } from '@/lib/api/error';

const account = { id: 17, account_number: null, name: 'Clinic Chequing', type: 'chequing' as const, currency: 'CAD', opening_balance: '100.0000', opening_balance_date: '2026-01-01' };
const secondAccount = { ...account, id: 18, name: 'US Savings', type: 'savings' as const, currency: 'USD' };
const validRow = { id: 4, statement_date: '2026-08-20', entered_bank_balance: '1250.4000', calculated_balance: '1250.4000', difference: '0.0000', is_valid: true, reconciled_at: '2026-08-20T15:00:00Z' };
const invalidRow = { ...validRow, id: 5, statement_date: '2026-08-21', entered_bank_balance: '1240.4000', difference: '-10.0000', is_valid: false, reconciled_at: null };
const meta = { current_page: 1, from: 1, last_page: 2, links: [], path: '', per_page: 15, to: 2, total: 17 };
const historyResponse = { data: [invalidRow, validRow], links: { first: null, last: null, prev: null, next: null }, meta };

const mocks = vi.hoisted(() => ({
  slug: 'personal' as string | null,
  accounts: [] as Account[],
  accountsLoading: false,
  accountsError: null as string | null,
  retryAccounts: vi.fn(),
  preview: vi.fn(),
  history: vi.fn(),
  latest: vi.fn(),
  store: vi.fn(),
}));

vi.mock('@/features/tenants/tenant-context', () => ({ useTenant: () => ({ selectedSlug: mocks.slug }) }));
vi.mock('@/features/accounts/use-accounts', () => ({ useAccounts: () => ({ accounts: mocks.accounts, loading: mocks.accountsLoading, error: mocks.accountsError, retry: mocks.retryAccounts }) }));
vi.mock('@/features/reconciliation/service', () => ({
  previewReconciliation: mocks.preview,
  listReconciliations: mocks.history,
  latestReconciliation: mocks.latest,
  storeReconciliation: mocks.store,
}));

async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }

describe('reconciliation view helpers', () => {
  it('strictly validates civil dates and decimal strings without numeric conversion', () => {
    expect(validStatementDate('2024-02-29')).toBe(true);
    expect(validStatementDate('2026-02-29')).toBe(false);
    ['0', '-0.0000', '123456789012345.1234'].forEach((value) => expect(validBankBalance(value)).toBe(true));
    ['1,000', '$1', '1.', '.5', '1234567890123456', '1.00000'].forEach((value) => expect(validBankBalance(value)).toBe(false));
    expect(differenceMeaning('10.0000')).toContain('higher');
    expect(differenceMeaning('-10.0000')).toContain('lower');
    expect(differenceMeaning('0.0000')).toBe('Balances agree.');
    expect(reconciliationReviewHref(17, '2026-08-24', {
      statement_date: '2026-08-24',
      calculated_balance: '0.0000',
      review_period: { date_from: '2026-08-01', date_to: '2026-08-24', previous_statement_date: '2026-07-31' },
    })).toBe('/dashboard/transactions?review=reconciliation&account_id=17&status=posted&date_to=2026-08-24&date_from=2026-08-01');
  });
});

describe('reconciliation view', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(new Date('2026-08-24T16:00:00Z'));
    mocks.slug = 'personal'; mocks.accounts = [account, secondAccount]; mocks.accountsLoading = false; mocks.accountsError = null;
    mocks.preview.mockResolvedValue({ data: { statement_date: '2026-08-24', calculated_balance: '1250.4000', review_period: { date_from: '2026-08-01', date_to: '2026-08-24', previous_statement_date: '2026-07-31' } } });
    mocks.history.mockResolvedValue(historyResponse); mocks.latest.mockResolvedValue({ data: validRow }); mocks.store.mockResolvedValue({ data: validRow });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

  it('selects the first ordered account, defaults to the Toronto date, and loads all independent reads', async () => {
    render(<ReconciliationView />);
    expect(await screen.findByDisplayValue('2026-08-24')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Account' })).toHaveTextContent('Clinic Chequing');
    expect((await screen.findAllByText('$1,250.40')).length).toBeGreaterThan(0);
    expect(mocks.preview).toHaveBeenCalledWith('personal', 17, '2026-08-24', expect.any(AbortSignal));
    expect(mocks.latest).toHaveBeenCalledWith('personal', 17, expect.any(AbortSignal));
    expect(mocks.history).toHaveBeenCalledWith('personal', 17, 1, expect.any(AbortSignal));
    expect(screen.getAllByText('Needs attention').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Valid').length).toBeGreaterThan(0);
    expect(screen.getByText('17 total')).toBeVisible();
  });

  it('distinguishes account loading, failure, and the true empty state', async () => {
    mocks.accountsLoading = true; mocks.accounts = [];
    const { rerender } = render(<ReconciliationView />);
    expect(screen.getByText('Loading accounts…')).toBeVisible(); expect(screen.queryByText('Add an account before reconciling')).not.toBeInTheDocument();
    mocks.accountsLoading = false; mocks.accountsError = 'Unable to load accounts.'; rerender(<ReconciliationView />);
    expect(screen.getByText('Unable to load accounts.')).toBeVisible(); expect(screen.queryByText('Add an account before reconciling')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' })); expect(mocks.retryAccounts).toHaveBeenCalled();
    mocks.accountsError = null; rerender(<ReconciliationView />);
    expect(screen.getByText('Add an account before reconciling')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to Accounts' })).toHaveAttribute('href', '/dashboard/accounts');
  });

  it('does not expose stale preview data after a date change and supports preview Retry', async () => {
    let resolveNext!: (value: unknown) => void;
    mocks.preview.mockResolvedValueOnce({ data: { statement_date: '2026-08-24', calculated_balance: '1250.4000' } }).mockReturnValueOnce(new Promise((resolve) => { resolveNext = resolve; }));
    render(<ReconciliationView />); expect((await screen.findAllByText('$1,250.40')).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByDisplayValue('2026-08-24'), { target: { value: '2026-08-25' } });
    const previewCard = screen.getByText('MG5 calculated balance').closest('.MuiCardContent-root')!;
    expect(within(previewCard as HTMLElement).queryByText('$1,250.40')).not.toBeInTheDocument(); await flush(); expect(screen.getByText('Calculating balance…')).toBeVisible();
    await act(async () => resolveNext({ data: { statement_date: '2026-08-25', calculated_balance: '1300.0000' } }));
    expect(await screen.findByText('$1,300.00')).toBeVisible();

    cleanup(); mocks.preview.mockReset().mockRejectedValue(new Error('network'));
    render(<ReconciliationView />); expect(await screen.findByText('Unable to calculate the MG5 balance.')).toBeVisible();
    mocks.preview.mockResolvedValue({ data: { statement_date: '2026-08-24', calculated_balance: '1.0000' } });
    fireEvent.click(within(screen.getByText('Unable to calculate the MG5 balance.').closest('.MuiAlert-root')!).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('$1.00')).toBeVisible();
  });

  it('submits the exact string once, protects inputs, and presents an invalid backend result', async () => {
    let resolveStore!: (value: unknown) => void;
    mocks.store.mockReturnValue(new Promise((resolve) => { resolveStore = resolve; }));
    render(<ReconciliationView />); expect((await screen.findAllByText('$1,250.40')).length).toBeGreaterThan(0);
    const input = screen.getByRole('textbox', { name: /Bank balance/ }); fireEvent.change(input, { target: { value: '1240.4000' } });
    const save = screen.getByRole('button', { name: 'Save comparison' }); fireEvent.click(save); fireEvent.click(save);
    expect(mocks.store).toHaveBeenCalledTimes(1);
    expect(mocks.store).toHaveBeenCalledWith('personal', 17, { statement_date: '2026-08-24', entered_bank_balance: '1240.4000' });
    expect(input).toBeDisabled(); expect(screen.getByRole('combobox', { name: 'Account' })).toHaveAttribute('aria-disabled', 'true');
    await act(async () => resolveStore({ data: { ...invalidRow, statement_date: '2026-08-24' } }));
    expect(await screen.findByText('Balances do not agree')).toBeVisible(); expect(screen.getByText(/entered bank balance is lower/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Review transactions' })).toHaveAttribute('href', '/dashboard/transactions?review=reconciliation&account_id=17&status=posted&date_to=2026-08-24&date_from=2026-08-01');
    await waitFor(() => { expect(mocks.preview).toHaveBeenCalledTimes(2); expect(mocks.latest).toHaveBeenCalledTimes(2); expect(mocks.history).toHaveBeenCalledTimes(2); });
  });

  it('prevents history review from changing the submitted selection while store is pending', async () => {
    let resolveStore!: (value: unknown) => void;
    mocks.store.mockReturnValue(new Promise((resolve) => { resolveStore = resolve; }));
    render(<ReconciliationView />); expect((await screen.findAllByText('$1,250.40')).length).toBeGreaterThan(0);
    const bankInput = screen.getByRole('textbox', { name: /Bank balance/ });
    fireEvent.change(bankInput, { target: { value: '1240.4000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save comparison' }));

    const reviewActions = screen.getAllByRole('button', { name: 'Review this date' });
    reviewActions.forEach((action) => expect(action).toBeDisabled());
    reviewActions[0]!.removeAttribute('disabled');
    fireEvent.click(reviewActions[0]!);
    expect(screen.getByDisplayValue('2026-08-24')).toBeVisible();
    expect(bankInput).toHaveValue('1240.4000');
    expect(mocks.store).toHaveBeenCalledTimes(1);

    await act(async () => resolveStore({ data: { ...invalidRow, statement_date: '2026-08-24' } }));
    expect(await screen.findByText('Balances do not agree')).toBeVisible();
    expect(screen.getByText(/entered bank balance is lower/)).toBeVisible();
    expect(screen.getByDisplayValue('2026-08-24')).toBeVisible();
    expect(bankInput).toHaveValue('1240.4000');
  });

  it('clears the old preview immediately when reviewing a history date and waits for its matching preview', async () => {
    let resolveReviewedPreview!: (value: unknown) => void;
    mocks.preview
      .mockResolvedValueOnce({ data: { statement_date: '2026-08-24', calculated_balance: '1250.4000' } })
      .mockReturnValueOnce(new Promise((resolve) => { resolveReviewedPreview = resolve; }));
    render(<ReconciliationView />); expect((await screen.findAllByText('$1,250.40')).length).toBeGreaterThan(0);
    const previewCard = screen.getByText('MG5 calculated balance').closest('.MuiCardContent-root') as HTMLElement;

    fireEvent.click(screen.getAllByRole('button', { name: 'Review this date' })[0]!);
    expect(screen.getByDisplayValue('2026-08-21')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /Bank balance/ })).toHaveValue('1240.4000');
    expect(within(previewCard).queryByText('$1,250.40')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save comparison' })).toBeDisabled();
    await flush();
    expect(screen.getByText('Calculating balance…')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save comparison' })).toBeDisabled();

    await act(async () => resolveReviewedPreview({ data: { statement_date: '2026-08-21', calculated_balance: '1300.0000' } }));
    expect(await within(previewCard).findByText('$1,300.00')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save comparison' })).toBeEnabled();
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it('keeps the authoritative result when a refresh fails and maps backend field errors', async () => {
    render(<ReconciliationView />); expect((await screen.findAllByText('$1,250.40')).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole('textbox', { name: /Bank balance/ }), { target: { value: '1250.4000' } });
    mocks.preview.mockRejectedValueOnce(new Error('refresh')); mocks.latest.mockRejectedValueOnce(new Error('refresh')); mocks.history.mockRejectedValueOnce(new Error('refresh'));
    fireEvent.click(screen.getByRole('button', { name: 'Save comparison' }));
    expect(await screen.findByText('Balances agree')).toBeVisible();
    expect(await screen.findByText('Unable to calculate the MG5 balance.')).toBeVisible();

    cleanup(); mocks.store.mockRejectedValueOnce(new ApiError(422, 'Invalid.', { entered_bank_balance: ['Backend balance error.'] }));
    render(<ReconciliationView />); expect((await screen.findAllByText('$1,250.40')).length).toBeGreaterThan(0); fireEvent.change(screen.getByRole('textbox', { name: /Bank balance/ }), { target: { value: '1.2' } }); fireEvent.click(screen.getByRole('button', { name: 'Save comparison' }));
    expect(await screen.findByText('Backend balance error.')).toBeVisible();
  });

  it('reviews an existing date without auto-submit and does not silently replace a dirty draft', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<ReconciliationView />); expect((await screen.findAllByText('$1,250.40')).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole('textbox', { name: /Bank balance/ }), { target: { value: '9.0000' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Review this date' })[0]!);
    expect(confirm).toHaveBeenCalled(); expect(screen.getByRole('textbox', { name: /Bank balance/ })).toHaveValue('9.0000');
    fireEvent.click(screen.getAllByRole('button', { name: 'Review this date' })[0]!);
    expect(screen.getByRole('textbox', { name: /Bank balance/ })).toHaveValue('1240.4000'); expect(screen.getByDisplayValue('2026-08-21')).toBeVisible();
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it('fully resets account-scoped state when the selected account disappears', async () => {
    mocks.store.mockResolvedValueOnce({ data: { ...validRow, statement_date: '2026-08-24' } });
    const { rerender } = render(<ReconciliationView />);
    expect((await screen.findAllByText('$1,250.40')).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole('textbox', { name: /Bank balance/ }), { target: { value: '1250.4000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save comparison' }));
    expect(await screen.findByText('Balances agree')).toBeVisible();
    await waitFor(() => expect(mocks.preview.mock.calls.length).toBeGreaterThanOrEqual(2));

    mocks.preview.mockReturnValueOnce(new Promise(() => {}));
    mocks.latest.mockReturnValueOnce(new Promise(() => {}));
    mocks.history.mockReturnValueOnce(new Promise(() => {}));
    mocks.accounts = [secondAccount];
    rerender(<ReconciliationView />);
    await flush();

    expect(screen.getByRole('combobox', { name: 'Account' })).toHaveTextContent('US Savings');
    expect(screen.getByRole('textbox', { name: /Bank balance/ })).toHaveValue('');
    expect(screen.getByDisplayValue('2026-08-24')).toBeVisible();
    expect(screen.queryByText('Balances agree')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Reconciliation history pages')).not.toBeInTheDocument();
    const previewCard = screen.getByText('MG5 calculated balance').closest('.MuiCardContent-root') as HTMLElement;
    expect(within(previewCard).queryByText('$1,250.40')).not.toBeInTheDocument();
    expect(screen.getByText('Calculating balance…')).toBeVisible();
    expect(screen.getByText('Loading latest reconciliation…')).toBeVisible();
    expect(screen.getByLabelText('Loading reconciliation history')).toBeVisible();
    expect(mocks.preview).toHaveBeenLastCalledWith('personal', 18, '2026-08-24', expect.any(AbortSignal));
    expect(mocks.latest).toHaveBeenLastCalledWith('personal', 18, expect.any(AbortSignal));
    expect(mocks.history).toHaveBeenLastCalledWith('personal', 18, 1, expect.any(AbortSignal));
  });

  it('remounts on tenant replacement and ignores late old-tenant reads', async () => {
    let resolveOld!: (value: unknown) => void;
    mocks.preview.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }));
    const { rerender } = render(<ReconciliationView />); await flush();
    mocks.slug = 'clinic'; rerender(<ReconciliationView />); await flush();
    await act(async () => resolveOld({ data: { statement_date: '2026-08-24', calculated_balance: '9999.0000' } }));
    expect(screen.queryByText(/9,999/)).not.toBeInTheDocument();
    expect(mocks.preview).toHaveBeenLastCalledWith('clinic', 17, '2026-08-24', expect.any(AbortSignal));
  });
});
