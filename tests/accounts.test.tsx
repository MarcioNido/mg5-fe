import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  useAccounts: vi.fn(),
  selectedSlug: 'personal' as string | null,
}));

vi.mock('@/features/accounts/service', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/accounts/service')>(),
  createAccount: mocks.createAccount,
  updateAccount: mocks.updateAccount,
}));
vi.mock('@/features/accounts/use-accounts', () => ({ useAccounts: mocks.useAccounts }));
vi.mock('@/features/tenants/tenant-context', () => ({ useTenant: () => ({ selectedSlug: mocks.selectedSlug }) }));

import { AccountFormDialog, validCurrency, validOpeningBalance } from '@/features/accounts/account-form-dialog';
import { AccountsView, maskAccountNumber } from '@/features/accounts/accounts-view';
import type { Account } from '@/features/accounts/types';
import { ApiError } from '@/lib/api/error';
import { formatDecimalCurrency } from '@/lib/format/money';

const account: Account = { id: 7, name: 'RBC Chequing', type: 'chequing', account_number: '06402-5031752', currency: 'CAD', opening_balance: '12.3456', opening_balance_date: '2026-01-01' };

describe('accounts', () => {
  beforeEach(() => {
    mocks.selectedSlug = 'personal';
    mocks.useAccounts.mockReturnValue({ accounts: [], loading: false, error: null, retry: vi.fn(), refresh: vi.fn() });
    mocks.createAccount.mockResolvedValue({ data: account });
    mocks.updateAccount.mockResolvedValue({ data: account });
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

  it('shows the account empty state', () => {
    render(<AccountsView />);
    expect(screen.getByText('No accounts yet')).toBeVisible();
  });

  it('loads and presents accounts with a masked account number', () => {
    mocks.useAccounts.mockReturnValue({ accounts: [account], loading: false, error: null, retry: vi.fn(), refresh: vi.fn() });
    render(<AccountsView />);
    expect(screen.getByText('RBC Chequing')).toBeVisible();
    expect(screen.getByText('•••• 1752')).toBeVisible();
    expect(screen.queryByText(account.account_number!)).not.toBeInTheDocument();
  });

  it('masks short and full account identifiers consistently', () => {
    expect(maskAccountNumber('123456')).toBe('•••• 3456');
    expect(maskAccountNumber('12')).toBe('•••• 12');
    expect(maskAccountNumber(null)).toBeNull();
  });

  it('validates decimal balances with at most four places', () => {
    expect(validOpeningBalance('0')).toBe(true);
    expect(validOpeningBalance('-12.3456')).toBe(true);
    expect(validOpeningBalance('12.34567')).toBe(false);
    expect(validOpeningBalance('12,30')).toBe(false);
  });

  it('formats CAD, normalizes lowercase currency, and falls back safely for invalid currency', () => {
    expect(validCurrency('CAD')).toBe(true);
    expect(validCurrency('12$')).toBe(false);
    expect(formatDecimalCurrency('10.0000', 'CAD')).toMatch(/\$10\.00/);
    expect(formatDecimalCurrency('10.0000', 'cad')).toBe(formatDecimalCurrency('10.0000', 'CAD'));
    expect(() => formatDecimalCurrency('10.0000', '12$')).not.toThrow();
    expect(formatDecimalCurrency('10.0000', '12$')).toBe(formatDecimalCurrency('10.0000', 'CAD'));
  });

  it('normalizes lowercase currency to uppercase before saving', async () => {
    render(<AccountFormDialog open account={null} tenantSlug="personal" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Account name/), { target: { value: 'Cash' } });
    fireEvent.change(screen.getByLabelText(/Currency/), { target: { value: 'cad' } });
    expect(screen.getByLabelText(/Currency/)).toHaveValue('CAD');
    fireEvent.click(screen.getByRole('button', { name: 'Save account' }));
    await waitFor(() => expect(mocks.createAccount).toHaveBeenCalledWith('personal', expect.objectContaining({ currency: 'CAD' })));
  });

  it('rejects a currency that is not three ASCII letters', async () => {
    render(<AccountFormDialog open account={null} tenantSlug="personal" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Account name/), { target: { value: 'Cash' } });
    fireEvent.change(screen.getByLabelText(/Currency/), { target: { value: '12$' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save account' }));
    expect(await screen.findByText('Use a three-letter currency code, such as CAD.')).toBeVisible();
    expect(mocks.createAccount).not.toHaveBeenCalled();
  });

  it('creates an account and refreshes the list', async () => {
    const saved = vi.fn();
    render(<AccountFormDialog open account={null} tenantSlug="personal" onClose={vi.fn()} onSaved={saved} />);
    fireEvent.change(screen.getByLabelText(/Account name/), { target: { value: 'Clinic Cash' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save account' }));
    await waitFor(() => expect(mocks.createAccount).toHaveBeenCalledWith('personal', expect.objectContaining({ name: 'Clinic Cash', opening_balance: '0' })));
    expect(saved).toHaveBeenCalledOnce();
  });

  it('edits an account with its complete account number in the form', async () => {
    render(<AccountFormDialog open account={account} tenantSlug="personal" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByLabelText('Account number')).toHaveValue('06402-5031752');
    fireEvent.change(screen.getByLabelText(/Account name/), { target: { value: 'Everyday Banking' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save account' }));
    await waitFor(() => expect(mocks.updateAccount).toHaveBeenCalledWith('personal', 7, expect.objectContaining({ name: 'Everyday Banking' })));
  });

  it('displays Laravel 422 field errors', async () => {
    mocks.createAccount.mockRejectedValue(new ApiError(422, 'Please review the highlighted fields.', { account_number: ['That account number is already in use.'] }));
    render(<AccountFormDialog open account={null} tenantSlug="personal" onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Account name/), { target: { value: 'Cash' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save account' }));
    expect(await screen.findByText('That account number is already in use.')).toBeVisible();
  });

  it('does not expose a previous tenant form after a switch', () => {
    mocks.useAccounts.mockReturnValue({ accounts: [account], loading: false, error: null, retry: vi.fn(), refresh: vi.fn() });
    const { rerender } = render(<AccountsView />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit RBC Chequing' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    mocks.selectedSlug = 'clinic';
    rerender(<AccountsView />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
