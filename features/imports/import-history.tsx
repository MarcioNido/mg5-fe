'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { Account } from '@/features/accounts/types';
import { formatDateTime } from '@/lib/format/date';

import { ImportStatusChip } from './status-chip';
import { importStatuses, importStatusLabels, type ImportFilters, type ImportSummary, type PaginationMeta } from './types';

type Props = {
  accounts: Account[];
  items: ImportSummary[];
  meta: PaginationMeta | null;
  filters: ImportFilters;
  loading: boolean;
  error: string | null;
  selectedId: number | null;
  onFiltersChange: (filters: ImportFilters) => void;
  onRetry: () => void;
  onSelect: (id: number) => void;
};

export function ImportHistory({ accounts, items, meta, filters, loading, error, selectedId, onFiltersChange, onRetry, onSelect }: Props) {
  const updateFilter = (field: 'accountId' | 'status', value: string) => onFiltersChange({ ...filters, [field]: value, page: 1 });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Import history</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={2.5}>
          <TextField select size="small" label="Account filter" value={filters.accountId} onChange={(event) => updateFilter('accountId', event.target.value)} sx={{ minWidth: 190 }}>
            <MenuItem value="">All accounts</MenuItem>
            {accounts.map((account) => <MenuItem key={account.id} value={String(account.id)}>{account.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Status filter" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} sx={{ minWidth: 210 }}>
            <MenuItem value="">All statuses</MenuItem>
            {importStatuses.map((status) => <MenuItem key={status} value={status}>{importStatusLabels[status]}</MenuItem>)}
          </TextField>
        </Stack>

        {error && <Alert severity="error" action={<Button color="inherit" onClick={onRetry}>Retry</Button>} sx={{ mt: 2 }}>{error}</Alert>}
        {loading && <Stack alignItems="center" py={7}><CircularProgress aria-label="Loading import history" /></Stack>}
        {!loading && !error && items.length === 0 && <Box textAlign="center" py={7}><Typography variant="h6">No imports found</Typography><Typography color="text.secondary">Upload a statement or adjust the filters.</Typography></Box>}
        {!loading && items.length > 0 && <>
          <TableContainer sx={{ mt: 2, overflowX: 'auto' }}>
            <Table size="small" aria-label="Import history" sx={{ minWidth: 880 }}>
              <TableHead><TableRow><TableCell>File</TableCell><TableCell>Account</TableCell><TableCell>Source</TableCell><TableCell>Uploaded</TableCell><TableCell>Rows</TableCell><TableCell>Status</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
              <TableBody>{items.map((item) => (
                <TableRow key={item.id} selected={item.id === selectedId}>
                  <TableCell><Typography variant="body2" fontWeight={700}>{item.original_filename ?? 'Imported CSV'}</Typography></TableCell>
                  <TableCell>{item.account.name}</TableCell>
                  <TableCell>{item.source_name}</TableCell>
                  <TableCell>{formatDateTime(item.created_at)}</TableCell>
                  <TableCell>{item.processed_rows}/{item.total_rows} processed · {item.failed_rows} failed</TableCell>
                  <TableCell><ImportStatusChip status={item.status} /></TableCell>
                  <TableCell align="right"><Button size="small" onClick={() => onSelect(item.id)}>View</Button></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </TableContainer>
          {meta && meta.last_page > 1 && <Stack alignItems="center" mt={3}><Pagination page={meta.current_page} count={meta.last_page} onChange={(_, page) => onFiltersChange({ ...filters, page })} /></Stack>}
        </>}
      </CardContent>
    </Card>
  );
}
