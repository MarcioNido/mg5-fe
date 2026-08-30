'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import type { CategoryOption } from './category-options';

type Props = {
  selectedCount: number;
  categoryOptions: CategoryOption[];
  busy: boolean;
  error: string | null;
  onApply: (categoryId: number, categoryLabel: string) => void;
  onClear: () => void;
};

export function BulkCategoryToolbar({ selectedCount, categoryOptions, busy, error, onApply, onClear }: Props) {
  const [categoryId, setCategoryId] = useState('');
  const selectedCategory = categoryOptions.find((option) => String(option.id) === categoryId);

  return <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main', bgcolor: 'action.hover' }}>
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5}>
        <Typography fontWeight={700} sx={{ minWidth: 120 }}>{selectedCount} selected</Typography>
        <TextField select size="small" label="Category for selected transactions" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={busy} sx={{ minWidth: { md: 320 }, flex: 1 }}>
          {categoryOptions.map((option) => <MenuItem key={option.id} value={String(option.id)}>{option.label}</MenuItem>)}
        </TextField>
        <Button variant="contained" disabled={busy || !selectedCategory} onClick={() => selectedCategory && onApply(selectedCategory.id, selectedCategory.label)} startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}>{busy ? 'Applying…' : 'Apply category'}</Button>
        <Button color="inherit" disabled={busy} onClick={onClear}>Clear selection</Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">Existing single categories will be replaced. Split and ignored transactions must be handled individually.</Typography>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  </Paper>;
}
