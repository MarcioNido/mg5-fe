'use client';

import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { splitRemaining, unitsToDecimal } from './decimal';
import type { CategoryOption } from './category-options';
import type { TransactionSplitInput } from './types';

type Props = {
  amount: string;
  rows: TransactionSplitInput[];
  options: CategoryOption[];
  errors: Record<string, string[] | undefined>;
  onChange: (rows: TransactionSplitInput[]) => void;
};

const blankRow = (): TransactionSplitInput => ({ category_id: '', amount: '', description: null });

export function SplitEditor({ amount, rows, options, errors, onChange }: Props) {
  const remaining = splitRemaining(amount, rows.map((row) => row.amount));
  const update = (index: number, patch: Partial<TransactionSplitInput>) => onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  const splitError = errors.splits?.[0];

  return <Stack spacing={2}>
    {options.length === 0 && <Alert severity="warning">Categories are required to split a transaction. Add categories before using split mode.</Alert>}
    {splitError && <Alert severity="error">{splitError}</Alert>}
    {rows.map((row, index) => <Box key={index} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1.4fr) minmax(120px, .7fr) auto' }, gap: 1.5, alignItems: 'start' }}>
      <TextField select required label={`Split ${index + 1} category`} value={row.category_id} onChange={(event) => update(index, { category_id: event.target.value ? Number(event.target.value) : '' })} error={Boolean(errors[`splits.${index}.category_id`]?.[0])} helperText={errors[`splits.${index}.category_id`]?.[0]}>
        <MenuItem value="">Choose category</MenuItem>{options.map((option) => <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>)}
      </TextField>
      <TextField required label={`Split ${index + 1} amount`} value={row.amount} onChange={(event) => update(index, { amount: event.target.value })} inputProps={{ inputMode: 'decimal' }} error={Boolean(errors[`splits.${index}.amount`]?.[0])} helperText={errors[`splits.${index}.amount`]?.[0]} />
      <IconButton aria-label={`Remove split ${index + 1}`} onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} disabled={rows.length <= 2}><DeleteOutlineRounded /></IconButton>
      <TextField sx={{ gridColumn: { sm: '1 / 3' } }} label={`Split ${index + 1} description`} value={row.description ?? ''} onChange={(event) => update(index, { description: event.target.value || null })} error={Boolean(errors[`splits.${index}.description`]?.[0])} helperText={errors[`splits.${index}.description`]?.[0] ?? 'Optional'} inputProps={{ maxLength: 255 }} />
    </Box>)}
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={1}>
      <Button startIcon={<AddRounded />} onClick={() => onChange([...rows, blankRow()])} disabled={options.length === 0}>Add split</Button>
      <Typography variant="body2" color={remaining === 0n ? 'success.main' : 'text.secondary'} aria-live="polite">
        {remaining === null ? 'Enter valid amounts to calculate the remaining amount.' : remaining === 0n ? 'Split amounts match the transaction amount.' : `Remaining amount: ${unitsToDecimal(remaining)}`}
      </Typography>
    </Stack>
  </Stack>;
}
