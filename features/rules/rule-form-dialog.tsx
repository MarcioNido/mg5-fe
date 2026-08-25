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

import type { Account } from '@/features/accounts/types';
import type { CategoryOption } from '@/features/categories/helpers';
import { ApiError } from '@/lib/api/error';
import type { LaravelValidationErrors } from '@/lib/api/types';
import { messageFromError } from '@/lib/api/ui-error';

import { createRule, updateRule } from './service';
import type { Rule, RuleInput } from './types';

type Props = { open: boolean; rule: Rule | null; tenantSlug: string; accounts: Account[]; categoryOptions: CategoryOption[]; onClose: () => void; onSaved: (message: string) => void };
type FormState = { matchText: string; accountId: string; categoryId: string };

export function RuleFormDialog({ open, rule, tenantSlug, accounts, categoryOptions, onClose, onSaved }: Props) {
  const initial = useMemo<FormState>(() => ({ matchText: rule?.match_text ?? '', accountId: rule?.account ? String(rule.account.id) : '', categoryId: rule ? String(rule.category.id) : '' }), [rule]);
  const [form, setForm] = useState(initial); const [errors, setErrors] = useState<LaravelValidationErrors>({}); const [generalError, setGeneralError] = useState<string | null>(null); const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false); const matchRef = useRef<HTMLInputElement>(null); const dirty = JSON.stringify(form) !== JSON.stringify(initial); const fieldError = (field: string) => errors[field]?.[0];
  const change = <K extends keyof FormState>(field: K, value: FormState[K]) => { setForm((current) => ({ ...current, [field]: value })); const apiField = field === 'matchText' ? 'match_text' : field === 'accountId' ? 'account_id' : 'category_id'; setErrors((current) => ({ ...current, [apiField]: [] })); };
  const requestClose = () => { if (lock.current) return; if (dirty && !window.confirm('Discard the unsaved rule changes?')) return; onClose(); };
  const submit = async () => {
    if (lock.current) return; const next: LaravelValidationErrors = {}; const matchText = form.matchText.trim();
    if (!matchText) next.match_text = ['Match text is required.']; else if (matchText.length > 120) next.match_text = ['Match text must be 120 characters or fewer.'];
    if (!form.categoryId) next.category_id = ['Category is required.'];
    if (Object.keys(next).length) { setErrors(next); return; }
    lock.current = true; setSubmitting(true); setErrors({}); setGeneralError(null);
    const input: RuleInput = { match_text: matchText, account_id: form.accountId ? Number(form.accountId) : null, category_id: Number(form.categoryId) };
    try { if (rule) await updateRule(tenantSlug, rule.id, input); else await createRule(tenantSlug, input); onSaved(rule ? 'Rule updated. Safe reprocessing was queued in the background.' : 'Rule added. Safe reprocessing was queued in the background.'); onClose(); }
    catch (reason) { if (reason instanceof ApiError && reason.status === 422) setErrors(reason.validationErrors ?? {}); setGeneralError(messageFromError(reason, 'Unable to save this rule.')); }
    finally { lock.current = false; setSubmitting(false); }
  };
  return <Dialog open={open} onClose={(_, reason) => { if (reason !== 'backdropClick') requestClose(); }} fullWidth maxWidth="sm" aria-labelledby="rule-form-title" TransitionProps={{ onEntered: () => matchRef.current?.focus() }}>
    <DialogTitle id="rule-form-title">{rule ? 'Edit rule' : 'Add rule'}</DialogTitle><DialogContent><Stack spacing={2.5} pt={1}>
      {generalError && <Alert severity="error">{generalError}</Alert>}
      <TextField inputRef={matchRef} required label="Match text" value={form.matchText} onChange={(event) => change('matchText', event.target.value)} inputProps={{ maxLength: 120 }} error={Boolean(fieldError('match_text'))} helperText={fieldError('match_text') ?? 'Literal description text, for example COSTCO. % and _ are ordinary characters, not wildcards.'} />
      <TextField select label="Account scope" value={form.accountId} onChange={(event) => change('accountId', event.target.value)} error={Boolean(fieldError('account_id'))} helperText={fieldError('account_id') ?? 'All accounts applies this rule across the selected financial profile.'}><MenuItem value="">All accounts</MenuItem>{accounts.map((account) => <MenuItem key={account.id} value={String(account.id)}>{account.name}</MenuItem>)}</TextField>
      <TextField select required label="Category" value={form.categoryId} onChange={(event) => change('categoryId', event.target.value)} error={Boolean(fieldError('category_id'))} helperText={fieldError('category_id')}><MenuItem value="" disabled>Choose a category</MenuItem>{categoryOptions.map((option) => <MenuItem key={option.id} value={String(option.id)}>{option.label}</MenuItem>)}</TextField>
    </Stack></DialogContent><DialogActions sx={{ p: 3 }}><Button color="inherit" onClick={requestClose} disabled={submitting}>Cancel</Button><Button variant="contained" onClick={submit} disabled={submitting || categoryOptions.length === 0} startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}>{submitting ? 'Saving…' : 'Save rule'}</Button></DialogActions>
  </Dialog>;
}

