'use client';

import EditRounded from '@mui/icons-material/EditRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { formatDateOnly } from '@/lib/format/date';
import { formatDecimalCurrency } from '@/lib/format/money';

import { categoryPath } from './category-options';
import type { Category, Transaction } from './types';
import { transactionOriginLabels, transactionStatusLabels } from './types';

type Props = {
  items: Transaction[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
  reviewedIds?: ReadonlySet<number>;
  onReviewedChange?: (transactionId: number, checked: boolean) => void;
};

function categoryLabel(transaction: Transaction, categories: Category[]) {
  if (transaction.splits.length) return `Split into ${transaction.splits.length} categories`;
  return categoryPath(transaction.category, categories);
}

function StatusOrigin({ transaction }: { transaction: Transaction }) {
  return <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>{transaction.is_ignored && <Chip size="small" label="Ignored" color="default" />}<Chip size="small" label={transactionStatusLabels[transaction.status]} color={transaction.status === 'posted' ? 'success' : 'warning'} /><Chip size="small" variant="outlined" label={transactionOriginLabels[transaction.origin]} /></Stack>;
}

export function TransactionList({ items, categories, onEdit, reviewedIds, onReviewedChange }: Props) {
  const checklist = Boolean(reviewedIds && onReviewedChange);

  return <>
    <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
      <Table size="small" aria-label="Transactions">
        <TableHead><TableRow>{checklist && <TableCell padding="checkbox">Checked</TableCell>}<TableCell>Date</TableCell><TableCell>Description</TableCell><TableCell>Account</TableCell><TableCell>Category</TableCell><TableCell>Status / Origin</TableCell><TableCell align="right">Amount</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
        <TableBody>{items.map((transaction) => <TableRow key={transaction.id} hover selected={reviewedIds?.has(transaction.id)} sx={transaction.is_ignored ? { opacity: 0.65 } : undefined}>
          {checklist && <TableCell padding="checkbox"><Checkbox disabled={transaction.is_ignored} checked={!transaction.is_ignored && reviewedIds!.has(transaction.id)} onChange={(event) => onReviewedChange!(transaction.id, event.target.checked)} inputProps={{ 'aria-label': `Checked against statement: ${transaction.description}` }} /></TableCell>}
          <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateOnly(transaction.transaction_date)}</TableCell>
          <TableCell sx={{ maxWidth: 260 }}><Typography variant="body2" fontWeight={600}>{transaction.description}</Typography>{transaction.notes && <Typography variant="caption" color="text.secondary" display="block" noWrap>{transaction.notes}</Typography>}</TableCell>
          <TableCell>{transaction.account.name}</TableCell><TableCell>{categoryLabel(transaction, categories)}</TableCell>
          <TableCell><StatusOrigin transaction={transaction} /></TableCell>
          <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 700, textDecoration: transaction.is_ignored ? 'line-through' : undefined }}>{formatDecimalCurrency(transaction.amount, transaction.account.currency)}</TableCell>
          <TableCell align="right"><IconButton aria-label={`Edit ${transaction.description}`} onClick={() => onEdit(transaction)}><EditRounded /></IconButton></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </TableContainer>
    <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }} aria-label="Transactions mobile list">
      {items.map((transaction) => <Card key={transaction.id} variant="outlined" sx={{ ...(reviewedIds?.has(transaction.id) ? { bgcolor: 'action.selected' } : {}), ...(transaction.is_ignored ? { opacity: 0.65 } : {}) }}><CardContent>
        <Stack direction="row" justifyContent="space-between" gap={2}>{checklist && <Checkbox disabled={transaction.is_ignored} checked={!transaction.is_ignored && reviewedIds!.has(transaction.id)} onChange={(event) => onReviewedChange!(transaction.id, event.target.checked)} inputProps={{ 'aria-label': `Checked against statement: ${transaction.description}` }} sx={{ alignSelf: 'flex-start', p: 0.5 }} />}<Box minWidth={0} flex={1}><Typography fontWeight={700}>{transaction.description}</Typography><Typography variant="body2" color="text.secondary">{formatDateOnly(transaction.transaction_date)} · {transaction.account.name}</Typography></Box><Typography fontWeight={700} whiteSpace="nowrap" sx={{ textDecoration: transaction.is_ignored ? 'line-through' : undefined }}>{formatDecimalCurrency(transaction.amount, transaction.account.currency)}</Typography></Stack>
        {transaction.notes && <Typography variant="body2" color="text.secondary" noWrap mt={1}>{transaction.notes}</Typography>}
        <Typography variant="body2" mt={1}>{categoryLabel(transaction, categories)}</Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}><StatusOrigin transaction={transaction} /><Button size="small" startIcon={<EditRounded />} onClick={() => onEdit(transaction)}>Edit</Button></Stack>
      </CardContent></Card>)}
    </Stack>
  </>;
}
