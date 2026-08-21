'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';

import { useAccounts } from '@/features/accounts/use-accounts';
import { useTenant } from '@/features/tenants/tenant-context';
import { isAbortError, messageFromError } from '@/lib/api/ui-error';

import { getImport, listImports } from './service';
import { ImportDetail } from './import-detail';
import { ImportHistory } from './import-history';
import { UploadForm } from './upload-form';
import { isActiveImportStatus, type ImportDetail as ImportDetailType, type ImportFilters, type ImportSummary, type PaginationMeta } from './types';

const initialFilters: ImportFilters = { page: 1, perPage: 15, accountId: '', status: '' };
const POLL_INTERVAL_MS = 3000;

export function ImportsView() {
  const { selectedSlug } = useTenant();
  return <ImportsTenantView key={selectedSlug ?? 'no-tenant'} tenantSlug={selectedSlug} />;
}

function ImportsTenantView({ tenantSlug }: { tenantSlug: string | null }) {
  const { accounts, loading: accountsLoading, error: accountsError, retry: retryAccounts } = useAccounts(tenantSlug);
  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState<ImportSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ImportDetailType | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantSlug) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setItems([]);
        setHistoryError(null);
        setHistoryLoading(true);
      }
    });
    listImports(tenantSlug, filters, controller.signal)
      .then((response) => { setItems(response.data); setMeta(response.meta); })
      .catch((reason: unknown) => { if (!isAbortError(reason)) setHistoryError(messageFromError(reason, 'Unable to load import history.')); })
      .finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [tenantSlug, filters, historyAttempt]);

  const refreshHistory = useCallback(() => setHistoryAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!tenantSlug || selectedId === null) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let previousStatus = items.find((item) => item.id === selectedId)?.status;
    let hasLoaded = false;
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setDetail(null);
        setDetailError(null);
      }
    });

    const load = async () => {
      if (document.visibilityState === 'hidden') {
        timer = setTimeout(load, POLL_INTERVAL_MS);
        return;
      }
      if (!hasLoaded) setDetailLoading(true);
      try {
        const response = await getImport(tenantSlug, selectedId, controller.signal);
        if (controller.signal.aborted) return;
        setDetail(response.data);
        hasLoaded = true;
        setDetailError(null);
        setDetailLoading(false);
        const active = isActiveImportStatus(response.data.status);
        if (active) timer = setTimeout(load, POLL_INTERVAL_MS);
        else if (previousStatus && isActiveImportStatus(previousStatus)) {
          refreshHistory();
        }
        previousStatus = response.data.status;
      } catch (reason) {
        if (!isAbortError(reason)) {
          setDetailError(messageFromError(reason, 'Unable to load this import.'));
          setDetailLoading(false);
        }
      }
    };
    void load();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
    // items is deliberately excluded: history refreshes must not create a second poller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, selectedId, detailAttempt, refreshHistory]);

  const uploaded = (item: ImportSummary, duplicate: boolean) => {
    setNotice(duplicate
      ? 'This statement was already imported for this account. The existing import is shown below.'
      : 'Statement uploaded successfully.');
    setSelectedId(item.id);
    setDetail(null);
    refreshHistory();
  };

  return (
    <Stack spacing={3}>
      <Box><Typography variant="h4">Imports</Typography><Typography color="text.secondary" mt={0.75}>Upload RBC or Triangle statements and review processing results.</Typography></Box>
      {!tenantSlug && <Alert severity="info">Choose Personal or Clinic to view its imports.</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(300px, 0.8fr) minmax(0, 1.6fr)' }, gap: 3, alignItems: 'start' }}>
        <UploadForm tenantSlug={tenantSlug} accounts={accounts} accountsLoading={accountsLoading} accountsError={accountsError} onAccountsRetry={retryAccounts} onUploaded={uploaded} />
        <ImportHistory accounts={accounts} items={items} meta={meta} filters={filters} loading={historyLoading} error={historyError} selectedId={selectedId} onFiltersChange={setFilters} onRetry={refreshHistory} onSelect={setSelectedId} />
      </Box>
      <ImportDetail detail={detail} loading={detailLoading} error={detailError} onRetry={() => setDetailAttempt((value) => value + 1)} />
      <Snackbar open={Boolean(notice)} autoHideDuration={7000} onClose={() => setNotice(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setNotice(null)}>{notice}</Alert>
      </Snackbar>
    </Stack>
  );
}
