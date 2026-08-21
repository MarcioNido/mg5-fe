import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ImportDetail } from '@/features/imports/import-detail';
import { ImportHistory } from '@/features/imports/import-history';
import { uploadStatement, listImports } from '@/features/imports/service';
import { ImportStatusChip, RowStatusChip } from '@/features/imports/status-chip';
import { MAX_UPLOAD_BYTES, UploadForm, validateStatementFile } from '@/features/imports/upload-form';
import type { ImportDetail as ImportDetailType, ImportFilters } from '@/features/imports/types';

const account = { id: 4, name: 'RBC Visa', type: 'credit' as const, account_number: null, currency: 'CAD', opening_balance: '0.0000', opening_balance_date: null };
const summary = { id: 9, account_id: 4, account: { id: 4, name: 'RBC Visa', type: 'credit', currency: 'CAD' }, original_filename: null, source_name: 'RBC', source_type: 'csv', status: 'complete' as const, total_rows: 2, processed_rows: 2, failed_rows: 0, error_message: null, created_at: '2026-08-20T16:20:00Z', updated_at: '2026-08-20T16:20:02Z' };
const filters: ImportFilters = { page: 1, perPage: 15, accountId: '', status: '' };

describe('imports', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('uploads account_id and one file through FormData without a manual content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: summary, meta: { duplicate_upload: false } }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['rows'], 'statement.csv', { type: 'text/csv' });
    await uploadStatement('clinic', '4', file);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('account_id')).toBe('4');
    expect((init.body as FormData).get('file')).toBe(file);
    expect((init.headers as Headers).has('Content-Type')).toBe(false);
    expect((init.headers as Headers).get('X-Tenant-Slug')).toBe('clinic');
  });

  it('validates file extensions', () => {
    expect(validateStatementFile(new File(['x'], 'statement.pdf'))).toMatch(/csv or \.txt/);
    expect(validateStatementFile(new File(['x'], 'statement.CSV'))).toBeNull();
  });

  it('validates the 10 MB upload limit', () => {
    const oversized = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], 'large.csv');
    expect(validateStatementFile(oversized)).toBe('The file must not be larger than 10 MB.');
  });

  it('disables upload and links to Accounts when there are no accounts', () => {
    render(<UploadForm tenantSlug="personal" accounts={[]} accountsLoading={false} accountsError={null} onAccountsRetry={vi.fn()} onUploaded={vi.fn()} />);
    expect(screen.getByText(/Create an/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'account first' })).toHaveAttribute('href', '/dashboard/accounts');
    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeDisabled();
  });

  it('reports a new upload to the parent', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: summary, meta: { duplicate_upload: false } }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const uploaded = vi.fn();
    const { container } = render(<UploadForm tenantSlug="personal" accounts={[account]} accountsLoading={false} accountsError={null} onAccountsRetry={vi.fn()} onUploaded={uploaded} />);
    fireEvent.change(container.querySelector('input.MuiSelect-nativeInput')!, { target: { value: '4' } });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['rows'], 'statement.csv')] } });
    expect(screen.getByText('statement.csv')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    await waitFor(() => expect(uploaded).toHaveBeenCalledWith(summary, false));
  });

  it('passes duplicate metadata without inferring it from the filename', async () => {
    const duplicate = { ...summary, original_filename: 'original.csv' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: duplicate, meta: { duplicate_upload: true } }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const uploaded = vi.fn();
    const { container } = render(<UploadForm tenantSlug="personal" accounts={[account]} accountsLoading={false} accountsError={null} onAccountsRetry={vi.fn()} onUploaded={uploaded} />);
    fireEvent.change(container.querySelector('input.MuiSelect-nativeInput')!, { target: { value: '4' } });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(['same'], 'renamed.csv')] } });
    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    await waitFor(() => expect(uploaded).toHaveBeenCalledWith(duplicate, true));
  });

  it('builds paginated and filtered history requests without client reordering', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [], meta: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    await listImports('personal', { page: 3, perPage: 99, accountId: '4', status: 'failed' });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/files?page=3&per_page=50&account_id=4&status=failed');
  });

  it('shows an account loading error with Retry instead of the no-account state', () => {
    const retry = vi.fn();
    render(<UploadForm tenantSlug="personal" accounts={[]} accountsLoading={false} accountsError="Unable to load accounts." onAccountsRetry={retry} onUploaded={vi.fn()} />);
    expect(screen.getByText('Unable to load accounts.')).toBeVisible();
    expect(screen.queryByText(/Create an/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Choose file' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('activates the accessible file control with Enter and Space', () => {
    const inputClick = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    render(<UploadForm tenantSlug="personal" accounts={[account]} accountsLoading={false} accountsError={null} onAccountsRetry={vi.fn()} onUploaded={vi.fn()} />);
    const control = screen.getByRole('button', { name: 'Choose file' });
    control.focus();
    expect(control).toHaveFocus();
    fireEvent.keyDown(control, { key: 'Enter' });
    fireEvent.keyDown(control, { key: ' ' });
    expect(inputClick).toHaveBeenCalledTimes(2);
    expect(control).toHaveAttribute('aria-describedby', 'statement-file-help');
  });

  it('resets page when history filters change', () => {
    const changed = vi.fn();
    const { container } = render(<ImportHistory accounts={[account]} items={[]} meta={null} filters={{ ...filters, page: 4 }} loading={false} error={null} selectedId={null} onFiltersChange={changed} onRetry={vi.fn()} onSelect={vi.fn()} />);
    const selects = container.querySelectorAll('input.MuiSelect-nativeInput');
    fireEvent.change(selects[1]!, { target: { value: 'failed' } });
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ page: 1, status: 'failed' }));
  });

  it('uses Imported CSV when the original filename is absent', () => {
    render(<ImportHistory accounts={[account]} items={[summary]} meta={{ current_page: 1, last_page: 1, per_page: 15, total: 1, from: 1, to: 1 }} filters={filters} loading={false} error={null} selectedId={null} onFiltersChange={vi.fn()} onRetry={vi.fn()} onSelect={vi.fn()} />);
    expect(screen.getByText('Imported CSV')).toBeVisible();
  });

  it('presents every import and row status with text', () => {
    const { rerender } = render(<ImportStatusChip status="processing" />);
    expect(screen.getByText('Processing')).toBeVisible();
    rerender(<ImportStatusChip status="complete_with_errors" />);
    expect(screen.getByText('Completed with errors')).toBeVisible();
    rerender(<RowStatusChip status="needs_review" />);
    expect(screen.getByText('Needs matching review')).toBeVisible();
  });

  it('renders only the safe row detail fields and preserves signed amounts', () => {
    const detail: ImportDetailType = { ...summary, status: 'complete_with_errors', failed_rows: 1, rows: [{ id: 1, line_number: 2, transaction_date: '2026-08-18', description: 'UTILITY BILL', amount: '-158.1700', status: 'needs_review', error_message: null }] };
    render(<ImportDetail detail={detail} loading={false} error={null} onRetry={vi.fn()} />);
    expect(screen.getByText('UTILITY BILL')).toBeVisible();
    expect(screen.getByText(/158\.17/)).toHaveTextContent('-');
    expect(screen.getByText('Needs matching review')).toBeVisible();
    expect(screen.queryByText(/fingerprint|payload|bank reference/i)).not.toBeInTheDocument();
  });
});
