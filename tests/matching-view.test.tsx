import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MatchReview } from '@/features/matching/types';
import { ApiError } from '@/lib/api/error';

const mocks = vi.hoisted(() => ({
  slug: 'personal' as string | null,
  list: vi.fn(),
  confirm: vi.fn(),
  reject: vi.fn(),
  accountsError: null as string | null,
  retryAccounts: vi.fn(),
}));

vi.mock('@/features/tenants/tenant-context', () => ({ useTenant: () => ({ selectedSlug: mocks.slug }) }));
vi.mock('@/features/accounts/use-accounts', () => ({ useAccounts: () => ({ accounts: [{ id: 17, name: 'Clinic Chequing', type: 'chequing', currency: 'CAD' }], loading: false, error: mocks.accountsError, retry: mocks.retryAccounts }) }));
vi.mock('@/features/matching/service', () => ({ listMatchReviews: mocks.list, confirmMatchSuggestion: mocks.confirm, rejectMatchSuggestion: mocks.reject }));

import { MatchingView } from '@/features/matching/matching-view';

const category = { id: 2, name: 'Supplies', type: 'expense', level: 1, parent: { id: 1, name: 'Operations', type: 'expense', level: 0 } };
const review: MatchReview = {
  id: 81,
  account: { id: 17, name: 'Clinic Chequing', type: 'chequing', currency: 'CAD' },
  import: { id: 24, original_filename: null, source_name: 'RBC', created_at: '2026-08-24T14:12:00Z' },
  line_number: 14,
  imported_transaction: { id: 91, transaction_date: '2026-08-20', amount: '-125.4000', description: 'MEDICAL SUPPLIES', notes: null, status: 'posted', origin: 'csv', category: null, splits: [] },
  candidates: [
    { suggestion_id: 33, confidence: '0.9250', transaction: { id: 72, transaction_date: '2026-08-19', amount: '-125.4000', description: 'Equipment supplies', notes: 'Keep receipt', status: 'pending', origin: 'manual', category, splits: [] } },
    { suggestion_id: 34, confidence: '0.8000', transaction: { id: 73, transaction_date: '2026-08-18', amount: '25.5000', description: 'Second candidate', notes: null, status: 'pending', origin: 'manual', category: null, splits: [{ id: 9, category_id: 2, amount: '25.5000', description: 'Part', category }] } },
  ],
};
const meta = { current_page: 1, from: 1, last_page: 2, links: [], path: '', per_page: 10, to: 1, total: 11 };
const response = { data: [review], links: { first: null, last: null, prev: null, next: null }, meta };
const secondReview: MatchReview = {
  ...review,
  id: 82,
  imported_transaction: { ...review.imported_transaction, id: 191, description: 'OTHER IMPORT' },
  candidates: [{ ...review.candidates[0]!, suggestion_id: 133, transaction: { ...review.candidates[0]!.transaction, id: 172, description: 'Other review candidate' } }],
};

async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }

describe('matching review view', () => {
  beforeEach(() => {
    mocks.slug = 'personal'; mocks.accountsError = null;
    mocks.list.mockResolvedValue(response);
    mocks.confirm.mockResolvedValue({ data: { review_id: 81, suggestion_id: 33, resolution: 'matched', transaction: {} } });
    mocks.reject.mockResolvedValue({ data: { review_id: 81, suggestion_id: 33, resolution: 'candidate_rejected', remaining_candidates: 1 } });
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('renders one grouped review card without reordering candidates and shows exact comparison details', async () => {
    render(<MatchingView />);
    await screen.findByText('MEDICAL SUPPLIES');
    expect(screen.getByText('11 total')).toBeVisible();
    expect(screen.getByText(/RBC · Imported CSV · CSV line 14/)).toBeVisible();
    const candidates = screen.getAllByText(/Existing manual pending transaction/);
    expect(candidates[0]).toHaveTextContent('1'); expect(candidates[1]).toHaveTextContent('2');
    expect(screen.getByText('Equipment supplies')).toBeVisible();
    expect(screen.getByText('Second candidate')).toBeVisible();
    expect(screen.getByText('Operations › Supplies')).toBeVisible();
    expect(screen.getByRole('list', { name: 'Transaction splits' })).toHaveTextContent('25.50');
    expect(screen.getByText(/92.5% confidence/)).toBeVisible();
    expect(screen.getByLabelText('Matching review pages')).toBeVisible();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('shows initial loading immediately and never flashes the empty state', async () => {
    let resolve!: (value: typeof response) => void;
    mocks.list.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    render(<MatchingView />);
    expect(screen.getByLabelText('Loading matching reviews')).toBeVisible();
    expect(screen.queryByText('No matching reviews')).not.toBeInTheDocument();
    await flush();
    expect(screen.getByLabelText('Loading matching reviews')).toBeVisible();
    expect(screen.queryByText('No matching reviews')).not.toBeInTheDocument();
    await act(async () => resolve(response));
  });

  it('shows loading rather than a false empty state while an initial-request Retry is pending', async () => {
    let resolveRetry!: (value: typeof response) => void;
    mocks.list.mockRejectedValueOnce(new Error('network')).mockReturnValueOnce(new Promise((done) => { resolveRetry = done; }));
    render(<MatchingView />);
    await screen.findByText('Unable to load matching reviews.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByLabelText('Loading matching reviews')).toBeVisible();
    expect(screen.queryByText('No matching reviews')).not.toBeInTheDocument();
    await flush();
    expect(screen.getByLabelText('Loading matching reviews')).toBeVisible();
    expect(screen.queryByText('No matching reviews')).not.toBeInTheDocument();
    await act(async () => resolveRetry({ ...response, data: [], meta: { ...meta, last_page: 1, total: 0 } }));
    expect(screen.getByText('No matching reviews')).toBeVisible();
  });

  it('keeps existing cards visible with accessible progress during background revalidation', async () => {
    let resolveRefresh!: (value: typeof response) => void;
    mocks.list.mockResolvedValueOnce(response).mockReturnValueOnce(new Promise((done) => { resolveRefresh = done; }));
    render(<MatchingView />); await screen.findByText('Equipment supplies');
    fireEvent.click(screen.getByRole('button', { name: 'Reject candidate Equipment supplies' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reject candidate' }));
    const refreshMessage = await screen.findByText('Refreshing matching reviews…');
    expect(refreshMessage.closest('[role="status"]')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('MEDICAL SUPPLIES')).toBeVisible();
    expect(screen.getByText('Second candidate')).toBeVisible();
    expect(screen.queryByLabelText('Loading matching reviews')).not.toBeInTheDocument();
    expect(screen.queryByText('No matching reviews')).not.toBeInTheDocument();
    await act(async () => resolveRefresh(response));
  });

  it('shows loading, retryable error, tenant prompt, and distinct empty states', async () => {
    let resolve!: (value: typeof response) => void;
    mocks.list.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const { rerender } = render(<MatchingView />); await flush();
    expect(screen.getByLabelText('Loading matching reviews')).toBeVisible();
    await act(async () => resolve({ ...response, data: [], meta: { ...meta, last_page: 1, total: 0 } }));
    expect(screen.getByText('No matching reviews')).toBeVisible();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Account filter' })); fireEvent.click(screen.getByRole('option', { name: 'Clinic Chequing' })); fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(screen.getByText('No matching reviews for this account')).toBeVisible());
    mocks.slug = null; rerender(<MatchingView />);
    expect(screen.getByText('Choose Personal or Clinic to review possible matches.')).toBeVisible();
  });

  it('keeps review loading available when accounts fail and supports Retry', async () => {
    mocks.accountsError = 'Unable to load accounts.'; render(<MatchingView />);
    await screen.findByText('MEDICAL SUPPLIES');
    expect(screen.getByText(/Matching reviews can still be loaded/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' })); expect(mocks.retryAccounts).toHaveBeenCalled();
  });

  it('applies and clears the account filter at page one', async () => {
    render(<MatchingView />); await screen.findByText('MEDICAL SUPPLIES');
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' })); await flush();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Account filter' })); fireEvent.click(screen.getByRole('option', { name: 'Clinic Chequing' })); fireEvent.click(screen.getByRole('button', { name: 'Apply' })); await flush();
    expect(mocks.list).toHaveBeenLastCalledWith('personal', { page: 1, perPage: 10, accountId: '17' }, expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' })); await flush();
    expect(mocks.list).toHaveBeenLastCalledWith('personal', { page: 1, perPage: 10, accountId: '' }, expect.any(AbortSignal));
  });

  it('requires a confirm dialog and disables duplicate review actions while saving', async () => {
    let resolve!: (value: unknown) => void; let refresh!: (value: typeof response) => void;
    mocks.list.mockResolvedValueOnce(response).mockReturnValueOnce(new Promise((done) => { refresh = done; }));
    mocks.confirm.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<MatchingView />); await screen.findByText('MEDICAL SUPPLIES');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm match for Equipment supplies' }));
    expect(mocks.confirm).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/manual description, notes, category, and splits are preserved/)).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm match' }));
    expect(mocks.confirm).toHaveBeenCalledWith('personal', 33);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject candidate Equipment supplies' })).toBeDisabled();
    await act(async () => resolve({ data: { resolution: 'matched' } }));
    expect(screen.queryByText('MEDICAL SUPPLIES')).not.toBeInTheDocument();
    await act(async () => refresh({ ...response, data: [], meta: { ...meta, last_page: 1, total: 0 } }));
  });

  it('requires a reject dialog and removes only a partially rejected candidate', async () => {
    let refresh!: (value: typeof response) => void;
    mocks.list.mockResolvedValueOnce(response).mockReturnValueOnce(new Promise((done) => { refresh = done; }));
    render(<MatchingView />); await screen.findByText('Equipment supplies');
    fireEvent.click(screen.getByRole('button', { name: 'Reject candidate Equipment supplies' }));
    expect(mocks.reject).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog'); expect(within(dialog).getByText(/Only this candidate will be rejected/)).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject candidate' })); await flush();
    expect(screen.queryByText('Equipment supplies')).not.toBeInTheDocument();
    expect(screen.getByText('Second candidate')).toBeVisible();
    await act(async () => refresh(response));
  });

  it('prevents another review from replacing a pending mutation flow', async () => {
    let rejectFirst!: (reason: unknown) => void;
    mocks.list.mockResolvedValueOnce({ ...response, data: [review, secondReview] });
    mocks.confirm.mockReturnValueOnce(new Promise((_, rejectPromise) => { rejectFirst = rejectPromise; }));
    render(<MatchingView />); await screen.findByText('Other review candidate');

    fireEvent.click(screen.getByRole('button', { name: 'Confirm match for Equipment supplies' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm match' }));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const otherAction = screen.getByRole('button', { name: 'Reject candidate Other review candidate' });
    expect(otherAction).toBeDisabled();
    fireEvent.click(otherAction);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.reject).not.toHaveBeenCalled();
    expect(mocks.confirm).toHaveBeenCalledTimes(1);

    await act(async () => rejectFirst(new ApiError(500, 'First request failed.')));
    const failedDialog = await screen.findByRole('dialog');
    expect(within(failedDialog).getByText(/Equipment supplies/)).toBeVisible();
    expect(within(failedDialog).queryByText(/Other review candidate/)).not.toBeInTheDocument();
    fireEvent.click(within(failedDialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Reject candidate Other review candidate' })).toBeEnabled();
  });

  it('handles final rejection, stale 422, and visible mutation failures', async () => {
    let refreshFinal!: (value: typeof response) => void;
    mocks.list.mockResolvedValueOnce(response).mockReturnValueOnce(new Promise((done) => { refreshFinal = done; }));
    mocks.reject.mockResolvedValueOnce({ data: { review_id: 81, suggestion_id: 33, resolution: 'imported_transaction_kept', remaining_candidates: 0 } });
    render(<MatchingView />); await screen.findByText('Equipment supplies');
    fireEvent.click(screen.getByRole('button', { name: 'Reject candidate Equipment supplies' })); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reject candidate' }));
    await screen.findByText(/imported bank transaction was kept as definitive/);
    expect(screen.queryByText('MEDICAL SUPPLIES')).not.toBeInTheDocument();
    await act(async () => refreshFinal({ ...response, data: [], meta: { ...meta, last_page: 1, total: 0 } }));
    cleanup(); vi.clearAllMocks(); mocks.list.mockResolvedValue(response); mocks.confirm.mockRejectedValueOnce(new ApiError(422, 'Stale'));
    render(<MatchingView />); await screen.findByText('Equipment supplies');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm match for Equipment supplies' })); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm match' }));
    await screen.findByText('This review changed and has been reloaded.'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    cleanup(); vi.clearAllMocks(); mocks.list.mockResolvedValue(response); mocks.confirm.mockRejectedValueOnce(new ApiError(500, 'Server unavailable.'));
    render(<MatchingView />); await screen.findByText('Equipment supplies'); fireEvent.click(screen.getByRole('button', { name: 'Confirm match for Equipment supplies' })); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm match' }));
    expect(await within(await screen.findByRole('dialog')).findByText('Server unavailable.')).toBeVisible();
  });

  it('remounts on tenant change and rejects late old-tenant data', async () => {
    let resolveOld!: (value: typeof response) => void;
    mocks.list.mockReturnValueOnce(new Promise((done) => { resolveOld = done; })).mockResolvedValue({ ...response, data: [] });
    const { rerender } = render(<MatchingView />); await flush();
    mocks.slug = 'clinic'; rerender(<MatchingView />); await flush();
    await act(async () => resolveOld(response));
    expect(screen.queryByText('MEDICAL SUPPLIES')).not.toBeInTheDocument();
    expect(mocks.list).toHaveBeenLastCalledWith('clinic', { page: 1, perPage: 10, accountId: '' }, expect.any(AbortSignal));
  });
});
