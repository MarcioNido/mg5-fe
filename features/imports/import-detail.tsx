'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { formatDateTime } from '@/lib/format/date';
import { formatDecimalCurrency } from '@/lib/format/money';

import { ImportStatusChip, RowStatusChip } from './status-chip';
import type { ImportDetail as ImportDetailType } from './types';

type Props = { detail: ImportDetailType | null; loading: boolean; error: string | null; onRetry: () => void };

export function ImportDetail({ detail, loading, error, onRetry }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Import detail</Typography>
        {!detail && !loading && !error && <Box py={6} textAlign="center"><Typography color="text.secondary">Select an import to review its result.</Typography></Box>}
        {loading && <Stack alignItems="center" py={7}><CircularProgress aria-label="Loading import detail" /></Stack>}
        {error && <Alert severity="error" action={<Button color="inherit" onClick={onRetry}>Retry</Button>} sx={{ mt: 2 }}>{error}</Alert>}
        {detail && !loading && <Stack spacing={2.5} mt={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
            <Box><Typography variant="h6">{detail.original_filename ?? 'Imported CSV'}</Typography><Typography variant="body2" color="text.secondary">{detail.account.name} · {detail.source_name} · {formatDateTime(detail.created_at)}</Typography></Box>
            <Box><ImportStatusChip status={detail.status} /></Box>
          </Stack>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Box><Typography variant="caption" color="text.secondary">Total rows</Typography><Typography fontWeight={700}>{detail.total_rows}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Processed</Typography><Typography fontWeight={700}>{detail.processed_rows}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Failed</Typography><Typography fontWeight={700}>{detail.failed_rows}</Typography></Box>
          </Stack>
          {detail.error_message && <Alert severity="error">{detail.error_message}</Alert>}
          <Divider />
          {detail.rows.length === 0 ? <Typography color="text.secondary">No row results are available yet.</Typography> : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small" aria-label="Import row results" sx={{ minWidth: 760 }}>
                <TableHead><TableRow><TableCell>Line</TableCell><TableCell>Date</TableCell><TableCell>Description</TableCell><TableCell align="right">Amount</TableCell><TableCell>Status</TableCell><TableCell>Error</TableCell></TableRow></TableHead>
                <TableBody>{detail.rows.map((row) => <TableRow key={row.id}>
                  <TableCell>{row.line_number}</TableCell><TableCell>{row.transaction_date ?? '—'}</TableCell><TableCell>{row.description ?? '—'}</TableCell><TableCell align="right">{formatDecimalCurrency(row.amount, detail.account.currency)}</TableCell><TableCell><RowStatusChip status={row.status} /></TableCell><TableCell>{row.error_message ?? '—'}</TableCell>
                </TableRow>)}</TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>}
      </CardContent>
    </Card>
  );
}
