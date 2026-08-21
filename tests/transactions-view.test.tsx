import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  slug: 'personal' as string | null,
  list: vi.fn(),
  accounts: [{ id: 4, name: 'Account', type: 'chequing', account_number: null, currency: 'CAD', opening_balance: '0', opening_balance_date: null }],
}));
vi.mock('@/features/tenants/tenant-context', () => ({ useTenant: () => ({ selectedSlug: mocks.slug }) }));
vi.mock('@/features/accounts/use-accounts', () => ({ useAccounts: () => ({ accounts: mocks.accounts, loading: false, error: null, retry: vi.fn() }) }));
vi.mock('@/features/transactions/use-categories', () => ({ useCategories: () => ({ categories: [], loading: false, error: null, retry: vi.fn() }) }));
vi.mock('@/features/transactions/service', () => ({ listTransactions: mocks.list }));
vi.mock('@/features/transactions/transaction-list', () => ({ TransactionList: ({ items }: { items: Array<{ description: string }> }) => <div>{items.map((item) => item.description)}</div> }));
vi.mock('@/features/transactions/transaction-form-dialog', () => ({ TransactionFormDialog: () => <div role="dialog">Transaction form</div> }));

import { TransactionsView } from '@/features/transactions/transactions-view';
import { ApiError } from '@/lib/api/error';

const meta = { current_page: 1, from: null, last_page: 1, links: [], path: '', per_page: 25, to: null, total: 0 };
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }

describe('transactions view states and tenant boundary', () => {
  beforeEach(() => { mocks.slug = 'personal'; mocks.accounts = [{ id: 4, name: 'Account', type: 'chequing', account_number: null, currency: 'CAD', opening_balance: '0', opening_balance_date: null }]; mocks.list.mockResolvedValue({ data: [], links: {}, meta }); });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('shows loading and then the unfiltered empty state with total', async () => {
    let resolve!: (value: unknown) => void; mocks.list.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<TransactionsView />); await flush();
    expect(screen.getByLabelText('Loading transactions')).toBeVisible();
    await act(async () => resolve({ data: [], links: {}, meta }));
    expect(screen.getByText('No transactions yet')).toBeVisible(); expect(screen.getByText('0 total')).toBeVisible();
  });

  it('shows error and Retry', async () => {
    mocks.list.mockRejectedValue(new Error('network')); render(<TransactionsView />); await flush();
    expect(screen.getByText('Unable to load transactions.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await flush(); expect(mocks.list.mock.calls.length).toBeGreaterThan(1);
  });

  it('shows the public ApiError message and Retry', async () => {
    mocks.list.mockRejectedValue(new ApiError(422, 'The selected category is not available for this profile.'));
    render(<TransactionsView />); await flush();
    expect(screen.getByText('The selected category is not available for this profile.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await flush();
    expect(mocks.list.mock.calls.length).toBeGreaterThan(1);
  });

  it('applies Review uncategorized immediately and can exit review', async () => {
    render(<TransactionsView />); await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Review uncategorized' })); await flush();
    expect(mocks.list).toHaveBeenLastCalledWith('personal', expect.objectContaining({ page: 1, uncategorized: true, categoryId: '' }), expect.any(AbortSignal));
    expect(screen.getByText(/Reviewing uncategorized transactions/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Exit review' })); await flush();
    expect(mocks.list).toHaveBeenLastCalledWith('personal', expect.objectContaining({ uncategorized: false }), expect.any(AbortSignal));
  });

  it('applies Search on Enter, validates dates, and clears filters', async () => {
    render(<TransactionsView />); await flush();
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: '  rent  ' } });
    fireEvent.keyDown(screen.getByLabelText('Search'), { key: 'Enter', code: 'Enter' }); await flush();
    expect(mocks.list).toHaveBeenLastCalledWith('personal', expect.objectContaining({ page: 1, search: 'rent' }), expect.any(AbortSignal));
    fireEvent.change(screen.getByLabelText('Date from'), { target: { value: '2026-08-20' } });
    fireEvent.change(screen.getByLabelText('Date to'), { target: { value: '2026-08-19' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(screen.getAllByText('Date to must be on or after Date from.').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' })); await flush(); expect(screen.getByLabelText('Search')).toHaveValue('');
  });

  it('remounts clean state and prevents late old-tenant data after a tenant switch', async () => {
    let resolveOld!: (value: unknown) => void; mocks.list.mockImplementationOnce(() => new Promise((done) => { resolveOld = done; })).mockResolvedValue({ data: [], links: {}, meta });
    const { rerender } = render(<TransactionsView />); await flush();
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'old filter' } }); fireEvent.click(screen.getByRole('button', { name: 'Add transaction' })); expect(screen.getByRole('dialog')).toBeVisible();
    mocks.slug = 'clinic'; rerender(<TransactionsView />); await flush();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.getByLabelText('Search')).toHaveValue('');
    await act(async () => resolveOld({ data: [{ description: 'OLD TENANT' }], links: {}, meta: { ...meta, total: 1 } }));
    expect(screen.queryByText('OLD TENANT')).not.toBeInTheDocument();
    expect(mocks.list).toHaveBeenLastCalledWith('clinic', expect.objectContaining({ search: '' }), expect.any(AbortSignal));
  });
});
