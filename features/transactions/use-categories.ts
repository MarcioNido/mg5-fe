'use client';

import { useCallback, useEffect, useState } from 'react';

import { isAbortError, messageFromError } from '@/lib/api/ui-error';

import { listCategories } from './service';
import type { Category } from './types';

export function useCategories(tenantSlug: string | null) {
  const [result, setResult] = useState<{ slug: string | null; categories: Category[]; loading: boolean; error: string | null }>({ slug: null, categories: [], loading: false, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!tenantSlug) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setResult({ slug: tenantSlug, categories: [], loading: true, error: null });
    });
    listCategories(tenantSlug, controller.signal)
      .then(({ data }) => setResult({ slug: tenantSlug, categories: data, loading: false, error: null }))
      .catch((reason: unknown) => {
        if (!isAbortError(reason)) setResult({ slug: tenantSlug, categories: [], loading: false, error: messageFromError(reason, 'Unable to load categories.') });
      });
    return () => controller.abort();
  }, [tenantSlug, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const current = result.slug === tenantSlug ? result : { slug: tenantSlug, categories: [], loading: Boolean(tenantSlug), error: null };
  return { categories: current.categories, loading: current.loading, error: current.error, retry };
}
