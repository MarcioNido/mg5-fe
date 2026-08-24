'use client';

import FactCheckRounded from '@mui/icons-material/FactCheckRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAccounts } from '@/features/accounts/use-accounts';
import { useTenant } from '@/features/tenants/tenant-context';
import type { PaginationMeta } from '@/features/transactions/types';
import { ApiError } from '@/lib/api/error';
import { isAbortError, messageFromError } from '@/lib/api/ui-error';

import { MatchActionDialog, type MatchDialogSelection } from './match-action-dialog';
import { MatchReviewCard } from './match-review-card';
import { confirmMatchSuggestion, listMatchReviews, rejectMatchSuggestion } from './service';
import type { MatchReview, MatchReviewFilters } from './types';

export const initialMatchReviewFilters: MatchReviewFilters = { page: 1, perPage: 10, accountId: '' };

type Notice = { severity: 'success' | 'info'; message: string };

export function MatchingView() {
  const { selectedSlug } = useTenant();
  return <MatchingTenantView key={selectedSlug ?? 'no-tenant'} tenantSlug={selectedSlug} />;
}

function MatchingTenantView({ tenantSlug }: { tenantSlug: string | null }) {
  const { accounts, loading: accountsLoading, error: accountsError, retry: retryAccounts } = useAccounts(tenantSlug);
  const [draftAccountId, setDraftAccountId] = useState('');
  const [filters, setFilters] = useState(initialMatchReviewFilters);
  const [items, setItems] = useState<MatchReview[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(Boolean(tenantSlug));
  const [revalidating, setRevalidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState<MatchDialogSelection | null>(null);
  const [mutatingReviewId, setMutatingReviewId] = useState<number | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const lastQuery = useRef<string | null>(null);
  const mutationInFlight = useRef(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (!tenantSlug) return;
    const controller = new AbortController();
    const queryKey = `${tenantSlug}:${filters.page}:${filters.accountId}`;
    const isRevalidation = lastQuery.current === queryKey;
    lastQuery.current = queryKey;
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setError(null);
        if (!isRevalidation) { setItems([]); setMeta(null); setLoading(true); setRevalidating(false); }
      }
    });
    listMatchReviews(tenantSlug, filters, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        if (response.data.length === 0 && filters.page > 1 && response.meta.last_page < filters.page) {
          setFilters((current) => ({ ...current, page: Math.max(1, response.meta.last_page) }));
          return;
        }
        setItems(response.data); setMeta(response.meta); setError(null);
      })
      .catch((reason: unknown) => { if (!isAbortError(reason)) setError(messageFromError(reason, 'Unable to load matching reviews.')); })
      .finally(() => { if (!controller.signal.aborted) { setLoading(false); setRevalidating(false); } });
    return () => controller.abort();
  }, [tenantSlug, filters, attempt]);

  const refresh = useCallback(() => {
    setError(null);
    if (items.length === 0) setLoading(true);
    else setRevalidating(true);
    setAttempt((value) => value + 1);
  }, [items.length]);
  const applyFilter = () => setFilters({ ...initialMatchReviewFilters, accountId: draftAccountId });
  const clearFilter = () => { setDraftAccountId(''); setFilters(initialMatchReviewFilters); };
  const openAction = (review: MatchReview, candidate: MatchReview['candidates'][number], action: 'confirm' | 'reject') => {
    if (mutationInFlight.current) return;
    setMutationError(null); setSelection({ review, candidate, action });
  };
  const closeDialog = () => { if (mutatingReviewId === null) { setSelection(null); setMutationError(null); } };
  const focusHeading = () => setTimeout(() => headingRef.current?.focus(), 0);

  const finishResolvedReview = (reviewId: number) => {
    setItems((current) => current.filter((review) => review.id !== reviewId));
    if (items.length === 1 && filters.page > 1) setFilters((current) => ({ ...current, page: current.page - 1 }));
    else refresh();
  };

  const submitAction = async () => {
    if (!tenantSlug || !selection || mutationInFlight.current) return;
    const { review, candidate, action } = selection;
    const attemptedSelection = selection;
    mutationInFlight.current = true;
    setMutatingReviewId(review.id); setMutationError(null); setSelection(null);
    try {
      if (action === 'confirm') {
        await confirmMatchSuggestion(tenantSlug, candidate.suggestion_id);
        setNotice({ severity: 'success', message: 'Match confirmed. The manual transaction is now the definitive posted transaction.' });
        finishResolvedReview(review.id);
        focusHeading();
      } else {
        const { data } = await rejectMatchSuggestion(tenantSlug, candidate.suggestion_id);
        if (data.resolution === 'candidate_rejected') {
          setItems((current) => current.map((item) => item.id === review.id
            ? { ...item, candidates: item.candidates.filter((itemCandidate) => itemCandidate.suggestion_id !== candidate.suggestion_id) }
            : item));
          setNotice({ severity: 'success', message: 'Candidate rejected. Other possible matches remain for review.' });
          refresh();
          focusHeading();
        } else {
          setNotice({ severity: 'success', message: 'Candidate rejected. The imported bank transaction was kept as definitive.' });
          finishResolvedReview(review.id);
          focusHeading();
        }
      }
    } catch (reason: unknown) {
      if (reason instanceof ApiError && reason.status === 422) {
        setSelection(null);
        setNotice({ severity: 'info', message: 'This review changed and has been reloaded.' });
        refresh();
        focusHeading();
      } else {
        setMutationError(messageFromError(reason, `Unable to ${action} this candidate.`));
        setSelection(attemptedSelection);
      }
    } finally {
      mutationInFlight.current = false;
      setMutatingReviewId(null);
    }
  };

  return <Stack spacing={3}>
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap><Typography ref={headingRef} tabIndex={-1} variant="h4">Matching review</Typography>{meta && <Chip size="small" label={`${meta.total} total`} />}</Stack>
      <Typography color="text.secondary" mt={0.75}>Compare imported bank transactions with possible existing manual pending transactions, then confirm or reject each candidate.</Typography>
    </Box>

    {!tenantSlug && <Alert severity="info">Choose Personal or Clinic to review possible matches.</Alert>}
    {accountsError && <Alert severity="error" action={<Button color="inherit" onClick={retryAccounts}>Retry</Button>}>{accountsError} Matching reviews can still be loaded.</Alert>}

    <Paper component="form" variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }} onSubmit={(event) => { event.preventDefault(); applyFilter(); }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <TextField select size="small" label="Account filter" value={draftAccountId} onChange={(event) => setDraftAccountId(event.target.value)} disabled={!tenantSlug || accountsLoading || Boolean(accountsError)} sx={{ minWidth: 220 }}>
          <MenuItem value="">All accounts</MenuItem>{accounts.map((account) => <MenuItem value={String(account.id)} key={account.id}>{account.name}</MenuItem>)}
        </TextField>
        <Button type="submit" variant="contained" disabled={!tenantSlug || accountsLoading || Boolean(accountsError)}>Apply</Button>
        <Button type="button" onClick={clearFilter} disabled={!draftAccountId && !filters.accountId}>Clear</Button>
        {accountsLoading && <Typography role="status" variant="body2">Loading accounts…</Typography>}
      </Stack>
    </Paper>

    {error && <Alert severity="error" action={<Button color="inherit" onClick={refresh}>Retry</Button>}>{error}</Alert>}
    {loading && <Stack alignItems="center" py={8}><CircularProgress aria-label="Loading matching reviews" /></Stack>}
    {revalidating && !error && <Stack direction="row" spacing={1} alignItems="center" role="status" aria-live="polite"><CircularProgress size={18} /><Typography variant="body2" color="text.secondary">Refreshing matching reviews…</Typography></Stack>}
    {!loading && !revalidating && !error && tenantSlug && items.length === 0 && <Card variant="outlined"><CardContent><Stack alignItems="center" textAlign="center" py={6} spacing={1.5}><FactCheckRounded color="disabled" sx={{ fontSize: 48 }} /><Typography variant="h6">{filters.accountId ? 'No matching reviews for this account' : 'No matching reviews'}</Typography><Typography color="text.secondary">{filters.accountId ? 'Try another account or clear the filter.' : 'There are no ambiguous imported transactions waiting for a decision.'}</Typography>{filters.accountId && <Button onClick={clearFilter}>Clear filter</Button>}</Stack></CardContent></Card>}
    {!loading && !error && items.length > 0 && <Stack spacing={2}>{items.map((review) => <MatchReviewCard key={review.id} review={review} busy={mutatingReviewId === review.id} actionsDisabled={mutatingReviewId !== null} onAction={openAction} />)}</Stack>}
    {!loading && !error && meta && meta.last_page > 1 && <Stack alignItems="center"><Pagination aria-label="Matching review pages" page={meta.current_page} count={meta.last_page} onChange={(_, page) => setFilters((current) => ({ ...current, page }))} /></Stack>}

    <MatchActionDialog selection={selection} busy={mutatingReviewId !== null} error={mutationError} onClose={closeDialog} onSubmit={() => void submitAction()} />
    <Snackbar open={Boolean(notice)} autoHideDuration={7000} onClose={() => setNotice(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert role="status" aria-live="polite" severity={notice?.severity ?? 'success'} variant="filled" onClose={() => setNotice(null)}>{notice?.message}</Alert>
    </Snackbar>
  </Stack>;
}
