'use client';

import AddRounded from '@mui/icons-material/AddRounded';
import RuleRounded from '@mui/icons-material/RuleRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAccounts } from '@/features/accounts/use-accounts';
import { buildCategoryOptions } from '@/features/categories/helpers';
import { useCategories } from '@/features/categories/use-categories';
import { useTenant } from '@/features/tenants/tenant-context';
import type { PaginationMeta } from '@/features/transactions/types';
import { isAbortError, messageFromError } from '@/lib/api/ui-error';

import { RuleFormDialog } from './rule-form-dialog';
import { RuleList } from './rule-list';
import { deleteRule, listRules } from './service';
import type { Rule, RuleFilters } from './types';

export const initialRuleFilters: RuleFilters = { page: 1, perPage: 25, search: '', accountId: '', categoryId: '' };
const hasFilters = (filters: RuleFilters) => Boolean(filters.search.trim() || filters.accountId || filters.categoryId);

export function RulesView() { const { selectedSlug } = useTenant(); return <RulesTenantView key={selectedSlug ?? 'no-tenant'} tenantSlug={selectedSlug} />; }

function RulesTenantView({ tenantSlug }: { tenantSlug: string | null }) {
  const { accounts, loading: accountsLoading, error: accountsError, retry: retryAccounts } = useAccounts(tenantSlug);
  const { categories, loading: categoriesLoading, error: categoriesError, retry: retryCategories } = useCategories(tenantSlug); const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);
  const [applied, setApplied] = useState(initialRuleFilters); const [draft, setDraft] = useState(initialRuleFilters); const [items, setItems] = useState<Rule[]>([]); const [meta, setMeta] = useState<PaginationMeta | null>(null); const [loading, setLoading] = useState(false); const [loaded, setLoaded] = useState(false); const [error, setError] = useState<string | null>(null); const [attempt, setAttempt] = useState(0);
  const [formOpen, setFormOpen] = useState(false); const [editing, setEditing] = useState<Rule | null>(null); const [deleting, setDeleting] = useState<Rule | null>(null); const [deleteBusy, setDeleteBusy] = useState(false); const [deleteError, setDeleteError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null); const deleteLock = useRef(false);
  useEffect(() => { if (!tenantSlug) return; const controller = new AbortController(); queueMicrotask(() => { if (!controller.signal.aborted) { setLoading(true); setError(null); } }); listRules(tenantSlug, applied, controller.signal).then((response) => { if (!controller.signal.aborted) { setItems(response.data); setMeta(response.meta); setLoaded(true); setError(null); } }).catch((reason: unknown) => { if (!isAbortError(reason)) { setError(messageFromError(reason, 'Unable to load automatic rules.')); setLoaded(true); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [tenantSlug, applied, attempt]);
  const refresh = useCallback(() => setAttempt((value) => value + 1), []); const clear = () => { setDraft(initialRuleFilters); setApplied(initialRuleFilters); }; const apply = () => { const next = { ...draft, page: 1, search: draft.search.trim() }; setDraft(next); setApplied(next); };
  const saved = (message: string) => { setNotice(message); refresh(); };
  const confirmDelete = async () => { if (!tenantSlug || !deleting || deleteLock.current) return; deleteLock.current = true; setDeleteBusy(true); setDeleteError(null); try { await deleteRule(tenantSlug, deleting.id); setDeleting(null); setNotice('Rule deleted. Previously assigned categories were not changed.'); if (items.length === 1 && applied.page > 1) { const next = { ...applied, page: applied.page - 1 }; setApplied(next); setDraft((current) => ({ ...current, page: next.page })); } else refresh(); } catch (reason) { setDeleteError(messageFromError(reason, 'Unable to delete this rule.')); } finally { deleteLock.current = false; setDeleteBusy(false); } };
  const submitFilters = (event: FormEvent) => { event.preventDefault(); apply(); };
  return <Stack spacing={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2}><Box><Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap><Typography variant="h4">Automatic rules</Typography>{meta && <Chip size="small" label={`${meta.total} total`} />}</Stack><Typography color="text.secondary" mt={0.75}>Automatically categorize safe transactions using focused description rules.</Typography></Box><Button variant="contained" startIcon={<AddRounded />} onClick={() => { setEditing(null); setFormOpen(true); }} disabled={!tenantSlug || categoriesLoading || Boolean(categoriesError) || categories.length === 0}>Add rule</Button></Stack>
    {!tenantSlug && <Alert severity="info">Choose Personal or Clinic to manage its automatic rules.</Alert>}
    <Alert severity="info"><Typography component="div" variant="body2">Matching is case-insensitive and literal: a description must contain the rule text. Global rules cover all accounts; account-specific rules cover one account. Only safe uncategorized transactions without splits change. When several rules match, the first by creation order wins. Editing or deleting a rule does not undo past categorizations.</Typography></Alert>
    {accountsError && <Alert severity="error" action={<Button color="inherit" onClick={retryAccounts}>Retry accounts</Button>}>{accountsError}</Alert>}
    {categoriesError && <Alert severity="error" action={<Button color="inherit" onClick={retryCategories}>Retry categories</Button>}>{categoriesError}</Alert>}
    {!categoriesLoading && !categoriesError && tenantSlug && categories.length === 0 && <Alert severity="info">Add a category before creating an automatic rule.</Alert>}
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}><Box component="form" onSubmit={submitFilters}><Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}><TextField label="Search" value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} inputProps={{ maxLength: 120 }} /><TextField select label="Account" value={draft.accountId} onChange={(event) => setDraft({ ...draft, accountId: event.target.value })} disabled={accountsLoading}><MenuItem value="">All accounts</MenuItem>{accounts.map((account) => <MenuItem key={account.id} value={String(account.id)}>{account.name}</MenuItem>)}</TextField><TextField select label="Category" value={draft.categoryId} onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })} disabled={categoriesLoading}><MenuItem value="">All categories</MenuItem>{categoryOptions.map((option) => <MenuItem key={option.id} value={String(option.id)}>{option.label}</MenuItem>)}</TextField></Box><Stack direction="row" spacing={1.5} mt={2}><Button type="submit" variant="contained">Apply filters</Button><Button type="button" color="inherit" onClick={clear}>Clear</Button></Stack></Box></Paper>
    {error && <Alert severity="error" action={<Button color="inherit" onClick={refresh}>Retry</Button>}>{error}</Alert>}
    {loading && !loaded && <Stack alignItems="center" py={8}><CircularProgress aria-label="Loading automatic rules" /></Stack>}{loading && loaded && <LinearProgress aria-label="Refreshing automatic rules" />}
    {!loading && !error && tenantSlug && items.length === 0 && <Card variant="outlined"><CardContent><Stack alignItems="center" textAlign="center" py={6} spacing={1.5}><RuleRounded color="disabled" sx={{ fontSize: 48 }} /><Typography variant="h6">{hasFilters(applied) ? 'No rules match these filters' : 'No automatic rules yet'}</Typography><Typography color="text.secondary">{hasFilters(applied) ? 'Try clearing or changing the active filters.' : 'Add a rule to categorize future matching transactions.'}</Typography>{hasFilters(applied) ? <Button onClick={clear}>Clear filters</Button> : <Button variant="contained" startIcon={<AddRounded />} onClick={() => setFormOpen(true)} disabled={categories.length === 0}>Add rule</Button>}</Stack></CardContent></Card>}
    {!error && items.length > 0 && <RuleList items={items} categories={categories} onEdit={(rule) => { setEditing(rule); setFormOpen(true); }} onDelete={(rule) => { setDeleteError(null); setDeleting(rule); }} />}
    {!error && meta && meta.last_page > 1 && <Stack alignItems="center"><Pagination aria-label="Automatic rule pages" page={meta.current_page} count={meta.last_page} onChange={(_, page) => { const next = { ...applied, page }; setApplied(next); setDraft((current) => ({ ...current, page })); }} /></Stack>}
    {formOpen && tenantSlug && <RuleFormDialog key={`${tenantSlug}-${editing?.id ?? 'new'}`} open rule={editing} tenantSlug={tenantSlug} accounts={accounts} categoryOptions={categoryOptions} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={saved} />}
    <Dialog open={Boolean(deleting)} onClose={() => { if (!deleteBusy) setDeleting(null); }} aria-labelledby="delete-rule-title"><DialogTitle id="delete-rule-title">Delete rule {deleting?.match_text}?</DialogTitle><DialogContent><Stack spacing={2}><Typography>The rule will stop future automatic categorization. Categories it assigned in the past will not be removed.</Typography>{deleteError && <Alert severity="error">{deleteError}</Alert>}</Stack></DialogContent><DialogActions><Button color="inherit" onClick={() => setDeleting(null)} disabled={deleteBusy}>Cancel</Button><Button color="error" variant="contained" onClick={confirmDelete} disabled={deleteBusy}>{deleteBusy ? 'Deleting…' : 'Delete rule'}</Button></DialogActions></Dialog>
    <Snackbar open={Boolean(notice)} autoHideDuration={7000} onClose={() => setNotice(null)}><Alert severity="success" variant="filled" onClose={() => setNotice(null)}>{notice}</Alert></Snackbar>
  </Stack>;
}

