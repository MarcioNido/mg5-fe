import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  slug: 'personal' as string | null,
  list: vi.fn(),
  bulk: vi.fn(),
  categories: [] as Array<{ id: number; name: string; type: 'income' | 'expense' | 'transfer'; level: number; parent: null }>,
  accounts: [{ id: 4, name: 'Account', type: 'chequing', account_number: null, currency: 'CAD', opening_balance: '0', opening_balance_date: null }],
}));
vi.mock('@/features/tenants/tenant-context', () => ({ useTenant: () => ({ selectedSlug: mocks.slug }) }));
vi.mock('@/features/accounts/use-accounts', () => ({ useAccounts: () => ({ accounts: mocks.accounts, loading: false, error: null, retry: vi.fn() }) }));
vi.mock('@/features/transactions/use-categories', () => ({ useCategories: () => ({ categories: mocks.categories, loading: false, error: null, retry: vi.fn() }) }));
vi.mock('@/features/transactions/service', () => ({ listTransactions: mocks.list, bulkCategorizeTransactions: mocks.bulk }));
vi.mock('@/features/transactions/transaction-list', () => ({ TransactionList: ({ items, reviewedIds, onReviewedChange, bulkSelectedIds, onBulkSelectionChange }: { items: Array<{ id: number; description: string }>; reviewedIds?: ReadonlySet<number>; onReviewedChange?: (id: number, checked: boolean) => void; bulkSelectedIds?: ReadonlySet<number>; onBulkSelectionChange?: (id: number, checked: boolean) => void }) => <div>{items.map((item) => <label key={item.id}>{item.description}{onReviewedChange && <input aria-label={`Checked against statement: ${item.description}`} type="checkbox" checked={reviewedIds?.has(item.id) ?? false} onChange={(event) => onReviewedChange(item.id, event.target.checked)} />}{onBulkSelectionChange && <input aria-label={`Select transaction: ${item.description}`} type="checkbox" checked={bulkSelectedIds?.has(item.id) ?? false} onChange={(event) => onBulkSelectionChange(item.id, event.target.checked)} />}</label>)}</div> }));
vi.mock('@/features/transactions/transaction-form-dialog', () => ({ TransactionFormDialog: () => <div role="dialog">Transaction form</div> }));

import { transactionViewContextFromQuery, TransactionsView } from '@/features/transactions/transactions-view';
import { ApiError } from '@/lib/api/error';

const meta = { current_page: 1, from: null, last_page: 1, links: [], path: '', per_page: 25, to: null, total: 0 };
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }

describe('transactions view states and tenant boundary', () => {
  beforeEach(() => { sessionStorage.clear(); mocks.slug = 'personal'; mocks.categories = []; mocks.accounts = [{ id: 4, name: 'Account', type: 'chequing', account_number: null, currency: 'CAD', opening_balance: '0', opening_balance_date: null }]; mocks.list.mockResolvedValue({ data: [], links: {}, meta }); mocks.bulk.mockResolvedValue({ data: { updated_count: 1, category: {} } }); vi.stubGlobal('confirm', vi.fn(() => true)); });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

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

  it('selects ordinary transactions and applies one category in bulk', async () => {
    const category = { id: 8, name: 'Patient services', type: 'income' as const, level: 1, parent: null };
    mocks.categories = [category];
    mocks.list.mockResolvedValue({ data: [{ id: 91, description: 'PATIENT DEPOSIT' }], links: {}, meta: { ...meta, from: 1, to: 1, total: 1 } });
    render(<TransactionsView />); await flush();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select transaction: PATIENT DEPOSIT' }));
    expect(screen.getByText('1 selected')).toBeVisible();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Category for selected transactions' }));
    fireEvent.click(screen.getByRole('option', { name: 'Patient services' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply category' }));

    await waitFor(() => expect(mocks.bulk).toHaveBeenCalledWith('personal', { transaction_ids: [91], category_id: 8 }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Existing single categories will be replaced'));
    expect(await screen.findByText('1 transaction categorized as Patient services.')).toBeVisible();
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument();
  });

  it('loads a reconciliation scope from the URL and keeps temporary checks across pagination visits', async () => {
    const query = { review: 'reconciliation', account_id: '4', status: 'posted', date_from: '2026-08-01', date_to: '2026-08-24' };
    mocks.list.mockResolvedValue({ data: [{ id: 91, description: 'BANK ROW' }], links: {}, meta: { ...meta, from: 1, to: 1, total: 1 } });
    const view = render(<TransactionsView query={query} />); await flush();

    expect(mocks.list).toHaveBeenLastCalledWith('personal', expect.objectContaining({ accountId: '4', status: 'posted', dateFrom: '2026-08-01', dateTo: '2026-08-24' }), expect.any(AbortSignal));
    expect(screen.getByText('Statement reconciliation review')).toBeVisible();
    expect(screen.getByText(/Aug 1, 2026.*Aug 24, 2026/)).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Account' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByLabelText('Date from')).toBeDisabled();
    expect(screen.getByLabelText('Date to')).toBeDisabled();

    const check = screen.getByRole('checkbox', { name: 'Checked against statement: BANK ROW' });
    fireEvent.click(check);
    expect(check).toBeChecked();
    expect(screen.getByText('1 of 1 checked')).toBeVisible();

    view.unmount();
    render(<TransactionsView query={query} />); await flush();
    expect(screen.getByRole('checkbox', { name: 'Checked against statement: BANK ROW' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Clear checks' }));
    expect(screen.getByRole('checkbox', { name: 'Checked against statement: BANK ROW' })).not.toBeChecked();
  });

  it('sanitizes transaction review query parameters', () => {
    expect(transactionViewContextFromQuery({ review: 'reconciliation', account_id: '4', status: 'posted', date_from: '2026-08-01', date_to: '2026-08-24' })).toEqual(expect.objectContaining({
      filters: expect.objectContaining({ accountId: '4', status: 'posted', dateFrom: '2026-08-01', dateTo: '2026-08-24' }),
      review: { accountId: '4', dateFrom: '2026-08-01', dateTo: '2026-08-24' },
    }));
    expect(transactionViewContextFromQuery({ review: 'reconciliation', account_id: '../4', date_from: '2026-09-01', date_to: '2026-08-24' })).toEqual(expect.objectContaining({ review: null }));
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
