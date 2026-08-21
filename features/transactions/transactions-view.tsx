'use client';

import AddRounded from '@mui/icons-material/AddRounded';
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Pagination from '@mui/material/Pagination';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAccounts } from '@/features/accounts/use-accounts';
import { useTenant } from '@/features/tenants/tenant-context';
import { isAbortError, messageFromError } from '@/lib/api/ui-error';

import { buildCategoryOptions } from './category-options';
import { listTransactions } from './service';
import { TransactionFilters } from './transaction-filters';
import { TransactionFormDialog } from './transaction-form-dialog';
import { TransactionList } from './transaction-list';
import type { PaginationMeta, Transaction, TransactionFilters as Filters } from './types';
import { useCategories } from './use-categories';

export const initialTransactionFilters: Filters = { page: 1, perPage: 25, accountId: '', status: '', origin: '', categoryId: '', uncategorized: false, dateFrom: '', dateTo: '', search: '' };

function hasFilters(filters: Filters) {
  return Boolean(filters.accountId || filters.status || filters.origin || filters.categoryId || filters.uncategorized || filters.dateFrom || filters.dateTo || filters.search.trim());
}

export function TransactionsView() {
  const { selectedSlug } = useTenant();
  return <TransactionsTenantView key={selectedSlug ?? 'no-tenant'} tenantSlug={selectedSlug} />;
}

function TransactionsTenantView({ tenantSlug }: { tenantSlug: string | null }) {
  const { accounts, loading: accountsLoading, error: accountsError, retry: retryAccounts } = useAccounts(tenantSlug);
  const { categories, loading: categoriesLoading, error: categoriesError, retry: retryCategories } = useCategories(tenantSlug);
  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);
  const [applied, setApplied] = useState<Filters>(initialTransactionFilters);
  const [draft, setDraft] = useState<Filters>(initialTransactionFilters);
  const [items, setItems] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [dateError, setDateError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantSlug) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) { setItems([]); setMeta(null); setError(null); setLoading(true); }
    });
    listTransactions(tenantSlug, applied, controller.signal)
      .then((response) => { if (!controller.signal.aborted) { setItems(response.data); setMeta(response.meta); setError(null); } })
      .catch((reason: unknown) => { if (!isAbortError(reason)) setError(messageFromError(reason, 'Unable to load transactions.')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tenantSlug, applied, attempt]);

  const refresh = useCallback(() => setAttempt((value) => value + 1), []);
  const clear = () => { setDateError(null); setDraft(initialTransactionFilters); setApplied(initialTransactionFilters); };
  const apply = () => {
    if (draft.dateFrom && draft.dateTo && draft.dateTo < draft.dateFrom) { setDateError('Date to must be on or after Date from.'); return; }
    setDateError(null);
    const next = { ...draft, page: 1, search: draft.search.trim() };
    setDraft(next); setApplied(next);
  };
  const reviewUncategorized = () => {
    const next = { ...initialTransactionFilters, uncategorized: true };
    setDateError(null); setDraft(next); setApplied(next);
  };
  const openCreate = () => { setSelected(null); setFormOpen(true); };
  const openEdit = (transaction: Transaction) => { setSelected(transaction); setFormOpen(true); };
  const mutationSaved = (message: string) => {
    setNotice(message);
    if (message === 'Transaction deleted.' && items.length === 1 && applied.page > 1) {
      const next = { ...applied, page: applied.page - 1 };
      setApplied(next); setDraft((current) => ({ ...current, page: next.page }));
    } else refresh();
  };

  return <Stack spacing={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2}>
      <Box><Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap><Typography variant="h4">Transactions</Typography>{meta && <Chip label={`${meta.total} total`} size="small" />}</Stack><Typography color="text.secondary" mt={0.75}>Review posted and pending activity, and keep every transaction categorized. Pending items do not affect confirmed bank cash.</Typography></Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button variant="outlined" onClick={reviewUncategorized}>Review uncategorized</Button><Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} disabled={!tenantSlug || accountsLoading || Boolean(accountsError) || accounts.length === 0}>Add transaction</Button></Stack>
    </Stack>

    {!tenantSlug && <Alert severity="info">Choose Personal or Clinic to view its transactions.</Alert>}
    {applied.uncategorized && <Alert severity="info" action={<Button color="inherit" onClick={clear}>Exit review</Button>}>Reviewing uncategorized transactions. These are management follow-ups, not bank errors.</Alert>}
    {accountsError && <Alert severity="error" action={<Button color="inherit" onClick={retryAccounts}>Retry</Button>}>{accountsError}</Alert>}
    {!accountsLoading && !accountsError && tenantSlug && accounts.length === 0 && <Alert severity="info" action={<Button component={Link} href="/dashboard/accounts" color="inherit">Go to Accounts</Button>}>Add an account before creating a transaction.</Alert>}
    {categoriesError && <Alert severity="error" action={<Button color="inherit" onClick={retryCategories}>Retry</Button>}>{categoriesError}</Alert>}
    {!categoriesLoading && !categoriesError && tenantSlug && categories.length === 0 && <Alert severity="info">No categories are available. You can still create an uncategorized transaction, but splitting requires categories.</Alert>}

    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}><TransactionFilters accounts={accounts} categoryOptions={categoryOptions} draft={draft} dateError={dateError} onDraftChange={setDraft} onApply={apply} onClear={clear} /></Paper>

    {error && <Alert severity="error" action={<Button color="inherit" onClick={refresh}>Retry</Button>}>{error}</Alert>}
    {loading && <Stack alignItems="center" py={8}><CircularProgress aria-label="Loading transactions" /></Stack>}
    {!loading && !error && tenantSlug && items.length === 0 && <Card variant="outlined"><CardContent><Stack alignItems="center" textAlign="center" py={6} spacing={1.5}><ReceiptLongRounded color="disabled" sx={{ fontSize: 48 }} /><Typography variant="h6">{hasFilters(applied) ? 'No transactions match these filters' : 'No transactions yet'}</Typography><Typography color="text.secondary">{hasFilters(applied) ? 'Try clearing or changing the active filters.' : 'Import a bank statement or add a manual transaction.'}</Typography>{hasFilters(applied) ? <Button onClick={clear}>Clear filters</Button> : <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} disabled={accounts.length === 0}>Add transaction</Button>}</Stack></CardContent></Card>}
    {!loading && !error && items.length > 0 && <TransactionList items={items} categories={categories} onEdit={openEdit} />}
    {!loading && !error && meta && meta.last_page > 1 && <Stack alignItems="center"><Pagination aria-label="Transaction pages" page={meta.current_page} count={meta.last_page} onChange={(_, page) => { const next = { ...applied, page }; setApplied(next); setDraft((current) => ({ ...current, page })); }} /></Stack>}

    {formOpen && tenantSlug && <TransactionFormDialog key={`${tenantSlug}-${selected?.id ?? 'new'}`} open transaction={selected} tenantSlug={tenantSlug} accounts={accounts} categoryOptions={categoryOptions} onClose={() => { setFormOpen(false); setSelected(null); }} onSaved={mutationSaved} />}
    <Snackbar open={Boolean(notice)} autoHideDuration={6000} onClose={() => setNotice(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}><Alert severity="success" variant="filled" onClose={() => setNotice(null)}>{notice}</Alert></Snackbar>
  </Stack>;
}
