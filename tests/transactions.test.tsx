import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mutations = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), remove: vi.fn() }));
vi.mock('@/features/transactions/service', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/transactions/service')>(),
  createTransaction: mutations.create,
  updateTransaction: mutations.update,
  deleteTransaction: mutations.remove,
}));

import { buildCategoryOptions } from '@/features/transactions/category-options';
import { decimalToUnits, splitRemaining, unitsToDecimal } from '@/features/transactions/decimal';
import { listCategories, listTransactions, transactionQuery } from '@/features/transactions/service';
import { TransactionFormDialog } from '@/features/transactions/transaction-form-dialog';
import { TransactionList } from '@/features/transactions/transaction-list';
import { SplitEditor } from '@/features/transactions/split-editor';
import type { Category, Transaction, TransactionFilters } from '@/features/transactions/types';
import { ApiError } from '@/lib/api/error';
import { formatDateOnly, todayInBusinessTimezone } from '@/lib/format/date';

const account = { id: 4, name: 'Clinic Chequing', type: 'chequing' as const, account_number: null, currency: 'CAD', opening_balance: '0.0000', opening_balance_date: null };
const root: Category = { id: 1, name: 'Operating expenses', type: 'expense', level: 0, parent: null };
const child: Category = { id: 2, name: 'Staffing', type: 'expense', level: 1, parent: { id: root.id, name: root.name, type: root.type, level: root.level } };
const categories = [child, root];
const options = buildCategoryOptions(categories);
const transaction: Transaction = {
  id: 91, account_id: 4, account: { id: 4, name: account.name, type: account.type, currency: 'CAD' },
  transaction_date: '2026-08-20', amount: '-125.4000', description: 'MEDICAL SUPPLIES', notes: 'Reviewed', status: 'posted', origin: 'csv', posted_at: '2026-08-20T14:12:00Z',
  category_id: 2, category: child, splits: [], is_import_linked: true, bank_fields_editable: false, deletable: false,
};
const editableTransaction: Transaction = { ...transaction, origin: 'manual', is_import_linked: false, bank_fields_editable: true, deletable: true };
const splitTransaction: Transaction = {
  ...editableTransaction,
  category_id: null,
  category: null,
  splits: [
    { id: 31, category_id: 1, amount: '-100.0000', description: 'Operations', category: root },
    { id: 32, category_id: 2, amount: '-25.4000', description: 'Staffing', category: child },
  ],
};
const filters: TransactionFilters = { page: 2, perPage: 25, accountId: '4', status: 'posted', origin: 'csv', categoryId: '', uncategorized: false, dateFrom: '', dateTo: '', search: '  supplies  ' };

function chooseOption(label: string | RegExp, option: string) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
  fireEvent.click(screen.getByRole('option', { name: option }));
}

function enterSplitRows(firstAmount: string, secondAmount: string) {
  fireEvent.click(screen.getByLabelText('Split into categories'));
  chooseOption(/Split 1 category/, 'Operating expenses');
  chooseOption(/Split 2 category/, 'Operating expenses › Staffing');
  fireEvent.change(screen.getByLabelText(/Split 1 amount/), { target: { value: firstAmount } });
  fireEvent.change(screen.getByLabelText(/Split 2 amount/), { target: { value: secondAmount } });
}

describe('transaction contracts and helpers', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  it('builds flat queries, trims search, and omits empty filters', () => {
    expect(transactionQuery(filters)).toBe('page=2&per_page=25&account_id=4&status=posted&origin=csv&search=supplies');
    expect(transactionQuery({ ...filters, accountId: '', status: '', origin: '', uncategorized: true })).toContain('uncategorized=true');
    expect(transactionQuery(filters)).not.toContain('filter%5B');
  });

  it('uses tenant-aware list and category requests', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [], links: {}, meta: {} }), { headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: categories }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    await listTransactions('clinic', filters);
    await listCategories('clinic');
    expect(fetchMock.mock.calls.map((call) => (call[1] as RequestInit).method ?? 'GET')).toEqual(['GET', 'GET']);
    fetchMock.mock.calls.forEach((call) => expect((call[1] as RequestInit).headers).toEqual(expect.objectContaining({})));
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers).toHaveProperty('get');
    expect(((fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers).get('X-Tenant-Slug')).toBe('clinic');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/categories');
  });

  it('builds safe, sorted category paths with absent, removed, and cyclic parents', () => {
    expect(options.map((option) => option.label)).toEqual(['Operating expenses', 'Operating expenses › Staffing']);
    const orphan: Category = { id: 8, name: 'Orphan child', type: 'expense', level: 2, parent: { id: 7, name: 'Removed parent', type: 'expense', level: 1 } };
    expect(buildCategoryOptions([orphan])[0]?.label).toBe('Removed parent › Orphan child');
    expect(buildCategoryOptions([{ ...orphan, parent: null }])[0]?.label).toBe('Orphan child');
    const cyclic: Category = { id: 9, name: 'Cycle', type: 'expense', level: 2, parent: { id: 9, name: 'Cycle', type: 'expense', level: 2 } };
    expect(buildCategoryOptions([cyclic])[0]?.label).toBe('Cycle');
  });

  it('uses exact four-decimal integer arithmetic for positive and negative splits', () => {
    expect(decimalToUnits('125.5000')).toBe(1255000n);
    expect(decimalToUnits('-42.75')).toBe(-427500n);
    expect(decimalToUnits('1.00001')).toBeNull();
    expect(splitRemaining('10.0000', ['4.9999', '5.0000'])).toBe(1n);
    expect(splitRemaining('-10.0000', ['-4.5000', '-5.5000'])).toBe(0n);
    expect(unitsToDecimal(-1n)).toBe('-0.0001');
  });

  it('formats date-only values without day shifting and calculates Toronto today', () => {
    expect(formatDateOnly('2026-08-20')).toMatch(/Aug/);
    expect(formatDateOnly('2026-02-30')).toBe('Not available');
    expect(formatDateOnly('not-a-date')).toBe('Not available');
    expect(todayInBusinessTimezone(new Date('2026-01-01T03:30:00Z'))).toBe('2025-12-31');
  });
});

describe('transaction presentation and form', () => {
  beforeEach(() => {
    mutations.create.mockResolvedValue({ data: transaction });
    mutations.update.mockResolvedValue({ data: transaction });
    mutations.remove.mockResolvedValue(undefined);
    vi.stubGlobal('confirm', vi.fn(() => true));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  it('renders desktop and mobile presentations with textual status, Imported origin, category, currency, and edit actions', () => {
    render(<TransactionList items={[transaction]} categories={categories} onEdit={vi.fn()} />);
    expect(screen.getByRole('table', { name: 'Transactions' })).toBeInTheDocument();
    expect(screen.getByLabelText('Transactions mobile list')).toBeInTheDocument();
    expect(screen.getAllByText('Posted').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Imported').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Operating expenses › Staffing').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/125\.40/)[0]).toHaveTextContent('-');
    expect(screen.getByRole('button', { name: 'Edit MEDICAL SUPPLIES' })).toBeVisible();
  });

  it('presents split and Uncategorized labels', () => {
    const split = { ...transaction, splits: [{ id: 3, category_id: 2, amount: '-125.4000', description: null, category: child }], category_id: null, category: null };
    const uncategorized = { ...transaction, id: 92, description: 'NO CATEGORY', category_id: null, category: null, splits: [] };
    render(<TransactionList items={[split, uncategorized]} categories={categories} onEdit={vi.fn()} />);
    expect(screen.getAllByText('Split into 1 categories').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Uncategorized').length).toBeGreaterThan(0);
  });

  it('creates Pending by default, keeps signed amount strings, and sends explicit empty splits', async () => {
    render(<TransactionFormDialog open transaction={null} tenantSlug="personal" accounts={[account]} categoryOptions={options} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: /Status/ })).toHaveTextContent('Pending');
    expect(screen.getByLabelText(/Transaction date/)).toHaveValue(todayInBusinessTimezone());
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '-42.7500' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Manual expense' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    await waitFor(() => expect(mutations.create).toHaveBeenCalledWith('personal', expect.objectContaining({ amount: '-42.7500', status: 'pending', category_id: null, splits: [] })));
  });

  it('creates in split mode with null category and two decimal-string rows', async () => {
    render(<TransactionFormDialog open transaction={null} tenantSlug="personal" accounts={[account]} categoryOptions={options} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '10.0000' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Split deposit' } });
    enterSplitRows('4.2500', '5.7500');
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    await waitFor(() => expect(mutations.create).toHaveBeenCalledWith('personal', expect.objectContaining({
      category_id: null,
      splits: [
        { category_id: 1, amount: '4.2500', description: null },
        { category_id: 2, amount: '5.7500', description: null },
      ],
    })));
  });

  it('blocks a split mutation when the exact difference is 0.0001', () => {
    render(<TransactionFormDialog open transaction={null} tenantSlug="personal" accounts={[account]} categoryOptions={options} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '10.0000' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Nearly balanced split' } });
    enterSplitRows('4.9999', '5.0000');
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    expect(screen.getByText('Split amounts must exactly equal the transaction amount.')).toBeVisible();
    expect(mutations.create).not.toHaveBeenCalled();
  });

  it('changes an existing split to one category and explicitly clears splits', async () => {
    render(<TransactionFormDialog open transaction={splitTransaction} tenantSlug="personal" accounts={[account]} categoryOptions={options} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Single category'));
    chooseOption('Category', 'Operating expenses › Staffing');
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    await waitFor(() => expect(mutations.update).toHaveBeenCalledWith('personal', 91, expect.objectContaining({ category_id: 2, splits: [] })));
  });

  it('changes a single category to split mode and clears category_id', async () => {
    render(<TransactionFormDialog open transaction={editableTransaction} tenantSlug="personal" accounts={[account]} categoryOptions={options} onClose={vi.fn()} onSaved={vi.fn()} />);
    enterSplitRows('-100.0000', '-25.4000');
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    await waitFor(() => expect(mutations.update).toHaveBeenCalledWith('personal', 91, expect.objectContaining({
      category_id: null,
      splits: [
        expect.objectContaining({ category_id: 1, amount: '-100.0000' }),
        expect.objectContaining({ category_id: 2, amount: '-25.4000' }),
      ],
    })));
  });

  it('locks imported bank fields and excludes them from PATCH', async () => {
    render(<TransactionFormDialog open transaction={transaction} tenantSlug="clinic" accounts={[account]} categoryOptions={options} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: /Account/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByLabelText(/Amount/)).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Updated supplies' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    await waitFor(() => expect(mutations.update).toHaveBeenCalled());
    const sent = mutations.update.mock.calls[0]?.[2];
    expect(sent).toMatchObject({ description: 'Updated supplies', category_id: 2, splits: [] });
    expect(sent).not.toHaveProperty('account_id'); expect(sent).not.toHaveProperty('amount'); expect(sent).not.toHaveProperty('status'); expect(sent).not.toHaveProperty('transaction_date');
    expect(screen.queryByRole('button', { name: 'Delete transaction' })).not.toBeInTheDocument();
  });

  it('blocks an unsafe dirty close', () => {
    (window.confirm as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const close = vi.fn();
    render(<TransactionFormDialog open transaction={null} tenantSlug="personal" accounts={[account]} categoryOptions={options} onClose={close} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(window.confirm).toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
  });

  it('keeps the draft and maps Laravel 422 field errors', async () => {
    mutations.create.mockRejectedValue(new ApiError(422, 'Please review the highlighted fields.', { description: ['The description has already been used.'] }));
    render(<TransactionFormDialog open transaction={null} tenantSlug="personal" accounts={[account]} categoryOptions={options} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '25.0000' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Kept draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    expect(await screen.findByText('The description has already been used.')).toBeVisible();
    expect(screen.getByDisplayValue('Kept draft')).toBeVisible();
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('keeps a transaction-level 422 visible in the open dialog', async () => {
    mutations.update.mockRejectedValue(new ApiError(422, 'This transaction can no longer be changed.', { transaction: ['The transaction state changed.'] }));
    render(<TransactionFormDialog open transaction={editableTransaction} tenantSlug="personal" accounts={[account]} categoryOptions={options} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Still open' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    expect(await screen.findByText('This transaction can no longer be changed.')).toBeVisible();
    expect(screen.getByDisplayValue('Still open')).toBeVisible();
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('keeps a split 422 visible in the open dialog', async () => {
    mutations.create.mockRejectedValue(new ApiError(422, 'Please review the split amounts.', { splits: ['The split total must equal the transaction amount.'] }));
    render(<TransactionFormDialog open transaction={null} tenantSlug="personal" accounts={[account]} categoryOptions={options} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Amount/), { target: { value: '10.0000' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'Backend rejected split' } });
    enterSplitRows('4.0000', '6.0000');
    fireEvent.click(screen.getByRole('button', { name: 'Save transaction' }));
    expect(await screen.findByText('The split total must equal the transaction amount.')).toBeVisible();
    expect(screen.getByText('Please review the split amounts.')).toBeVisible();
    expect(screen.getByDisplayValue('Backend rejected split')).toBeVisible();
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('shows exact split remaining values and nested Laravel errors', () => {
    render(<SplitEditor amount="10.0000" rows={[{ category_id: 2, amount: '4.9999', description: null }, { category_id: '', amount: '5.0000', description: null }]} options={options} errors={{ 'splits.1.category_id': ['Choose a category for this split.'], splits: ['The split total is invalid.'] }} onChange={vi.fn()} />);
    expect(screen.getByText('Remaining amount: 0.0001')).toBeVisible();
    expect(screen.getByText('Choose a category for this split.')).toBeVisible();
    expect(screen.getByText('The split total is invalid.')).toBeVisible();
  });

  it('shows Delete only for deletable transactions and refreshes after confirmation', async () => {
    const saved = vi.fn();
    render(<TransactionFormDialog open transaction={editableTransaction} tenantSlug="personal" accounts={[account]} categoryOptions={options} onClose={vi.fn()} onSaved={saved} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete transaction' }));
    await waitFor(() => expect(mutations.remove).toHaveBeenCalledWith('personal', 91));
    expect(saved).toHaveBeenCalledWith('Transaction deleted.');
  });
});
