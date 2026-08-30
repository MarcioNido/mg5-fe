'use client';

import EditRounded from '@mui/icons-material/EditRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
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
  bulkSelectedIds?: ReadonlySet<number>;
  onBulkSelectionChange?: (transactionId: number, checked: boolean) => void;
  onBulkPageSelectionChange?: (transactionIds: number[], checked: boolean) => void;
};

function categoryLabel(transaction: Transaction, categories: Category[]) {
  if (transaction.splits.length) return `Split into ${transaction.splits.length} categories`;
  return categoryPath(transaction.category, categories);
}

function StatusOrigin({ transaction }: { transaction: Transaction }) {
  return <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>{transaction.is_ignored && <Chip size="small" label="Ignored" color="default" />}<Chip size="small" label={transactionStatusLabels[transaction.status]} color={transaction.status === 'posted' ? 'success' : 'warning'} /><Chip size="small" variant="outlined" label={transactionOriginLabels[transaction.origin]} /></Stack>;
}

export function TransactionList({ items, categories, onEdit, reviewedIds, onReviewedChange, bulkSelectedIds, onBulkSelectionChange, onBulkPageSelectionChange }: Props) {
  const checklist = Boolean(reviewedIds && onReviewedChange);
  const bulkSelection = Boolean(bulkSelectedIds && onBulkSelectionChange && onBulkPageSelectionChange);
  const eligiblePageIds = items.filter((transaction) => !transaction.is_ignored && transaction.splits.length === 0).map((transaction) => transaction.id);
  const pageSelected = eligiblePageIds.length > 0 && eligiblePageIds.every((id) => bulkSelectedIds?.has(id));
  const pagePartiallySelected = !pageSelected && eligiblePageIds.some((id) => bulkSelectedIds?.has(id));

  return <>
    <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
      <Table size="small" aria-label="Transactions">
        <TableHead><TableRow>{checklist && <TableCell padding="checkbox">Checked</TableCell>}{bulkSelection && <TableCell padding="checkbox"><Checkbox checked={pageSelected} indeterminate={pagePartiallySelected} disabled={eligiblePageIds.length === 0} onChange={(event) => onBulkPageSelectionChange!(eligiblePageIds, event.target.checked)} inputProps={{ 'aria-label': 'Select all eligible transactions on this page' }} /></TableCell>}<TableCell>Date</TableCell><TableCell>Description</TableCell><TableCell>Account</TableCell><TableCell>Category</TableCell><TableCell>Status / Origin</TableCell><TableCell align="right">Amount</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
        <TableBody>{items.map((transaction) => <TableRow key={transaction.id} hover selected={reviewedIds?.has(transaction.id) || bulkSelectedIds?.has(transaction.id)} sx={transaction.is_ignored ? { opacity: 0.65 } : undefined}>
          {checklist && <TableCell padding="checkbox"><Checkbox disabled={transaction.is_ignored} checked={!transaction.is_ignored && reviewedIds!.has(transaction.id)} onChange={(event) => onReviewedChange!(transaction.id, event.target.checked)} inputProps={{ 'aria-label': `Checked against statement: ${transaction.description}` }} /></TableCell>}
          {bulkSelection && <TableCell padding="checkbox"><Checkbox disabled={transaction.is_ignored || transaction.splits.length > 0} checked={bulkSelectedIds!.has(transaction.id)} onChange={(event) => onBulkSelectionChange!(transaction.id, event.target.checked)} inputProps={{ 'aria-label': `Select transaction: ${transaction.description}` }} /></TableCell>}
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
      {bulkSelection && <FormControlLabel control={<Checkbox checked={pageSelected} indeterminate={pagePartiallySelected} disabled={eligiblePageIds.length === 0} onChange={(event) => onBulkPageSelectionChange!(eligiblePageIds, event.target.checked)} />} label="Select all eligible transactions on this page" />}
      {items.map((transaction) => <Card key={transaction.id} variant="outlined" sx={{ ...((reviewedIds?.has(transaction.id) || bulkSelectedIds?.has(transaction.id)) ? { bgcolor: 'action.selected' } : {}), ...(transaction.is_ignored ? { opacity: 0.65 } : {}) }}><CardContent>
        <Stack direction="row" justifyContent="space-between" gap={2}>{checklist && <Checkbox disabled={transaction.is_ignored} checked={!transaction.is_ignored && reviewedIds!.has(transaction.id)} onChange={(event) => onReviewedChange!(transaction.id, event.target.checked)} inputProps={{ 'aria-label': `Checked against statement: ${transaction.description}` }} sx={{ alignSelf: 'flex-start', p: 0.5 }} />}{bulkSelection && <Checkbox disabled={transaction.is_ignored || transaction.splits.length > 0} checked={bulkSelectedIds!.has(transaction.id)} onChange={(event) => onBulkSelectionChange!(transaction.id, event.target.checked)} inputProps={{ 'aria-label': `Select transaction: ${transaction.description}` }} sx={{ alignSelf: 'flex-start', p: 0.5 }} />}<Box minWidth={0} flex={1}><Typography fontWeight={700}>{transaction.description}</Typography><Typography variant="body2" color="text.secondary">{formatDateOnly(transaction.transaction_date)} · {transaction.account.name}</Typography></Box><Typography fontWeight={700} whiteSpace="nowrap" sx={{ textDecoration: transaction.is_ignored ? 'line-through' : undefined }}>{formatDecimalCurrency(transaction.amount, transaction.account.currency)}</Typography></Stack>
        {transaction.notes && <Typography variant="body2" color="text.secondary" noWrap mt={1}>{transaction.notes}</Typography>}
        <Typography variant="body2" mt={1}>{categoryLabel(transaction, categories)}</Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}><StatusOrigin transaction={transaction} /><Button size="small" startIcon={<EditRounded />} onClick={() => onEdit(transaction)}>Edit</Button></Stack>
      </CardContent></Card>)}
    </Stack>
  </>;
}
