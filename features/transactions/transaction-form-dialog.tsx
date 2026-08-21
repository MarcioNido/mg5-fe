'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useMemo, useRef, useState } from 'react';

import type { Account } from '@/features/accounts/types';
import { ApiError } from '@/lib/api/error';
import type { LaravelValidationErrors } from '@/lib/api/types';
import { messageFromError } from '@/lib/api/ui-error';
import { todayInBusinessTimezone } from '@/lib/format/date';

import type { CategoryOption } from './category-options';
import { DECIMAL_PATTERN, splitRemaining } from './decimal';
import { createTransaction, deleteTransaction, updateTransaction } from './service';
import { SplitEditor } from './split-editor';
import type { CreateTransactionInput, Transaction, TransactionSplitInput, TransactionStatus } from './types';

type CategorizationMode = 'single' | 'split';
type FormState = {
  accountId: string;
  transactionDate: string;
  amount: string;
  description: string;
  notes: string;
  status: TransactionStatus;
  mode: CategorizationMode;
  categoryId: string;
  splits: TransactionSplitInput[];
};

type Props = {
  open: boolean;
  transaction: Transaction | null;
  tenantSlug: string;
  accounts: Account[];
  categoryOptions: CategoryOption[];
  onClose: () => void;
  onSaved: (message: string) => void;
};

const blankSplits = (): TransactionSplitInput[] => [{ category_id: '', amount: '', description: null }, { category_id: '', amount: '', description: null }];

function initialForm(transaction: Transaction | null, accounts: Account[]): FormState {
  if (!transaction) return { accountId: accounts[0] ? String(accounts[0].id) : '', transactionDate: todayInBusinessTimezone(), amount: '', description: '', notes: '', status: 'pending', mode: 'single', categoryId: '', splits: blankSplits() };
  return {
    accountId: String(transaction.account_id), transactionDate: transaction.transaction_date, amount: transaction.amount,
    description: transaction.description, notes: transaction.notes ?? '', status: transaction.status,
    mode: transaction.splits.length ? 'split' : 'single', categoryId: transaction.category_id ? String(transaction.category_id) : '',
    splits: transaction.splits.length ? transaction.splits.map((split) => ({ category_id: split.category_id, amount: split.amount, description: split.description })) : blankSplits(),
  };
}

export function TransactionFormDialog({ open, transaction, tenantSlug, accounts, categoryOptions, onClose, onSaved }: Props) {
  const initial = useMemo(() => initialForm(transaction, accounts), [transaction, accounts]);
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<LaravelValidationErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const bankEditable = !transaction || transaction.bank_fields_editable;
  const busy = submitting || deleting;
  const fieldError = (field: string) => errors[field]?.[0];

  const requestClose = () => {
    if (busy) return;
    if (dirty && !window.confirm('Discard the unsaved transaction changes?')) return;
    onClose();
  };
  const change = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: [] }));
  };

  const validate = () => {
    const next: LaravelValidationErrors = {};
    if (!form.accountId) next.account_id = ['Account is required.'];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.transactionDate)) next.transaction_date = ['Transaction date is required.'];
    if (!DECIMAL_PATTERN.test(form.amount)) next.amount = ['Use a signed decimal with up to four places.'];
    if (!form.description.trim()) next.description = ['Description is required.'];
    if (form.mode === 'split') {
      if (categoryOptions.length === 0) next.splits = ['Categories are required to split a transaction.'];
      if (form.splits.length < 2) next.splits = ['Use at least two split rows.'];
      form.splits.forEach((split, index) => {
        if (split.category_id === '') next[`splits.${index}.category_id`] = ['Category is required.'];
        if (!DECIMAL_PATTERN.test(split.amount)) next[`splits.${index}.amount`] = ['Use a signed decimal with up to four places.'];
      });
      const remaining = splitRemaining(form.amount, form.splits.map((split) => split.amount));
      if (remaining !== null && remaining !== 0n) next.splits = ['Split amounts must exactly equal the transaction amount.'];
    }
    return next;
  };

  const payload = (): CreateTransactionInput => ({
    account_id: Number(form.accountId), transaction_date: form.transactionDate, amount: form.amount,
    description: form.description.trim(), notes: form.notes.trim() || null, status: form.status,
    category_id: form.mode === 'single' && form.categoryId ? Number(form.categoryId) : null,
    splits: form.mode === 'split' ? form.splits.map((split) => ({ category_id: split.category_id as number, amount: split.amount, description: split.description?.trim() || null })) : [],
  });

  const submit = async () => {
    const next = validate();
    if (Object.keys(next).length) { setErrors(next); return; }
    setSubmitting(true); setErrors({}); setGeneralError(null);
    try {
      const input = payload();
      if (transaction) {
        if (!transaction.bank_fields_editable) {
          const enrichment = { description: input.description, notes: input.notes, category_id: input.category_id, splits: input.splits };
          await updateTransaction(tenantSlug, transaction.id, enrichment);
        } else {
          await updateTransaction(tenantSlug, transaction.id, input);
        }
      } else await createTransaction(tenantSlug, input);
      onSaved(transaction ? 'Transaction updated.' : 'Transaction added.');
      onClose();
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 422) setErrors(reason.validationErrors ?? {});
      setGeneralError(messageFromError(reason, 'Unable to save this transaction.'));
    } finally { setSubmitting(false); }
  };

  const remove = async () => {
    if (!transaction?.deletable) return;
    const identity = `${transaction.description} on ${transaction.transaction_date} (${transaction.amount})`;
    if (!window.confirm(`Delete ${identity}? This action cannot be undone.`)) return;
    setDeleting(true); setGeneralError(null);
    try { await deleteTransaction(tenantSlug, transaction.id); onSaved('Transaction deleted.'); onClose(); }
    catch (reason) {
      if (reason instanceof ApiError && reason.status === 422) setErrors(reason.validationErrors ?? {});
      setGeneralError(messageFromError(reason, 'Unable to delete this transaction.'));
    } finally { setDeleting(false); }
  };

  return <Dialog open={open} onClose={(_, reason) => { if (reason !== 'backdropClick') requestClose(); }} fullWidth maxWidth="md" aria-labelledby="transaction-form-title" TransitionProps={{ onEntered: () => descriptionRef.current?.focus() }}>
    <DialogTitle id="transaction-form-title">{transaction ? 'Edit transaction' : 'Add transaction'}</DialogTitle>
    <DialogContent><Stack spacing={2.5} pt={1}>
      {generalError && <Alert severity="error">{generalError}</Alert>}
      {!bankEditable && <Alert severity="info">Bank details came from or were confirmed by an import, so account, date, amount, and status are locked. Description, notes, and categorization remain editable.</Alert>}
      <TextField select required disabled={!bankEditable} label="Account" value={form.accountId} onChange={(event) => change('accountId', event.target.value)} error={Boolean(fieldError('account_id'))} helperText={fieldError('account_id')}>
        {accounts.map((account) => <MenuItem key={account.id} value={String(account.id)}>{account.name}</MenuItem>)}
      </TextField>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField fullWidth required disabled={!bankEditable} label="Transaction date" type="date" value={form.transactionDate} onChange={(event) => change('transactionDate', event.target.value)} InputLabelProps={{ shrink: true }} error={Boolean(fieldError('transaction_date'))} helperText={fieldError('transaction_date')} />
        <TextField fullWidth required disabled={!bankEditable} label="Amount" value={form.amount} onChange={(event) => change('amount', event.target.value)} inputProps={{ inputMode: 'decimal' }} error={Boolean(fieldError('amount'))} helperText={fieldError('amount') ?? 'Positive = money in; negative = money out. Up to four decimal places.'} />
      </Stack>
      <TextField inputRef={descriptionRef} required label="Description" value={form.description} onChange={(event) => change('description', event.target.value)} error={Boolean(fieldError('description'))} helperText={fieldError('description')} inputProps={{ maxLength: 255 }} />
      <TextField label="Notes" multiline minRows={2} value={form.notes} onChange={(event) => change('notes', event.target.value)} error={Boolean(fieldError('notes'))} helperText={fieldError('notes')} />
      <TextField select required disabled={!bankEditable} label="Status" value={form.status} onChange={(event) => change('status', event.target.value as TransactionStatus)} error={Boolean(fieldError('status'))} helperText={fieldError('status') ?? (form.status === 'pending' ? 'Expected in a future statement; does not affect confirmed bank cash.' : 'Manually confirmed; affects confirmed bank cash.')}>
        <MenuItem value="pending">Pending</MenuItem><MenuItem value="posted">Posted</MenuItem>
      </TextField>
      <FormControl error={Boolean(fieldError('category_id'))}><FormLabel>Categorization</FormLabel><RadioGroup row value={form.mode} onChange={(event) => change('mode', event.target.value as CategorizationMode)}><FormControlLabel value="single" control={<Radio />} label="Single category" /><FormControlLabel value="split" control={<Radio />} label="Split into categories" disabled={categoryOptions.length === 0} /></RadioGroup>{fieldError('category_id') && <FormHelperText>{fieldError('category_id')}</FormHelperText>}</FormControl>
      {form.mode === 'single' ? <TextField select label="Category" value={form.categoryId} onChange={(event) => change('categoryId', event.target.value)} helperText="Choose Uncategorized to leave this as a management follow-up."><MenuItem value="">Uncategorized</MenuItem>{categoryOptions.map((option) => <MenuItem key={option.id} value={String(option.id)}>{option.label}</MenuItem>)}</TextField> : <SplitEditor amount={form.amount} rows={form.splits} options={categoryOptions} errors={errors} onChange={(splits) => change('splits', splits)} />}
      {transaction && !transaction.deletable && <Alert severity="info">This transaction is linked to an import and cannot be deleted directly.</Alert>}
    </Stack></DialogContent>
    <DialogActions sx={{ p: 3, justifyContent: transaction?.deletable ? 'space-between' : 'flex-end' }}>
      {transaction?.deletable && <Button color="error" onClick={remove} disabled={busy}>{deleting ? 'Deleting…' : 'Delete transaction'}</Button>}
      <Stack direction="row" spacing={1}><Button color="inherit" onClick={requestClose} disabled={busy}>Cancel</Button><Button variant="contained" onClick={submit} disabled={busy || accounts.length === 0 || (form.mode === 'split' && categoryOptions.length === 0)} startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}>{submitting ? 'Saving…' : 'Save transaction'}</Button></Stack>
    </DialogActions>
  </Dialog>;
}
