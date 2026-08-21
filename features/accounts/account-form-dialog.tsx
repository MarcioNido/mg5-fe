'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useMemo, useRef, useState } from 'react';

import { ApiError } from '@/lib/api/error';
import type { LaravelValidationErrors } from '@/lib/api/types';
import { messageFromError } from '@/lib/api/ui-error';

import { createAccount, updateAccount } from './service';
import { accountTypeLabels, accountTypes, type Account, type AccountInput } from './types';

const emptyForm: AccountInput = {
  name: '',
  type: 'chequing',
  account_number: null,
  currency: 'CAD',
  opening_balance: '0',
  opening_balance_date: null,
};

export const validOpeningBalance = (value: string) => /^-?\d+(?:\.\d{1,4})?$/.test(value);
export const validCurrency = (value: string) => /^[A-Z]{3}$/.test(value);

type Props = {
  open: boolean;
  account: Account | null;
  tenantSlug: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export function AccountFormDialog({ open, account, tenantSlug, onClose, onSaved }: Props) {
  const initial = useMemo<AccountInput>(() => account ? {
    name: account.name,
    type: account.type,
    account_number: account.account_number,
    currency: account.currency.toUpperCase(),
    opening_balance: account.opening_balance,
    opening_balance_date: account.opening_balance_date,
  } : emptyForm, [account]);
  const [form, setForm] = useState<AccountInput>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<LaravelValidationErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const requestClose = () => {
    if (submitting) return;
    if (dirty && !window.confirm('Discard the unsaved account changes?')) return;
    onClose();
  };

  const change = (field: keyof AccountInput, value: string) => {
    const normalized = field === 'currency' ? value.toUpperCase() : value;
    setForm((current) => ({ ...current, [field]: normalized || (field === 'account_number' || field === 'opening_balance_date' ? null : '') }));
    setErrors((current) => ({ ...current, [field]: [] }));
  };

  const submit = async () => {
    const clientErrors: LaravelValidationErrors = {};
    if (!form.name.trim()) clientErrors.name = ['Account name is required.'];
    if (!validCurrency(form.currency.trim().toUpperCase())) clientErrors.currency = ['Use a three-letter currency code, such as CAD.'];
    if (!validOpeningBalance(form.opening_balance)) clientErrors.opening_balance = ['Use a decimal with up to four places.'];
    if (!tenantSlug) clientErrors.tenant = ['Choose a financial profile before saving.'];
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    setGeneralError(null);
    try {
      const payload = { ...form, name: form.name.trim(), currency: form.currency.trim().toUpperCase() };
      if (account) await updateAccount(tenantSlug!, account.id, payload);
      else await createAccount(tenantSlug!, payload);
      onSaved();
      onClose();
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 422) setErrors(reason.validationErrors ?? {});
      setGeneralError(messageFromError(reason, 'Unable to save this account.'));
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (field: string) => errors[field]?.[0];

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => { if (reason !== 'backdropClick') requestClose(); }}
      fullWidth
      maxWidth="sm"
      aria-labelledby="account-form-title"
      TransitionProps={{ onEntered: () => nameRef.current?.focus() }}
    >
      <DialogTitle id="account-form-title">{account ? 'Edit account' : 'Add account'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} pt={1}>
          {generalError && <Alert severity="error">{generalError}</Alert>}
          <TextField inputRef={nameRef} required label="Account name" value={form.name} onChange={(event) => change('name', event.target.value)} error={Boolean(fieldError('name'))} helperText={fieldError('name')} inputProps={{ maxLength: 255 }} />
          <TextField select required label="Account type" value={form.type} onChange={(event) => change('type', event.target.value)} error={Boolean(fieldError('type'))} helperText={fieldError('type')}>
            {accountTypes.map((type) => <MenuItem key={type} value={type}>{accountTypeLabels[type]}</MenuItem>)}
          </TextField>
          <TextField label="Account number" value={form.account_number ?? ''} onChange={(event) => change('account_number', event.target.value)} error={Boolean(fieldError('account_number'))} helperText={fieldError('account_number') ?? 'Optional. Used to verify that an imported CSV belongs to this account.'} inputProps={{ maxLength: 255 }} />
          <TextField required label="Currency" value={form.currency} onChange={(event) => change('currency', event.target.value)} error={Boolean(fieldError('currency'))} helperText={fieldError('currency') ?? 'Three-letter code, for example CAD.'} inputProps={{ maxLength: 3 }} />
          <TextField required label="Opening balance" value={form.opening_balance} onChange={(event) => change('opening_balance', event.target.value)} error={Boolean(fieldError('opening_balance'))} helperText={fieldError('opening_balance') ?? 'Balance before the first MG5 period. Used later for reconciliation; it is not a transaction.'} inputProps={{ inputMode: 'decimal' }} />
          <TextField label="Opening balance date" type="date" value={form.opening_balance_date ?? ''} onChange={(event) => change('opening_balance_date', event.target.value)} error={Boolean(fieldError('opening_balance_date'))} helperText={fieldError('opening_balance_date')} InputLabelProps={{ shrink: true }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button color="inherit" onClick={requestClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={submitting || !tenantSlug} startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}>
          {submitting ? 'Saving…' : 'Save account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
