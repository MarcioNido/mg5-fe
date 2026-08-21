import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  slug: 'personal' as string | null,
  accountsError: null as string | null,
  accountsRetry: vi.fn(),
  listImports: vi.fn(),
  getImport: vi.fn(),
}));

vi.mock('@/features/tenants/tenant-context', () => ({ useTenant: () => ({ selectedSlug: mocks.slug }) }));
vi.mock('@/features/accounts/use-accounts', () => ({ useAccounts: () => ({ accounts: mocks.accountsError ? [] : [{ id: 4, name: 'Account' }], loading: false, error: mocks.accountsError, retry: mocks.accountsRetry }) }));
vi.mock('@/features/imports/service', () => ({ listImports: mocks.listImports, getImport: mocks.getImport }));
vi.mock('@/features/imports/upload-form', () => ({
  UploadForm: ({ accountsError, onAccountsRetry, onUploaded }: { accountsError: string | null; onAccountsRetry: () => void; onUploaded: (item: typeof pending, duplicate: boolean) => void }) => <div>{accountsError && <><span>{accountsError}</span><button onClick={onAccountsRetry}>Retry accounts</button></>}<button onClick={() => onUploaded(pending, false)}>New upload</button><button onClick={() => onUploaded(pending, true)}>Duplicate upload</button></div>,
}));
vi.mock('@/features/imports/import-history', () => ({
  ImportHistory: ({ items, onSelect }: { items: Array<{ id: number }>; onSelect: (id: number) => void }) => <button disabled={!items[0]} onClick={() => onSelect(items[0]!.id)}>View import</button>,
}));
vi.mock('@/features/imports/import-detail', () => ({
  ImportDetail: ({ detail, error }: { detail: { status: string } | null; error: string | null }) => <div>{detail?.status ?? 'No detail'}{error && <span>{error}</span>}</div>,
}));

import { ImportsView } from '@/features/imports/imports-view';

const pending = { id: 9, account_id: 4, account: { id: 4, name: 'Account', type: 'chequing', currency: 'CAD' }, original_filename: 'statement.csv', source_name: 'RBC', source_type: 'csv', status: 'pending' as const, total_rows: 0, processed_rows: 0, failed_rows: 0, error_message: null, created_at: '2026-08-20T00:00:00Z', updated_at: '2026-08-20T00:00:00Z' };
const complete = { ...pending, status: 'complete' as const, total_rows: 1, processed_rows: 1, rows: [] };
const historyResponse = { data: [pending], meta: { current_page: 1, last_page: 1, per_page: 15, total: 1, from: 1, to: 1 } };

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

describe('import polling and tenant boundaries', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.slug = 'personal';
    mocks.accountsError = null;
    mocks.listImports.mockResolvedValue(historyResponse);
    mocks.getImport.mockResolvedValue({ data: { ...pending, rows: [] } });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });

  afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

  it('shows distinct messages for new and duplicate uploads', async () => {
    render(<ImportsView />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'New upload' }));
    expect(screen.getByText('Statement uploaded successfully.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate upload' }));
    expect(screen.getByText('This statement was already imported for this account. The existing import is shown below.')).toBeVisible();
  });

  it('passes the account loading error and Retry through ImportsView', async () => {
    mocks.accountsError = 'Unable to load accounts.';
    render(<ImportsView />);
    await flush();
    expect(screen.getByText('Unable to load accounts.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry accounts' }));
    expect(mocks.accountsRetry).toHaveBeenCalledOnce();
  });

  it('polls pending imports and stops after a terminal response', async () => {
    mocks.getImport.mockResolvedValueOnce({ data: { ...pending, rows: [] } }).mockResolvedValueOnce({ data: complete });
    render(<ImportsView />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'View import' }));
    await flush();
    expect(mocks.getImport).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.getImport).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
    expect(mocks.getImport).toHaveBeenCalledTimes(2);
    expect(mocks.listImports.mock.calls.length).toBeGreaterThan(1);
  });

  it('clears detail and stops the old timer when the tenant changes', async () => {
    const { rerender } = render(<ImportsView />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'View import' }));
    await flush();
    expect(mocks.getImport).toHaveBeenCalledTimes(1);
    mocks.slug = 'clinic';
    rerender(<ImportsView />);
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(mocks.getImport).toHaveBeenCalledTimes(1);
    expect(screen.getByText('No detail')).toBeVisible();
  });

  it('silences AbortError instead of showing it to the user', async () => {
    mocks.getImport.mockRejectedValue(new DOMException('switched', 'AbortError'));
    render(<ImportsView />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'View import' }));
    await flush();
    expect(screen.queryByText(/Unable to load this import/)).not.toBeInTheDocument();
    expect(screen.queryByText('switched')).not.toBeInTheDocument();
  });
});
