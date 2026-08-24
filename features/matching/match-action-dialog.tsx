'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatDateOnly } from '@/lib/format/date';
import { formatDecimalCurrency } from '@/lib/format/money';

import type { MatchCandidate, MatchReview } from './types';

export type MatchDialogSelection = { review: MatchReview; candidate: MatchCandidate; action: 'confirm' | 'reject' };

export function MatchActionDialog({ selection, busy, error, onClose, onSubmit }: { selection: MatchDialogSelection | null; busy: boolean; error: string | null; onClose: () => void; onSubmit: () => void }) {
  if (!selection) return null;
  const { review, candidate, action } = selection;
  const imported = `${review.imported_transaction.description}, ${formatDateOnly(review.imported_transaction.transaction_date)}, ${formatDecimalCurrency(review.imported_transaction.amount, review.account.currency)}`;
  const manual = `${candidate.transaction.description}, ${formatDateOnly(candidate.transaction.transaction_date)}, ${formatDecimalCurrency(candidate.transaction.amount, review.account.currency)}`;
  return <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-describedby="match-action-consequence">
    <DialogTitle>{action === 'confirm' ? 'Confirm this match?' : 'Reject this candidate?'}</DialogTitle>
    <DialogContent>
      <Stack spacing={2}>
        <Typography><strong>Imported transaction:</strong> {imported}</Typography>
        <Typography><strong>Manual candidate:</strong> {manual}</Typography>
        {action === 'confirm' ? <Typography id="match-action-consequence">The selected manual transaction will become the definitive posted, import-linked transaction. Its manual description, notes, category, and splits are preserved. The temporary imported transaction is removed, while other manual candidates remain independent pending transactions.</Typography>
          : <Typography id="match-action-consequence">Only this candidate will be rejected. If it is the last candidate, the imported bank transaction will be kept as the definitive transaction.</Typography>}
        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </DialogContent>
    <DialogActions><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="contained" color={action === 'reject' ? 'error' : 'primary'} onClick={onSubmit} disabled={busy}>{busy && <CircularProgress size={18} sx={{ mr: 1 }} />}{action === 'confirm' ? 'Confirm match' : 'Reject candidate'}</Button></DialogActions>
  </Dialog>;
}
