import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatDateOnly } from '@/lib/format/date';
import { formatDecimalCurrency } from '@/lib/format/money';

import type { MatchCandidate, MatchReview, MatchReviewTransaction } from './types';

type Action = 'confirm' | 'reject';
type Props = { review: MatchReview; busy: boolean; actionsDisabled: boolean; onAction: (review: MatchReview, candidate: MatchCandidate, action: Action) => void };

function categoryLabel(transaction: MatchReviewTransaction) {
  if (!transaction.category) return 'Uncategorized';
  return transaction.category.parent
    ? `${transaction.category.parent.name} › ${transaction.category.name}`
    : transaction.category.name;
}

function splitSignature(transaction: MatchReviewTransaction) {
  return transaction.splits.map((split) => `${split.category?.parent?.name ?? ''}|${split.category?.name ?? 'Uncategorized'}|${split.amount}|${split.description ?? ''}`).join('||');
}

function differenceMap(imported: MatchReviewTransaction, candidate: MatchReviewTransaction) {
  return {
    date: imported.transaction_date !== candidate.transaction_date,
    amount: imported.amount !== candidate.amount,
    description: imported.description !== candidate.description,
    notes: (imported.notes ?? '') !== (candidate.notes ?? ''),
    category: categoryLabel(imported) !== categoryLabel(candidate) || splitSignature(imported) !== splitSignature(candidate),
  };
}

function DetailRow({ label, different, children }: { label: string; different?: boolean; children: React.ReactNode }) {
  return <Box sx={{ borderLeft: different ? '3px solid' : '3px solid transparent', borderColor: different ? 'warning.main' : 'transparent', pl: 1.25, py: 0.35 }}>
    <Stack direction="row" gap={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 76 }}>{label}</Typography>
      <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{children}</Typography>
      {different && <Chip size="small" variant="outlined" color="warning" label="Different" />}
    </Stack>
  </Box>;
}

function TransactionDetails({ transaction, currency, differences = {} }: { transaction: MatchReviewTransaction; currency: string; differences?: Partial<Record<'date' | 'amount' | 'description' | 'notes' | 'category', boolean>> }) {
  return <Stack spacing={0.5}>
    <DetailRow label="Date" different={differences.date}>{formatDateOnly(transaction.transaction_date)}</DetailRow>
    <DetailRow label="Amount" different={differences.amount}>{formatDecimalCurrency(transaction.amount, currency)}</DetailRow>
    <DetailRow label="Description" different={differences.description}>{transaction.description}</DetailRow>
    <DetailRow label="Notes" different={differences.notes}>{transaction.notes || 'None'}</DetailRow>
    <DetailRow label="Category" different={differences.category}>{transaction.splits.length ? `Split into ${transaction.splits.length} categories` : categoryLabel(transaction)}</DetailRow>
    {transaction.splits.length > 0 && <Box component="ul" sx={{ my: 0, pl: 4.5 }} aria-label="Transaction splits">
      {transaction.splits.map((split) => <Typography component="li" variant="body2" key={split.id}>
        {split.category?.parent ? `${split.category.parent.name} › ` : ''}{split.category?.name ?? 'Uncategorized'} · {formatDecimalCurrency(split.amount, currency)}{split.description ? ` · ${split.description}` : ''}
      </Typography>)}
    </Box>}
    <DetailRow label="Status / origin">{transaction.status === 'posted' ? 'Posted' : 'Pending'} · {transaction.origin === 'csv' ? 'Imported' : transaction.origin === 'manual' ? 'Manual' : 'System'}</DetailRow>
  </Stack>;
}

function confidenceLabel(value: string) {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return value;
  return `${new Intl.NumberFormat('en-CA', { style: 'percent', maximumFractionDigits: 2 }).format(Number(value))} confidence`;
}

export function MatchReviewCard({ review, busy, actionsDisabled, onAction }: Props) {
  return <Card variant="outlined" component="article" aria-labelledby={`review-${review.id}-title`}>
    <CardContent sx={{ p: { xs: 2, md: 3 }, '&:last-child': { pb: { xs: 2, md: 3 } } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1} mb={2}>
        <Box><Typography id={`review-${review.id}-title`} variant="h6">{review.account.name}</Typography><Typography variant="body2" color="text.secondary">{review.import.source_name} · {review.import.original_filename ?? 'Imported CSV'}{review.line_number ? ` · CSV line ${review.line_number}` : ''}</Typography></Box>
        <Stack direction="row" gap={1} alignItems="center"><Typography fontWeight={700}>{formatDateOnly(review.imported_transaction.transaction_date)}</Typography><Typography fontWeight={800}>{formatDecimalCurrency(review.imported_transaction.amount, review.account.currency)}</Typography></Stack>
      </Stack>
      <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: { xs: 1.5, md: 2 } }}>
        <Typography variant="subtitle2" mb={1}>Imported bank transaction</Typography>
        <TransactionDetails transaction={review.imported_transaction} currency={review.account.currency} />
      </Box>
      <Divider sx={{ my: 2.5 }} />
      <Typography variant="subtitle1" fontWeight={700}>{review.candidates.length} possible {review.candidates.length === 1 ? 'match' : 'matches'}</Typography>
      <Stack spacing={2} mt={1.5}>
        {review.candidates.map((candidate, index) => {
          const differences = differenceMap(review.imported_transaction, candidate.transaction);
          return <Box key={candidate.suggestion_id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: { xs: 1.5, md: 2 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1} mb={1}>
              <Typography variant="subtitle2">Existing manual pending transaction {index + 1}</Typography>
              <Typography variant="body2" color="text.secondary">{confidenceLabel(candidate.confidence)} · supporting information only</Typography>
            </Stack>
            <TransactionDetails transaction={candidate.transaction} currency={review.account.currency} differences={differences} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mt={2} justifyContent="flex-end">
              <Button variant="contained" disabled={actionsDisabled} onClick={() => onAction(review, candidate, 'confirm')} aria-label={`Confirm match for ${candidate.transaction.description}`}>Confirm match</Button>
              <Button variant="outlined" color="error" disabled={actionsDisabled} onClick={() => onAction(review, candidate, 'reject')} aria-label={`Reject candidate ${candidate.transaction.description}`}>Reject candidate</Button>
            </Stack>
          </Box>;
        })}
      </Stack>
      {busy && <Typography role="status" variant="body2" mt={2}>Updating this review…</Typography>}
    </CardContent>
  </Card>;
}
