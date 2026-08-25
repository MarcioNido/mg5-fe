import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/error';

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
vi.mock('@/features/rules/service', () => ({ createRule: mocks.create, updateRule: mocks.update }));

import { RuleFormDialog } from '@/features/rules/rule-form-dialog';

const accounts = [{ id: 4, name: 'Clinic card', type: 'credit' as const, account_number: 'SECRET-1234', currency: 'CAD', opening_balance: '0', opening_balance_date: null }];
const food = { id: 1, name: 'Food', type: 'expense' as const, level: 1, parent: null };
const options = [{ id: 1, label: 'Food', category: food }];
const baseProps = { open: true, rule: null, tenantSlug: 'personal', accounts, categoryOptions: options, onClose: vi.fn(), onSaved: vi.fn() };
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }
function choose(label: string | RegExp, option: string) { fireEvent.mouseDown(screen.getByLabelText(label)); fireEvent.click(screen.getByRole('option', { name: option })); }

describe('rule form dialog', () => {
  beforeEach(() => { mocks.create.mockResolvedValue({}); mocks.update.mockResolvedValue({}); baseProps.onClose = vi.fn(); baseProps.onSaved = vi.fn(); });
  afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks(); });

  it('creates a trimmed global rule with numeric category_id', async () => {
    render(<RuleFormDialog {...baseProps} />); fireEvent.change(screen.getByLabelText(/Match text/), { target: { value: '  COSTCO  ' } }); choose(/Category/, 'Food'); fireEvent.click(screen.getByRole('button', { name: 'Save rule' })); await flush();
    expect(mocks.create).toHaveBeenCalledWith('personal', { match_text: 'COSTCO', account_id: null, category_id: 1 }); expect(baseProps.onSaved).toHaveBeenCalledWith(expect.stringContaining('queued in the background'));
  });

  it('creates an account-specific rule with a numeric account_id', async () => {
    render(<RuleFormDialog {...baseProps} />); fireEvent.change(screen.getByLabelText(/Match text/), { target: { value: 'PHARMACY' } }); choose('Account scope', 'Clinic card'); choose(/Category/, 'Food'); fireEvent.click(screen.getByRole('button', { name: 'Save rule' })); await flush();
    expect(mocks.create).toHaveBeenCalledWith('personal', { match_text: 'PHARMACY', account_id: 4, category_id: 1 }); expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument();
  });

  it('associates all Laravel validation errors with their fields', async () => {
    mocks.create.mockRejectedValue(new ApiError(422, 'invalid', { match_text: ['Match text is already used.'], account_id: ['Account is unavailable.'], category_id: ['Category is unavailable.'] })); render(<RuleFormDialog {...baseProps} />); fireEvent.change(screen.getByLabelText(/Match text/), { target: { value: 'COSTCO' } }); choose(/Category/, 'Food'); fireEvent.click(screen.getByRole('button', { name: 'Save rule' })); await flush();
    expect(screen.getByText('Match text is already used.')).toBeVisible(); expect(screen.getByText('Account is unavailable.')).toBeVisible(); expect(screen.getByText('Category is unavailable.')).toBeVisible(); expect(screen.getByLabelText(/Match text/)).toHaveAttribute('aria-invalid', 'true'); expect(screen.getByLabelText('Account scope')).toHaveAccessibleDescription('Account is unavailable.'); expect(screen.getByLabelText(/Category/)).toHaveAccessibleDescription('Category is unavailable.');
  });

  it('requires confirmation before closing a dirty form', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false); render(<RuleFormDialog {...baseProps} />); fireEvent.change(screen.getByLabelText(/Match text/), { target: { value: 'Draft' } }); fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(confirm).toHaveBeenCalledWith('Discard the unsaved rule changes?'); expect(baseProps.onClose).not.toHaveBeenCalled();
    confirm.mockReturnValue(true); fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(baseProps.onClose).toHaveBeenCalledOnce();
  });

  it('locks synchronous double-click submission', async () => {
    let resolve!: (value: unknown) => void; mocks.create.mockReturnValue(new Promise((done) => { resolve = done; })); render(<RuleFormDialog {...baseProps} />); fireEvent.change(screen.getByLabelText(/Match text/), { target: { value: 'COSTCO' } }); choose(/Category/, 'Food'); const save = screen.getByRole('button', { name: 'Save rule' }); fireEvent.click(save); fireEvent.click(save); expect(mocks.create).toHaveBeenCalledTimes(1); await act(async () => resolve({}));
  });

  it('explains literal percent and underscore semantics without exposing account numbers', () => {
    render(<RuleFormDialog {...baseProps} />); expect(screen.getByText(/% and _ are ordinary characters, not wildcards/)).toBeVisible(); expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument(); fireEvent.mouseDown(screen.getByLabelText('Account scope')); expect(screen.queryByText(/SECRET/)).not.toBeInTheDocument();
  });
});
