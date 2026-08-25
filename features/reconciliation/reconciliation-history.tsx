'use client';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { formatDateOnly, formatDateTime } from '@/lib/format/date';
import { formatDecimalCurrency } from '@/lib/format/money';

import type { Reconciliation } from './types';

type Props = { items: Reconciliation[]; currency: string; reviewDisabled: boolean; onReview: (item: Reconciliation) => void };

function Status({ item }: { item: Reconciliation }) {
  return <Chip size="small" color={item.is_valid ? 'success' : 'warning'} label={item.is_valid ? 'Valid' : 'Needs attention'} />;
}

export function ReconciliationHistory({ items, currency, reviewDisabled, onReview }: Props) {
  return <>
    <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
      <Table size="small" aria-label="Reconciliation history">
        <TableHead><TableRow><TableCell>Statement date</TableCell><TableCell align="right">Bank balance</TableCell><TableCell align="right">MG5 balance</TableCell><TableCell align="right">Difference</TableCell><TableCell>Status</TableCell><TableCell>Reconciled at</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
        <TableBody>{items.map((item) => <TableRow key={item.id} hover>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateOnly(item.statement_date)}</TableCell>
          <TableCell align="right">{formatDecimalCurrency(item.entered_bank_balance, currency)}</TableCell>
          <TableCell align="right">{formatDecimalCurrency(item.calculated_balance, currency)}</TableCell>
          <TableCell align="right">{formatDecimalCurrency(item.difference, currency)}</TableCell>
          <TableCell><Status item={item} /></TableCell>
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.reconciled_at ? formatDateTime(item.reconciled_at) : '—'}</TableCell>
          <TableCell align="right"><Button size="small" disabled={reviewDisabled} onClick={() => onReview(item)}>Review this date</Button></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </TableContainer>
    <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }} aria-label="Reconciliation history mobile list">
      {items.map((item) => <Card key={item.id} variant="outlined" component="article"><CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Typography fontWeight={700}>{formatDateOnly(item.statement_date)}</Typography><Status item={item} /></Stack>
        <Stack spacing={0.5} mt={1.5}>
          <Typography variant="body2">Bank balance: {formatDecimalCurrency(item.entered_bank_balance, currency)}</Typography>
          <Typography variant="body2">MG5 balance: {formatDecimalCurrency(item.calculated_balance, currency)}</Typography>
          <Typography variant="body2">Difference: {formatDecimalCurrency(item.difference, currency)}</Typography>
          {item.reconciled_at && <Typography variant="body2" color="text.secondary">Reconciled {formatDateTime(item.reconciled_at)}</Typography>}
        </Stack>
        <Button size="small" sx={{ mt: 1.5 }} disabled={reviewDisabled} onClick={() => onReview(item)}>Review this date</Button>
      </CardContent></Card>)}
    </Stack>
  </>;
}
