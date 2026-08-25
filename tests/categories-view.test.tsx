import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/error';

const mocks = vi.hoisted(() => ({
  slug: 'personal' as string | null,
  state: { categories: [] as Array<Record<string, unknown>>, loading: false, error: null as string | null },
  create: vi.fn(), update: vi.fn(), remove: vi.fn(), retry: vi.fn(), refresh: vi.fn(),
}));
vi.mock('@/features/tenants/tenant-context', () => ({ useTenant: () => ({ selectedSlug: mocks.slug }) }));
vi.mock('@/features/categories/use-categories', () => ({ useCategories: () => ({ ...mocks.state, retry: mocks.retry, refresh: mocks.refresh }) }));
vi.mock('@/features/categories/service', () => ({ createCategory: mocks.create, updateCategory: mocks.update, deleteCategory: mocks.remove }));

import { CategoriesView } from '@/features/categories/categories-view';

const root = { id: 1, name: 'Staffing', type: 'expense', level: 1, parent: null };
const child = { id: 2, name: 'Salaries', type: 'income', level: 2, parent: { id: 1, name: 'Staffing', type: 'expense', level: 1 } };
const detail = { id: 3, name: 'Bonuses', type: 'expense', level: 3, parent: { id: 2, name: 'Salaries', type: 'income', level: 2 } };
const otherRoot = { id: 4, name: 'Administration', type: 'expense', level: 1, parent: null };
const otherChild = { id: 5, name: 'Office', type: 'expense', level: 2, parent: { id: 4, name: 'Administration', type: 'expense', level: 1 } };
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }

function openSelect(label: string) { fireEvent.mouseDown(screen.getByLabelText(label)); }

describe('categories view', () => {
  beforeEach(() => { mocks.slug = 'personal'; mocks.state = { categories: [], loading: false, error: null }; mocks.create.mockResolvedValue({}); mocks.update.mockResolvedValue({}); mocks.remove.mockResolvedValue(undefined); });
  afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

  it('shows no-tenant, loading, retryable error, and empty states', () => {
    mocks.slug = null; const view = render(<CategoriesView />); expect(screen.getByText(/Choose Personal or Clinic/)).toBeVisible();
    mocks.slug = 'personal'; mocks.state = { categories: [], loading: true, error: null }; view.rerender(<CategoriesView />); expect(screen.getByLabelText('Loading categories')).toBeVisible();
    mocks.state = { categories: [], loading: false, error: 'Category failure' }; view.rerender(<CategoriesView />); expect(screen.getByText('Category failure')).toBeVisible(); fireEvent.click(screen.getByRole('button', { name: 'Retry' })); expect(mocks.retry).toHaveBeenCalled();
    mocks.state = { categories: [], loading: false, error: null }; view.rerender(<CategoriesView />); expect(screen.getByText('No categories yet')).toBeVisible();
  });

  it('renders one hierarchy with textual type labels and accessible actions', () => {
    mocks.state = { categories: [child, root], loading: false, error: null }; render(<CategoriesView />);
    expect(screen.getByText('Staffing › Salaries')).toBeVisible(); expect(screen.getByText('Income')).toBeVisible(); expect(screen.getByRole('button', { name: 'Edit Salaries' })).toBeVisible(); expect(screen.getByRole('button', { name: 'Delete Salaries' })).toBeVisible();
  });

  it('creates with a trimmed flat parent_id payload and refreshes once', async () => {
    render(<CategoriesView />); fireEvent.click(screen.getAllByRole('button', { name: 'Add category' })[0]!); fireEvent.change(screen.getByLabelText(/Name/), { target: { value: '  Travel  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save category' })); await flush();
    expect(mocks.create).toHaveBeenCalledWith('personal', { name: 'Travel', type: 'expense', parent_id: null }); expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('edits with a flat parent_id payload and displays client and Laravel field errors', async () => {
    mocks.state = { categories: [root, child], loading: false, error: null }; render(<CategoriesView />); fireEvent.click(screen.getByRole('button', { name: 'Edit Salaries' })); fireEvent.change(screen.getByLabelText(/Name/), { target: { value: '  Wages  ' } }); fireEvent.click(screen.getByRole('button', { name: 'Save category' })); await flush();
    expect(mocks.update).toHaveBeenCalledWith('personal', 2, { name: 'Wages', type: 'income', parent_id: 1 });
    cleanup(); mocks.update.mockRejectedValue(new ApiError(422, 'invalid', { name: ['That name is already used.'] })); render(<CategoriesView />); fireEvent.click(screen.getByRole('button', { name: 'Edit Salaries' })); fireEvent.change(screen.getByLabelText(/Name/), { target: { value: '' } }); fireEvent.click(screen.getByRole('button', { name: 'Save category' })); expect(screen.getByText('Name is required.')).toBeVisible(); fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Duplicate' } }); fireEvent.click(screen.getByRole('button', { name: 'Save category' })); await flush(); expect(screen.getByText('That name is already used.')).toBeVisible();
  });

  it('protects a dirty close and synchronous duplicate submission', async () => {
    let resolve!: (value: unknown) => void; mocks.create.mockReturnValue(new Promise((done) => { resolve = done; })); vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<CategoriesView />); fireEvent.click(screen.getAllByRole('button', { name: 'Add category' })[0]!); fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Travel' } }); fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(screen.getByRole('dialog')).toBeVisible();
    const save = screen.getByRole('button', { name: 'Save category' }); fireEvent.click(save); fireEvent.click(save); expect(mocks.create).toHaveBeenCalledTimes(1); await act(async () => resolve({}));
  });

  it('keeps and displays a Laravel deletion blocker', async () => {
    mocks.state = { categories: [root], loading: false, error: null }; mocks.remove.mockRejectedValue(new ApiError(422, 'blocked', { category: ['Delete child categories first.'] })); render(<CategoriesView />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Staffing' })); fireEvent.click(screen.getByRole('button', { name: 'Delete category' })); await flush(); expect(screen.getByText('Delete child categories first.')).toBeVisible(); expect(screen.getByRole('dialog')).toBeVisible();
  });

  it('closes a successful deletion, refreshes, and shows restrained success feedback', async () => {
    mocks.state = { categories: [root], loading: false, error: null }; render(<CategoriesView />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Staffing' })); fireEvent.click(screen.getByRole('button', { name: 'Delete category' })); await flush();
    expect(mocks.remove).toHaveBeenCalledWith('personal', 1); expect(mocks.refresh).toHaveBeenCalledTimes(1); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()); expect(screen.getByText('Category deleted.')).toBeVisible();
  });

  it('supports deleting an unused tree bottom-up', async () => {
    mocks.state = { categories: [root, child], loading: false, error: null }; const view = render(<CategoriesView />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete Salaries' })); fireEvent.click(screen.getByRole('button', { name: 'Delete category' })); await flush(); await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    mocks.state = { categories: [root], loading: false, error: null }; view.rerender(<CategoriesView />); fireEvent.click(screen.getByRole('button', { name: 'Delete Staffing' })); fireEvent.click(screen.getByRole('button', { name: 'Delete category' })); await flush();
    expect(mocks.remove.mock.calls).toEqual([['personal', 2], ['personal', 1]]); expect(mocks.refresh).toHaveBeenCalledTimes(2);
  });

  it('shows only valid parent candidates in the actual edit form', () => {
    mocks.state = { categories: [root, child, detail, otherRoot, otherChild], loading: false, error: null }; render(<CategoriesView />); fireEvent.click(screen.getByRole('button', { name: 'Edit Salaries' })); openSelect('Parent category');
    expect(screen.getByRole('option', { name: 'No parent (top level)' })).toBeVisible(); expect(screen.getByRole('option', { name: 'Staffing' })).toBeVisible(); expect(screen.getByRole('option', { name: 'Administration' })).toBeVisible();
    expect(screen.queryByRole('option', { name: /Salaries/ })).not.toBeInTheDocument(); expect(screen.queryByRole('option', { name: /Bonuses/ })).not.toBeInTheDocument(); expect(screen.queryByRole('option', { name: /Office/ })).not.toBeInTheDocument();
  });

  it('submits a changed flat parent_id and associates Laravel parent errors with the selector', async () => {
    mocks.state = { categories: [root, child, otherRoot], loading: false, error: null }; render(<CategoriesView />); fireEvent.click(screen.getByRole('button', { name: 'Edit Salaries' })); openSelect('Parent category'); fireEvent.click(screen.getByRole('option', { name: 'Administration' })); fireEvent.click(screen.getByRole('button', { name: 'Save category' })); await flush();
    expect(mocks.update).toHaveBeenCalledWith('personal', 2, { name: 'Salaries', type: 'income', parent_id: 4 });
    cleanup(); mocks.update.mockRejectedValue(new ApiError(422, 'invalid', { parent_id: ['The selected parent would make this category too deep.'] })); render(<CategoriesView />); fireEvent.click(screen.getByRole('button', { name: 'Edit Salaries' })); fireEvent.click(screen.getByRole('button', { name: 'Save category' })); await flush();
    expect(screen.getByText('The selected parent would make this category too deep.')).toBeVisible(); expect(screen.getByLabelText('Parent category')).toHaveAccessibleDescription('The selected parent would make this category too deep.');
  });

  it.each([
    ['success', null],
    ['error', new ApiError(422, 'Old tenant error', { name: ['Old tenant name error.'] })],
  ])('does not leak pending category mutation %s feedback across tenants', async (_case, mutationError) => {
    let settle!: () => void; const pending = new Promise((resolve, reject) => { settle = () => mutationError ? reject(mutationError) : resolve({}); }); if (mutationError) void pending.catch(() => undefined); mocks.create.mockReturnValue(pending); const view = render(<CategoriesView />); fireEvent.click(screen.getAllByRole('button', { name: 'Add category' })[0]!); fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Old tenant draft' } }); fireEvent.click(screen.getByRole('button', { name: 'Save category' }));
    mocks.slug = 'clinic'; mocks.state = { categories: [], loading: false, error: null }; view.rerender(<CategoriesView />); await act(async () => { settle(); await Promise.resolve(); await Promise.resolve(); });
    expect(screen.queryByText('Category added.')).not.toBeInTheDocument(); expect(screen.queryByText('Old tenant error')).not.toBeInTheDocument(); expect(screen.queryByText('Old tenant name error.')).not.toBeInTheDocument();
  });

  it('remounts dialogs and old state on tenant switch', () => {
    mocks.state = { categories: [root], loading: false, error: null }; const view = render(<CategoriesView />); fireEvent.click(screen.getByRole('button', { name: 'Edit Staffing' })); expect(screen.getByRole('dialog')).toBeVisible();
    mocks.slug = 'clinic'; mocks.state = { categories: [], loading: false, error: null }; view.rerender(<CategoriesView />); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.queryByText('Staffing')).not.toBeInTheDocument();
  });
});
