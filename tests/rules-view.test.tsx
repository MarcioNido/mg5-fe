import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/error';

const mocks = vi.hoisted(() => ({
  slug: 'personal' as string | null, list: vi.fn(), remove: vi.fn(), create: vi.fn(), update: vi.fn(), retryAccounts: vi.fn(), retryCategories: vi.fn(),
  accountState: { accounts: [{ id: 4, name: 'Clinic card', type: 'credit', account_number: 'SECRET-1234', currency: 'CAD', opening_balance: '0', opening_balance_date: null }], loading: false, error: null as string | null },
  categoryState: { categories: [{ id: 1, name: 'Food', type: 'expense', level: 1, parent: null }] as Array<Record<string, unknown>>, loading: false, error: null as string | null },
}));
vi.mock('@/features/tenants/tenant-context', () => ({ useTenant: () => ({ selectedSlug: mocks.slug }) }));
vi.mock('@/features/accounts/use-accounts', () => ({ useAccounts: () => ({ ...mocks.accountState, retry: mocks.retryAccounts }) }));
vi.mock('@/features/categories/use-categories', () => ({ useCategories: () => ({ ...mocks.categoryState, retry: mocks.retryCategories }) }));
vi.mock('@/features/rules/service', () => ({ listRules: mocks.list, deleteRule: mocks.remove, createRule: mocks.create, updateRule: mocks.update }));

import { RulesView } from '@/features/rules/rules-view';

const meta = { current_page: 1, from: 1, last_page: 1, links: [], path: '', per_page: 25, to: 1, total: 1 };
const food = { id: 1, name: 'Food', type: 'expense', level: 1, parent: null };
const groceries = { id: 2, name: 'Groceries', type: 'expense', level: 2, parent: { id: 1, name: 'Food', type: 'expense', level: 1 } };
const globalRule = { id: 7, match_text: 'COSTCO', account: null, category: food, created_at: '2026-08-20T14:00:00Z', updated_at: '2026-08-20T14:00:00Z' };
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
function choose(label: string, option: string) { fireEvent.mouseDown(screen.getByLabelText(label)); fireEvent.click(screen.getByRole('option', { name: option })); }

describe('rules view', () => {
  beforeEach(() => {
    mocks.slug = 'personal'; mocks.accountState = { accounts: [{ id: 4, name: 'Clinic card', type: 'credit', account_number: 'SECRET-1234', currency: 'CAD', opening_balance: '0', opening_balance_date: null }], loading: false, error: null }; mocks.categoryState = { categories: [food], loading: false, error: null };
    mocks.list.mockResolvedValue({ data: [globalRule], links: {}, meta }); mocks.remove.mockResolvedValue(undefined); mocks.create.mockResolvedValue({}); mocks.update.mockResolvedValue({});
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });
  it('renders literal text, global scope and category without account numbers', async () => { render(<RulesView />); await flush(); expect(screen.getAllByText('COSTCO').length).toBeGreaterThan(0); expect(screen.getAllByText('All accounts').length).toBeGreaterThan(0); expect(screen.getAllByText('Food').length).toBeGreaterThan(0); expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument(); fireEvent.mouseDown(screen.getByLabelText('Account')); expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument(); expect(screen.getByText(/first by creation order wins/i)).toBeVisible(); });

  it('covers no-tenant, initial loading, retryable list error, and true empty states', async () => {
    mocks.slug = null; const view = render(<RulesView />); expect(screen.getByText(/Choose Personal or Clinic/)).toBeVisible(); expect(mocks.list).not.toHaveBeenCalled();
    mocks.slug = 'personal'; let resolve!: (value: unknown) => void; mocks.list.mockReturnValue(new Promise((done) => { resolve = done; })); view.rerender(<RulesView />); await flush(); expect(screen.getByLabelText('Loading automatic rules')).toBeVisible(); await act(async () => resolve({ data: [], links: {}, meta: { ...meta, from: null, to: null, total: 0 } })); expect(screen.getByText('No automatic rules yet')).toBeVisible();
    cleanup(); mocks.list.mockRejectedValue(new Error('network')); render(<RulesView />); await flush(); expect(screen.getByText('Unable to load automatic rules.')).toBeVisible(); fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await flush(); expect(mocks.list.mock.calls.length).toBeGreaterThan(1);
  });

  it('shows account and category loading/error behavior with independent retry', async () => {
    mocks.accountState = { accounts: [], loading: true, error: null }; mocks.categoryState = { categories: [], loading: true, error: null }; const view = render(<RulesView />); await flush(); expect(screen.getByLabelText('Account')).toHaveAttribute('aria-disabled', 'true'); expect(screen.getByLabelText('Category')).toHaveAttribute('aria-disabled', 'true'); expect(screen.getByRole('button', { name: 'Add rule' })).toBeDisabled();
    mocks.accountState = { accounts: [], loading: false, error: 'Accounts failed.' }; mocks.categoryState = { categories: [], loading: false, error: 'Categories failed.' }; view.rerender(<RulesView />); expect(screen.getByText('Accounts failed.')).toBeVisible(); expect(screen.getByText('Categories failed.')).toBeVisible(); fireEvent.click(screen.getByRole('button', { name: 'Retry accounts' })); fireEvent.click(screen.getByRole('button', { name: 'Retry categories' })); expect(mocks.retryAccounts).toHaveBeenCalledOnce(); expect(mocks.retryCategories).toHaveBeenCalledOnce();
  });

  it('renders nested category paths in the rule list and form selector', async () => {
    mocks.categoryState = { categories: [food, groceries], loading: false, error: null }; mocks.list.mockResolvedValue({ data: [{ ...globalRule, category: groceries }], links: {}, meta }); render(<RulesView />); await flush(); expect(screen.getAllByText('Food › Groceries').length).toBeGreaterThan(0); fireEvent.click(screen.getByRole('button', { name: 'Add rule' })); const dialog = within(screen.getByRole('dialog')); fireEvent.mouseDown(dialog.getByLabelText(/Category/)); expect(screen.getByRole('option', { name: 'Food › Groceries' })).toBeVisible();
  });
  it('applies and clears search at page one with a distinct no-results state', async () => {
    mocks.list.mockImplementation((_slug, filters) => Promise.resolve({ data: filters.search ? [] : [globalRule], links: {}, meta: { ...meta, total: filters.search ? 0 : 1 } })); render(<RulesView />); await flush(); fireEvent.change(screen.getByLabelText('Search'), { target: { value: ' missing ' } }); fireEvent.click(screen.getByRole('button', { name: 'Apply filters' })); await flush(); expect(mocks.list).toHaveBeenLastCalledWith('personal', expect.objectContaining({ page: 1, search: 'missing' }), expect.any(AbortSignal)); expect(screen.getByText('No rules match these filters')).toBeVisible(); fireEvent.click(screen.getAllByRole('button', { name: /Clear/ })[0]!); await flush(); expect(mocks.list).toHaveBeenLastCalledWith('personal', expect.objectContaining({ page: 1, search: '' }), expect.any(AbortSignal));
  });
  it('applies account/category filters and Clear resets every filter and page', async () => {
    mocks.categoryState = { categories: [food, groceries], loading: false, error: null }; mocks.list.mockImplementation((_slug, filters) => Promise.resolve({ data: [globalRule], links: {}, meta: { ...meta, current_page: filters.page, last_page: 2, total: 26 } })); render(<RulesView />); await flush();
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'market' } }); choose('Account', 'Clinic card'); choose('Category', 'Food › Groceries'); fireEvent.click(screen.getByRole('button', { name: 'Apply filters' })); await flush();
    expect(mocks.list).toHaveBeenLastCalledWith('personal', expect.objectContaining({ page: 1, search: 'market', accountId: '4', categoryId: '2' }), expect.any(AbortSignal)); fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' })); await flush(); fireEvent.click(screen.getByRole('button', { name: 'Clear' })); await flush(); expect(mocks.list).toHaveBeenLastCalledWith('personal', { page: 1, perPage: 25, search: '', accountId: '', categoryId: '' }, expect.any(AbortSignal)); expect(screen.getByLabelText('Search')).toHaveValue('');
  });
  it('paginates and returns to the prior page after deleting the last row', async () => {
    mocks.list.mockImplementation((_slug, filters) => Promise.resolve({ data: [globalRule], links: {}, meta: { ...meta, current_page: filters.page, last_page: 2, total: 26 } })); render(<RulesView />); await flush(); fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' })); await flush(); expect(mocks.list).toHaveBeenLastCalledWith('personal', expect.objectContaining({ page: 2 }), expect.any(AbortSignal)); fireEvent.click(screen.getAllByRole('button', { name: 'Delete rule COSTCO' })[0]!); expect(screen.getByText(/Categories it assigned in the past will not be removed/)).toBeVisible(); fireEvent.click(screen.getByRole('button', { name: 'Delete rule' })); await flush(); expect(mocks.list).toHaveBeenLastCalledWith('personal', expect.objectContaining({ page: 1 }), expect.any(AbortSignal));
  });
  it('closes successful deletion with historical-no-undo wording and refreshes the current query', async () => {
    render(<RulesView />); await flush(); const callsBefore = mocks.list.mock.calls.length; fireEvent.click(screen.getAllByRole('button', { name: 'Delete rule COSTCO' })[0]!); expect(screen.getByText(/Categories it assigned in the past will not be removed/)).toBeVisible(); fireEvent.click(screen.getByRole('button', { name: 'Delete rule' })); await flush();
    expect(mocks.remove).toHaveBeenCalledWith('personal', 7); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); expect(screen.getByText('Rule deleted. Previously assigned categories were not changed.')).toBeVisible(); expect(mocks.list.mock.calls.length).toBeGreaterThan(callsBefore); expect(mocks.list).toHaveBeenLastCalledWith('personal', { page: 1, perPage: 25, search: '', accountId: '', categoryId: '' }, expect.any(AbortSignal));
  });

  it('keeps a failed deletion and its row visible', async () => {
    mocks.remove.mockRejectedValue(new ApiError(500, 'Rule deletion failed.')); render(<RulesView />); await flush(); fireEvent.click(screen.getAllByRole('button', { name: 'Delete rule COSTCO' })[0]!); fireEvent.click(screen.getByRole('button', { name: 'Delete rule' })); await flush(); expect(screen.getByText('Rule deletion failed.')).toBeVisible(); expect(screen.getAllByText('COSTCO').length).toBeGreaterThan(0); expect(screen.getByRole('dialog')).toBeVisible();
  });
  it('validates and edits with a trimmed public payload and queued wording', async () => {
    render(<RulesView />); await flush(); fireEvent.click(screen.getAllByRole('button', { name: 'Edit rule COSTCO' })[0]!); fireEvent.change(screen.getByLabelText(/Match text/), { target: { value: '  MARKET  ' } }); fireEvent.click(screen.getByRole('button', { name: 'Save rule' })); await flush(); expect(mocks.update).toHaveBeenCalledWith('personal', 7, { match_text: 'MARKET', account_id: null, category_id: 1 }); expect(screen.getByText(/Safe reprocessing was queued in the background/)).toBeVisible();
    cleanup(); render(<RulesView />); await flush(); fireEvent.click(screen.getByRole('button', { name: 'Add rule' })); fireEvent.click(screen.getByRole('button', { name: 'Save rule' })); expect(screen.getByText('Match text is required.')).toBeVisible(); expect(screen.getByText('Category is required.')).toBeVisible();
  });
  it('remounts open UI and rejects late old tenant data', async () => {
    let resolveOld!: (value: unknown) => void; mocks.list.mockImplementationOnce(() => new Promise((done) => { resolveOld = done; })).mockResolvedValue({ data: [], links: {}, meta: { ...meta, total: 0 } }); const view = render(<RulesView />); await flush(); fireEvent.click(screen.getByRole('button', { name: 'Add rule' })); expect(screen.getByRole('dialog')).toBeVisible(); mocks.slug = 'clinic'; view.rerender(<RulesView />); await flush(); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); await act(async () => resolveOld({ data: [globalRule], links: {}, meta })); expect(screen.queryByText('COSTCO')).not.toBeInTheDocument();
  });

  it.each([
    ['create success', 'create', null],
    ['create error', 'create', new ApiError(422, 'Old create error', { match_text: ['Old match error.'] })],
    ['update success', 'update', null],
    ['update error', 'update', new ApiError(422, 'Old update error', { category_id: ['Old category error.'] })],
  ])('does not leak pending %s feedback to a replacement tenant', async (_label, operation, mutationError) => {
    let settle!: () => void; const pending = new Promise((resolve, reject) => { settle = () => mutationError ? reject(mutationError) : resolve({}); }); if (mutationError) void pending.catch(() => undefined); mocks[operation as 'create' | 'update'].mockReturnValue(pending); const view = render(<RulesView />); await flush();
    if (operation === 'update') fireEvent.click(screen.getAllByRole('button', { name: 'Edit rule COSTCO' })[0]!); else { fireEvent.click(screen.getByRole('button', { name: 'Add rule' })); fireEvent.change(screen.getByLabelText(/Match text/), { target: { value: 'Old draft' } }); choose('Category', 'Food'); }
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' })); mocks.slug = 'clinic'; mocks.categoryState = { categories: [food], loading: false, error: null }; view.rerender(<RulesView />); await flush(); await act(async () => { settle(); await Promise.resolve(); await Promise.resolve(); });
    expect(screen.queryByText(/Safe reprocessing was queued/)).not.toBeInTheDocument(); expect(screen.queryByText(/Old (create|update|match|category) error/)).not.toBeInTheDocument();
  });
});
