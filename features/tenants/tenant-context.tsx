'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { apiRequest } from '@/lib/api/client';
import { invalidateTenantRequests } from '@/lib/api/request-generation';
import type { Tenant, TenantsResponse } from '@/lib/api/types';

import { resolveStoredTenant, TENANT_STORAGE_KEY } from './tenant-storage';

type TenantContextValue = {
  tenants: Tenant[];
  selectedSlug: string | null;
  selectedTenant: Tenant | null;
  loading: boolean;
  error: string | null;
  selectTenant: (slug: string) => void;
  retry: () => void;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    apiRequest<TenantsResponse>('tenants')
      .then(({ data }) => {
        if (!active) return;
        const stored = window.localStorage.getItem(TENANT_STORAGE_KEY);
        const resolved = resolveStoredTenant(data, stored);
        setTenants(data);
        setSelectedSlug(resolved);
        if (resolved) window.localStorage.setItem(TENANT_STORAGE_KEY, resolved);
        else window.localStorage.removeItem(TENANT_STORAGE_KEY);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load profiles.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [attempt]);

  const selectTenant = useCallback((slug: string) => {
    if (!tenants.some((tenant) => tenant.slug === slug)) return;
    invalidateTenantRequests();
    window.localStorage.setItem(TENANT_STORAGE_KEY, slug);
    setSelectedSlug(slug);
  }, [tenants]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((value) => value + 1);
  }, []);
  const selectedTenant = tenants.find((tenant) => tenant.slug === selectedSlug) ?? null;
  const value = useMemo(
    () => ({ tenants, selectedSlug, selectedTenant, loading, error, selectTenant, retry }),
    [tenants, selectedSlug, selectedTenant, loading, error, selectTenant, retry],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used inside TenantProvider.');
  return context;
}
