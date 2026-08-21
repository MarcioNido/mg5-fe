'use client';

import { useCallback, useEffect, useState } from 'react';

import { isAbortError, messageFromError } from '@/lib/api/ui-error';

import { listAccounts } from './service';
import type { Account } from './types';

export function useAccounts(tenantSlug: string | null) {
  const [result, setResult] = useState<{ slug: string | null; accounts: Account[]; loading: boolean; error: string | null }>({ slug: null, accounts: [], loading: false, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!tenantSlug) return;

    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setResult({ slug: tenantSlug, accounts: [], loading: true, error: null });
    });
    listAccounts(tenantSlug, controller.signal)
      .then(({ data }) => setResult({ slug: tenantSlug, accounts: data, loading: false, error: null }))
      .catch((reason: unknown) => {
        if (!isAbortError(reason)) setResult({ slug: tenantSlug, accounts: [], loading: false, error: messageFromError(reason, 'Unable to load accounts.') });
      });

    return () => controller.abort();
  }, [tenantSlug, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const refresh = useCallback(() => setAttempt((value) => value + 1), []);

  const current = result.slug === tenantSlug ? result : { slug: tenantSlug, accounts: [], loading: Boolean(tenantSlug), error: null };
  return { accounts: current.accounts, loading: current.loading, error: current.error, retry, refresh };
}
