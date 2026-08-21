'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { FormEvent } from 'react';

import type { Account } from '@/features/accounts/types';

import type { CategoryOption } from './category-options';
import type { TransactionFilters as Filters } from './types';

type Props = {
  accounts: Account[];
  categoryOptions: CategoryOption[];
  draft: Filters;
  dateError: string | null;
  onDraftChange: (draft: Filters) => void;
  onApply: () => void;
  onClear: () => void;
};

export function TransactionFilters({ accounts, categoryOptions, draft, dateError, onDraftChange, onApply, onClear }: Props) {
  const change = <K extends keyof Filters>(field: K, value: Filters[K]) => onDraftChange({ ...draft, [field]: value });
  const submit = (event: FormEvent) => { event.preventDefault(); onApply(); };

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }}>
        <TextField label="Search" value={draft.search} onChange={(event) => change('search', event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); onApply(); } }} inputProps={{ maxLength: 200 }} />
        <TextField select label="Account" value={draft.accountId} onChange={(event) => change('accountId', event.target.value)}>
          <MenuItem value="">All accounts</MenuItem>
          {accounts.map((account) => <MenuItem key={account.id} value={String(account.id)}>{account.name}</MenuItem>)}
        </TextField>
        <TextField select label="Status" value={draft.status} onChange={(event) => change('status', event.target.value as Filters['status'])}>
          <MenuItem value="">All statuses</MenuItem><MenuItem value="pending">Pending</MenuItem><MenuItem value="posted">Posted</MenuItem>
        </TextField>
        <TextField select label="Origin" value={draft.origin} onChange={(event) => change('origin', event.target.value as Filters['origin'])}>
          <MenuItem value="">All origins</MenuItem><MenuItem value="manual">Manual</MenuItem><MenuItem value="csv">Imported</MenuItem><MenuItem value="system">System</MenuItem>
        </TextField>
        <TextField select label="Category" value={draft.categoryId} onChange={(event) => onDraftChange({ ...draft, categoryId: event.target.value, uncategorized: false })}>
          <MenuItem value="">All categories</MenuItem>
          {categoryOptions.map((option) => <MenuItem key={option.id} value={String(option.id)}>{option.label}</MenuItem>)}
        </TextField>
        <TextField label="Date from" type="date" value={draft.dateFrom} onChange={(event) => change('dateFrom', event.target.value)} InputLabelProps={{ shrink: true }} error={Boolean(dateError)} helperText={dateError ?? ' '} />
        <TextField label="Date to" type="date" value={draft.dateTo} onChange={(event) => change('dateTo', event.target.value)} InputLabelProps={{ shrink: true }} error={Boolean(dateError)} helperText={dateError ?? ' '} />
        <FormControlLabel control={<Checkbox checked={draft.uncategorized} onChange={(event) => onDraftChange({ ...draft, uncategorized: event.target.checked, categoryId: event.target.checked ? '' : draft.categoryId })} />} label="Uncategorized only" />
      </Box>
      <Stack direction="row" spacing={1.5} mt={1}>
        <Button type="submit" variant="contained">Apply filters</Button>
        <Button type="button" color="inherit" onClick={onClear}>Clear</Button>
      </Stack>
    </Box>
  );
}
