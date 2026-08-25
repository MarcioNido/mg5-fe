'use client';

import AccountBalanceRounded from '@mui/icons-material/AccountBalanceRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { accountTypeLabels } from '@/features/accounts/types';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useTenant } from '@/features/tenants/tenant-context';
import type { PaginationMeta } from '@/features/transactions/types';
import { ApiError } from '@/lib/api/error';
import type { LaravelValidationErrors } from '@/lib/api/types';
import { isAbortError, messageFromError } from '@/lib/api/ui-error';
import { formatDateOnly, formatDateTime, todayInBusinessTimezone } from '@/lib/format/date';
import { formatDecimalCurrency } from '@/lib/format/money';

import { ReconciliationHistory } from './reconciliation-history';
import { latestReconciliation, listReconciliations, previewReconciliation, storeReconciliation } from './service';
import type { Reconciliation, ReconciliationPreview } from './types';

export function validStatementDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
}

export function validBankBalance(value: string) {
  return /^-?\d{1,15}(?:\.\d{1,4})?$/.test(value);
}

export function differenceMeaning(value: string) {
  if (/^-?0+(?:\.0+)?$/.test(value)) return 'Balances agree.';
  return value.startsWith('-')
    ? 'The entered bank balance is lower than MG5.'
    : 'The entered bank balance is higher than MG5.';
}

export function ReconciliationView() {
  const { selectedSlug, loading } = useTenant();
  return <ReconciliationTenantView key={selectedSlug ?? 'no-tenant'} tenantSlug={selectedSlug} tenantLoading={loading} />;
}

function ReconciliationTenantView({ tenantSlug, tenantLoading }: { tenantSlug: string | null; tenantLoading: boolean }) {
  const { accounts, loading: accountsLoading, error: accountsError, retry: retryAccounts } = useAccounts(tenantSlug);
  const [accountId, setAccountId] = useState('');
  const [statementDate, setStatementDate] = useState(() => todayInBusinessTimezone());
  const [bankBalance, setBankBalance] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LaravelValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Reconciliation | null>(null);
  const [resultContext, setResultContext] = useState<{ accountId: number; statementDate: string; enteredBankBalance: string } | null>(null);
  const mutationInFlight = useRef(false);
  const mounted = useRef(true);

  const [preview, setPreview] = useState<ReconciliationPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRefreshing, setPreviewRefreshing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadedPreviewKey, setLoadedPreviewKey] = useState<string | null>(null);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const previewKey = useRef<string | null>(null);

  const [latest, setLatest] = useState<Reconciliation | null>(null);
  const [latestLoaded, setLatestLoaded] = useState(false);
  const [latestLoading, setLatestLoading] = useState(false);
  const [latestRefreshing, setLatestRefreshing] = useState(false);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [latestAttempt, setLatestAttempt] = useState(0);
  const latestKey = useRef<string | null>(null);

  const [history, setHistory] = useState<Reconciliation[]>([]);
  const [historyMeta, setHistoryMeta] = useState<PaginationMeta | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const historyKey = useRef<string | null>(null);

  const formRef = useRef<HTMLDivElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const selectedAccount = useMemo(() => accounts.find((account) => String(account.id) === accountId) ?? null, [accounts, accountId]);
  const dateValid = validStatementDate(statementDate);
  const balanceValid = validBankBalance(bankBalance);
  const currentPreviewMatches = Boolean(preview && selectedAccount && preview.statement_date === statementDate && loadedPreviewKey === `${tenantSlug}:${selectedAccount.id}:${statementDate}`);
  const displayedResult = result && resultContext && selectedAccount
    && resultContext.accountId === selectedAccount.id
    && resultContext.statementDate === statementDate
    && resultContext.enteredBankBalance === bankBalance
    ? result : null;

  const resetAccountSpecificState = useCallback((nextId: string) => {
    setAccountId(nextId); setStatementDate(todayInBusinessTimezone()); setBankBalance(''); setFieldErrors({}); setSubmitError(null); setResult(null); setResultContext(null);
    setHistoryPage(1);
    setPreview(null); setLoadedPreviewKey(null); setPreviewError(null); setPreviewLoading(false); setPreviewRefreshing(false);
    setLatest(null); setLatestLoaded(false); setLatestError(null); setLatestLoading(false); setLatestRefreshing(false);
    setHistory([]); setHistoryMeta(null); setHistoryError(null); setHistoryLoading(false); setHistoryRefreshing(false);
    previewKey.current = null; latestKey.current = null; historyKey.current = null;
  }, []);

  const selectStatementDate = useCallback((nextDate: string) => {
    setStatementDate(nextDate); setResult(null); setResultContext(null); setSubmitError(null);
    setFieldErrors((current) => ({ ...current, statement_date: [], preview: [] }));
    setPreview(null); setLoadedPreviewKey(null); setPreviewError(null); setPreviewLoading(false); setPreviewRefreshing(false);
    previewKey.current = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!accounts.length) return;
    if (accounts.some((account) => String(account.id) === accountId)) return;
    const fallbackId = String(accounts[0]!.id);
    queueMicrotask(() => resetAccountSpecificState(fallbackId));
  }, [accounts, accountId, resetAccountSpecificState]);

  useEffect(() => {
    if (!tenantSlug || !selectedAccount || !dateValid) {
      previewKey.current = null;
      queueMicrotask(() => { setPreview(null); setLoadedPreviewKey(null); setPreviewError(null); setPreviewLoading(false); setPreviewRefreshing(false); });
      return;
    }
    const controller = new AbortController();
    const key = `${tenantSlug}:${selectedAccount.id}:${statementDate}`;
    const retain = previewKey.current === key && preview !== null;
    previewKey.current = key;
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setPreviewError(null);
      if (retain) setPreviewRefreshing(true);
      else { setPreview(null); setPreviewLoading(true); setPreviewRefreshing(false); }
    });
    previewReconciliation(tenantSlug, selectedAccount.id, statementDate, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) { setPreview(data); setLoadedPreviewKey(key); setPreviewError(null); } })
      .catch((reason: unknown) => { if (!isAbortError(reason)) setPreviewError(messageFromError(reason, 'Unable to calculate the MG5 balance.')); })
      .finally(() => { if (!controller.signal.aborted) { setPreviewLoading(false); setPreviewRefreshing(false); } });
    return () => controller.abort();
  // preview is intentionally excluded: only the query identity controls this request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, selectedAccount?.id, statementDate, dateValid, previewAttempt]);

  useEffect(() => {
    if (!tenantSlug || !selectedAccount) return;
    const controller = new AbortController();
    const key = `${tenantSlug}:${selectedAccount.id}`;
    const retain = latestKey.current === key && latestLoaded;
    latestKey.current = key;
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLatestError(null);
      if (retain) setLatestRefreshing(true);
      else { setLatest(null); setLatestLoaded(false); setLatestLoading(true); setLatestRefreshing(false); }
    });
    latestReconciliation(tenantSlug, selectedAccount.id, controller.signal)
      .then(({ data }) => { if (!controller.signal.aborted) { setLatest(data); setLatestLoaded(true); } })
      .catch((reason: unknown) => { if (!isAbortError(reason)) setLatestError(messageFromError(reason, 'Unable to load the latest reconciliation.')); })
      .finally(() => { if (!controller.signal.aborted) { setLatestLoading(false); setLatestRefreshing(false); } });
    return () => controller.abort();
  // latestLoaded is intentionally excluded: only the query identity controls this request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, selectedAccount?.id, latestAttempt]);

  useEffect(() => {
    if (!tenantSlug || !selectedAccount) return;
    const controller = new AbortController();
    const key = `${tenantSlug}:${selectedAccount.id}:${historyPage}`;
    const retain = historyKey.current === key && historyMeta !== null;
    historyKey.current = key;
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setHistoryError(null);
      if (retain) setHistoryRefreshing(true);
      else { setHistory([]); setHistoryMeta(null); setHistoryLoading(true); setHistoryRefreshing(false); }
    });
    listReconciliations(tenantSlug, selectedAccount.id, historyPage, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        if (!response.data.length && historyPage > 1 && response.meta.last_page < historyPage) {
          setHistoryPage(Math.max(1, response.meta.last_page)); return;
        }
        setHistory(response.data); setHistoryMeta(response.meta);
      })
      .catch((reason: unknown) => { if (!isAbortError(reason)) setHistoryError(messageFromError(reason, 'Unable to load reconciliation history.')); })
      .finally(() => { if (!controller.signal.aborted) { setHistoryLoading(false); setHistoryRefreshing(false); } });
    return () => controller.abort();
  // historyMeta is intentionally excluded: only the query identity controls this request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, selectedAccount?.id, historyPage, historyAttempt]);

  const submit = async () => {
    if (!tenantSlug || !selectedAccount || mutationInFlight.current) return;
    const errors: LaravelValidationErrors = {};
    if (!dateValid) errors.statement_date = ['Enter a valid date.'];
    if (!bankBalance) errors.entered_bank_balance = ['Bank balance is required.'];
    else if (!balanceValid) errors.entered_bank_balance = ['Use a signed decimal with up to 15 integer digits and four decimal places. Do not include commas or currency symbols.'];
    if (!currentPreviewMatches) errors.preview = ['Wait for a successful MG5 balance preview before saving.'];
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    mutationInFlight.current = true; setSubmitting(true); setFieldErrors({}); setSubmitError(null);
    const submittedAccountId = selectedAccount.id;
    const submittedStatementDate = statementDate;
    const submittedBankBalance = bankBalance;
    try {
      const { data } = await storeReconciliation(tenantSlug, submittedAccountId, { statement_date: submittedStatementDate, entered_bank_balance: submittedBankBalance });
      if (!mounted.current) return;
      setResult(data); setResultContext({ accountId: submittedAccountId, statementDate: submittedStatementDate, enteredBankBalance: submittedBankBalance }); setHistoryPage(1);
      setPreviewAttempt((value) => value + 1); setLatestAttempt((value) => value + 1); setHistoryAttempt((value) => value + 1);
      setTimeout(() => resultRef.current?.focus(), 0);
    } catch (reason: unknown) {
      if (!mounted.current || isAbortError(reason)) return;
      if (reason instanceof ApiError && reason.status === 422) setFieldErrors(reason.validationErrors ?? {});
      setSubmitError(messageFromError(reason, 'Unable to save this reconciliation.'));
    } finally {
      mutationInFlight.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  const reviewDate = (item: Reconciliation) => {
    if (mutationInFlight.current) return;
    const replacingDraft = bankBalance !== '' && (statementDate !== item.statement_date || bankBalance !== item.entered_bank_balance);
    if (replacingDraft && !window.confirm('Replace the unsaved reconciliation values with this history row?')) return;
    selectStatementDate(item.statement_date); setBankBalance(item.entered_bank_balance); setFieldErrors({});
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => dateInputRef.current?.focus(), 0);
  };

  const retryPreview = () => setPreviewAttempt((value) => value + 1);
  const retryLatest = () => setLatestAttempt((value) => value + 1);
  const retryHistory = () => setHistoryAttempt((value) => value + 1);

  return <Stack spacing={3}>
    <Box><Typography variant="h4">Bank reconciliation</Typography><Typography color="text.secondary" mt={0.75}>Confirm that MG5 posted cash agrees with the balance shown by your bank. This does not close an accounting period or clear individual transactions.</Typography></Box>
    {tenantLoading && <Stack direction="row" spacing={1} alignItems="center" role="status"><CircularProgress size={18} /><Typography>Loading financial profiles…</Typography></Stack>}
    {!tenantLoading && !tenantSlug && <Alert severity="info">Choose Personal or Clinic to reconcile an account.</Alert>}
    {accountsError && <Alert severity="error" action={<Button color="inherit" onClick={retryAccounts}>Retry</Button>}>{accountsError}</Alert>}
    {accountsLoading && <Stack direction="row" spacing={1} alignItems="center" role="status"><CircularProgress size={18} /><Typography>Loading accounts…</Typography></Stack>}
    {!accountsLoading && !accountsError && tenantSlug && accounts.length === 0 && <Card variant="outlined"><CardContent><Stack alignItems="center" textAlign="center" py={5} spacing={1.5}><AccountBalanceRounded color="disabled" sx={{ fontSize: 48 }} /><Typography variant="h6">Add an account before reconciling</Typography><Typography color="text.secondary">Reconciliation compares an observed bank balance with one MG5 account.</Typography><Button component={Link} href="/dashboard/accounts" variant="contained">Go to Accounts</Button></Stack></CardContent></Card>}

    {selectedAccount && <>
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
          <TextField select size="small" label="Account" value={accountId} onChange={(event) => resetAccountSpecificState(event.target.value)} disabled={submitting} sx={{ minWidth: { md: 300 } }}>
            {accounts.map((account) => <MenuItem value={String(account.id)} key={account.id}>{account.name} · {accountTypeLabels[account.type]} · {account.currency}</MenuItem>)}
          </TextField>
          <Box><Typography fontWeight={700}>{selectedAccount.name}</Typography><Typography variant="body2" color="text.secondary">{accountTypeLabels[selectedAccount.type]} · {selectedAccount.currency}{selectedAccount.opening_balance_date ? ` · Opening checkpoint ${formatDateOnly(selectedAccount.opening_balance_date)}` : ''}</Typography></Box>
        </Stack>
      </Paper>

      <Card variant="outlined" component="section" aria-labelledby="latest-heading"><CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Typography id="latest-heading" variant="h6">Latest reconciled-through date</Typography>{latestRefreshing && <CircularProgress size={18} aria-label="Refreshing latest reconciliation" />}</Stack>
        {latestLoading && <Stack direction="row" spacing={1} alignItems="center" role="status" mt={1.5}><CircularProgress size={18} /><Typography variant="body2">Loading latest reconciliation…</Typography></Stack>}
        {latestError && <Alert severity="error" sx={{ mt: 1.5 }} action={<Button color="inherit" onClick={retryLatest}>Retry</Button>}>{latestError}</Alert>}
        {latestLoaded && !latest && <Typography mt={1.5} fontWeight={700}>Not reconciled yet</Typography>}
        {latest && <Stack mt={1.5} spacing={0.5}><Typography fontWeight={700}>{formatDateOnly(latest.statement_date)}</Typography><Typography variant="body2">Bank and MG5 balance: {formatDecimalCurrency(latest.entered_bank_balance, selectedAccount.currency)}</Typography>{latest.reconciled_at && <Typography variant="body2" color="text.secondary">Confirmed {formatDateTime(latest.reconciled_at)}</Typography>}</Stack>}
      </CardContent></Card>

      <Paper ref={formRef} component="section" variant="outlined" sx={{ p: { xs: 2, md: 3 }, scrollMarginTop: 16 }} aria-labelledby="reconcile-heading">
        <Typography id="reconcile-heading" variant="h5">Confirm a bank balance</Typography>
        <Stack spacing={2.5} mt={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField inputRef={dateInputRef} required label="Statement date" type="date" value={statementDate} disabled={submitting} onChange={(event) => selectStatementDate(event.target.value)} error={Boolean(fieldErrors.statement_date?.[0])} helperText={fieldErrors.statement_date?.[0]} InputLabelProps={{ shrink: true }} sx={{ minWidth: 210 }} />
            <TextField required label="Bank balance" value={bankBalance} disabled={submitting} onChange={(event) => { setBankBalance(event.target.value); setResult(null); setResultContext(null); setSubmitError(null); setFieldErrors((current) => ({ ...current, entered_bank_balance: [] })); }} onBlur={() => { if (!bankBalance) setFieldErrors((current) => ({ ...current, entered_bank_balance: ['Bank balance is required.'] })); else if (!balanceValid) setFieldErrors((current) => ({ ...current, entered_bank_balance: ['Use a signed decimal with up to 15 integer digits and four decimal places. Do not include commas or currency symbols.'] })); }} error={Boolean(fieldErrors.entered_bank_balance?.[0])} helperText={fieldErrors.entered_bank_balance?.[0] ?? 'Enter it exactly as shown by the bank, without commas or a currency symbol.'} inputProps={{ inputMode: 'decimal' }} fullWidth />
          </Stack>

          <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}><CardContent>
            <Typography variant="overline" color="text.secondary">MG5 calculated balance</Typography>
            {previewLoading && <Stack direction="row" spacing={1} alignItems="center" role="status"><CircularProgress size={18} /><Typography>Calculating balance…</Typography></Stack>}
            {!previewLoading && (!dateValid || !selectedAccount) && <Typography color="text.secondary">Choose an account and enter a complete valid date.</Typography>}
            {previewError && <Alert severity="error" action={<Button color="inherit" onClick={retryPreview}>Retry</Button>}>{previewError}</Alert>}
            {preview && <><Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap><Typography variant="h5">{formatDecimalCurrency(preview.calculated_balance, selectedAccount.currency)}</Typography>{previewRefreshing && <CircularProgress size={18} aria-label="Refreshing calculated balance" />}</Stack><Typography variant="body2" color="text.secondary" mt={0.5}>For {formatDateOnly(preview.statement_date)}. Includes the opening checkpoint and posted transactions through this date.</Typography></>}
          </CardContent></Card>
          {fieldErrors.preview?.[0] && <Alert severity="warning">{fieldErrors.preview[0]}</Alert>}
          {submitError && <Alert severity="error" aria-live="assertive">{submitError}</Alert>}
          <Box><Button variant="contained" onClick={() => void submit()} disabled={!tenantSlug || !dateValid || !balanceValid || !currentPreviewMatches || submitting} startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : undefined}>{submitting ? 'Saving reconciliation…' : 'Save comparison'}</Button></Box>
        </Stack>
      </Paper>

      {displayedResult && <Card ref={resultRef} tabIndex={-1} variant="outlined" component="section" aria-live="polite" sx={{ borderColor: displayedResult.is_valid ? 'success.main' : 'warning.main', borderWidth: 2 }}><CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Typography variant="h5">{displayedResult.is_valid ? 'Balances agree' : 'Balances do not agree'}</Typography><Chip label={displayedResult.is_valid ? 'Valid' : 'Needs attention'} color={displayedResult.is_valid ? 'success' : 'warning'} /></Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.5, sm: 3 }} mt={2}><Typography>Bank: <strong>{formatDecimalCurrency(displayedResult.entered_bank_balance, selectedAccount.currency)}</strong></Typography><Typography>MG5: <strong>{formatDecimalCurrency(displayedResult.calculated_balance, selectedAccount.currency)}</strong></Typography><Typography>Difference: <strong>{formatDecimalCurrency(displayedResult.difference, selectedAccount.currency)}</strong></Typography></Stack>
        <Typography mt={1.5}>{displayedResult.is_valid ? `This account is reconciled through ${formatDateOnly(displayedResult.statement_date)}.` : differenceMeaning(displayedResult.difference)}</Typography>
        {displayedResult.is_valid && displayedResult.reconciled_at && <Typography variant="body2" color="text.secondary" mt={0.5}>Reconciled {formatDateTime(displayedResult.reconciled_at)}</Typography>}
        {!displayedResult.is_valid && <><Typography variant="body2" color="text.secondary" mt={0.5}>Check for missing, duplicate, incorrectly dated, or incorrectly posted transactions. MG5 will not create an automatic balancing adjustment.</Typography><Button component={Link} href="/dashboard/transactions" sx={{ mt: 1 }}>Review transactions</Button></>}
      </CardContent></Card>}

      <Paper component="section" variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }} aria-labelledby="history-heading">
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Stack direction="row" spacing={1} alignItems="center"><Typography id="history-heading" variant="h5">History</Typography>{historyMeta && <Chip size="small" label={`${historyMeta.total} total`} />}</Stack>{historyRefreshing && <Stack direction="row" spacing={1} alignItems="center" role="status"><CircularProgress size={18} /><Typography variant="body2">Refreshing history…</Typography></Stack>}</Stack>
        <Divider sx={{ my: 2 }} />
        {historyLoading && <Stack alignItems="center" py={5}><CircularProgress aria-label="Loading reconciliation history" /></Stack>}
        {historyError && <Alert severity="error" action={<Button color="inherit" onClick={retryHistory}>Retry</Button>}>{historyError}</Alert>}
        {!historyLoading && historyMeta && history.length === 0 && <Stack textAlign="center" py={5} spacing={1}><Typography variant="h6">No reconciliation history</Typography><Typography color="text.secondary">Save a bank balance comparison to begin this account’s history.</Typography></Stack>}
        {history.length > 0 && <ReconciliationHistory items={history} currency={selectedAccount.currency} reviewDisabled={submitting} onReview={reviewDate} />}
        {historyMeta && historyMeta.last_page > 1 && <Stack alignItems="center" mt={3}><Pagination aria-label="Reconciliation history pages" page={historyMeta.current_page} count={historyMeta.last_page} onChange={(_, page) => setHistoryPage(page)} /></Stack>}
      </Paper>
    </>}
  </Stack>;
}
