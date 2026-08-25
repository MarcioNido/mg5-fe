'use client';

import { useCallback, useEffect, useState } from 'react';

import { isAbortError, messageFromError } from '@/lib/api/ui-error';

import { getDashboardSummary } from './service';
import type { DashboardSummary } from './types';

type DashboardReadState = {
  tenantSlug: string;
  requestedMonth: string;
  dataMonth: string | null;
  data: DashboardSummary | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

export function useDashboardSummary(tenantSlug: string, month: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DashboardReadState>({
    tenantSlug,
    requestedMonth: month,
    dataMonth: null,
    data: null,
    loading: true,
    refreshing: false,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setState((current) => {
        const sameIdentity = current.tenantSlug === tenantSlug && current.dataMonth === month;
        return {
          tenantSlug,
          requestedMonth: month,
          dataMonth: current.tenantSlug === tenantSlug ? current.dataMonth : null,
          data: current.tenantSlug === tenantSlug ? current.data : null,
          loading: !sameIdentity,
          refreshing: sameIdentity && current.data !== null,
          error: null,
        };
      });
    });

    getDashboardSummary(tenantSlug, month, controller.signal)
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setState({ tenantSlug, requestedMonth: month, dataMonth: month, data, loading: false, refreshing: false, error: null });
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted || isAbortError(reason)) return;
        setState((current) => ({
          ...current,
          tenantSlug,
          requestedMonth: month,
          loading: false,
          refreshing: false,
          error: messageFromError(reason, 'Unable to load the management dashboard.'),
        }));
      });

    return () => controller.abort();
  }, [tenantSlug, month, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const refresh = useCallback(() => setAttempt((value) => value + 1), []);
  const sameTenant = state.tenantSlug === tenantSlug;
  const summary = sameTenant && state.dataMonth === month ? state.data : null;

  return {
    summary,
    retainedWorkflow: sameTenant ? state.data?.workflow ?? null : null,
    loading: sameTenant && state.requestedMonth === month ? state.loading : true,
    refreshing: sameTenant && state.requestedMonth === month ? state.refreshing : false,
    error: sameTenant && state.requestedMonth === month ? state.error : null,
    retry,
    refresh,
  };
}
