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

import { validParentOptions } from './helpers';
import { createCategory, updateCategory } from './service';
import { categoryTypeLabels, categoryTypes, type Category, type CategoryInput, type CategoryType } from './types';

type Props = { open: boolean; category: Category | null; categories: Category[]; tenantSlug: string; onClose: () => void; onSaved: (message: string) => void };
type FormState = { name: string; type: CategoryType; parentId: string };

export function CategoryFormDialog({ open, category, categories, tenantSlug, onClose, onSaved }: Props) {
  const initial = useMemo<FormState>(() => ({ name: category?.name ?? '', type: categoryTypes.includes(category?.type as CategoryType) ? category!.type as CategoryType : 'expense', parentId: category?.parent ? String(category.parent.id) : '' }), [category]);
  const options = useMemo(() => validParentOptions(categories, category), [categories, category]);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<LaravelValidationErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const fieldError = (name: string) => errors[name]?.[0];
  const change = <K extends keyof FormState>(field: K, value: FormState[K]) => { setForm((current) => ({ ...current, [field]: value })); const apiField = field === 'parentId' ? 'parent_id' : field; setErrors((current) => ({ ...current, [apiField]: [] })); };
  const requestClose = () => { if (lock.current) return; if (dirty && !window.confirm('Discard the unsaved category changes?')) return; onClose(); };
  const submit = async () => {
    if (lock.current) return;
    const next: LaravelValidationErrors = {};
    if (!form.name.trim()) next.name = ['Name is required.'];
    else if (form.name.trim().length > 255) next.name = ['Name must be 255 characters or fewer.'];
    if (!categoryTypes.includes(form.type)) next.type = ['Choose a category type.'];
    if (Object.keys(next).length) { setErrors(next); return; }
    lock.current = true; setSubmitting(true); setErrors({}); setGeneralError(null);
    const input: CategoryInput = { name: form.name.trim(), type: form.type, parent_id: form.parentId ? Number(form.parentId) : null };
    try {
      if (category) await updateCategory(tenantSlug, category.id, input); else await createCategory(tenantSlug, input);
      onSaved(category ? 'Category updated.' : 'Category added.'); onClose();
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 422) setErrors(reason.validationErrors ?? {});
      setGeneralError(messageFromError(reason, 'Unable to save this category.'));
    } finally { lock.current = false; setSubmitting(false); }
  };
  return <Dialog open={open} onClose={(_, reason) => { if (reason !== 'backdropClick') requestClose(); }} fullWidth maxWidth="sm" aria-labelledby="category-form-title" TransitionProps={{ onEntered: () => nameRef.current?.focus() }}>
    <DialogTitle id="category-form-title">{category ? 'Edit category' : 'Add category'}</DialogTitle>
    <DialogContent><Stack spacing={2.5} pt={1}>
      {generalError && <Alert severity="error">{generalError}</Alert>}
      <TextField inputRef={nameRef} required label="Name" value={form.name} onChange={(event) => change('name', event.target.value)} inputProps={{ maxLength: 255 }} error={Boolean(fieldError('name'))} helperText={fieldError('name')} />
      <TextField select required label="Type" value={form.type} onChange={(event) => change('type', event.target.value as CategoryType)} error={Boolean(fieldError('type'))} helperText={fieldError('type') ?? 'Type applies only to this category; it is not inherited by or propagated to related categories.'}>
        {categoryTypes.map((type) => <MenuItem key={type} value={type}>{categoryTypeLabels[type]}</MenuItem>)}
      </TextField>
      <TextField select label="Parent category" value={form.parentId} onChange={(event) => change('parentId', event.target.value)} error={Boolean(fieldError('parent_id'))} helperText={fieldError('parent_id') ?? 'Categories can have at most three levels.'}>
        <MenuItem value="">No parent (top level)</MenuItem>{options.map((option) => <MenuItem key={option.id} value={String(option.id)}>{option.label}</MenuItem>)}
      </TextField>
    </Stack></DialogContent>
    <DialogActions sx={{ p: 3 }}><Button color="inherit" onClick={requestClose} disabled={submitting}>Cancel</Button><Button variant="contained" onClick={submit} disabled={submitting} startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}>{submitting ? 'Saving…' : 'Save category'}</Button></DialogActions>
  </Dialog>;
}

