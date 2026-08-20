import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiRequest } from '@/lib/api/client';
import { invalidateTenantRequests } from '@/lib/api/request-generation';
import { resolveStoredTenant } from '@/features/tenants/tenant-storage';

const tenants = [
  { id: 1, name: 'Personal', slug: 'personal' },
  { id: 2, name: 'Clinic', slug: 'clinic' },
];

describe('financial profile selection', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('auto-selects one tenant, validates persistence, and requires an explicit multi-tenant choice', () => {
    expect(resolveStoredTenant([tenants[0]!], null)).toBe('personal');
    expect(resolveStoredTenant(tenants, 'clinic')).toBe('clinic');
    expect(resolveStoredTenant(tenants, 'removed-profile')).toBeNull();
    expect(resolveStoredTenant(tenants, null)).toBeNull();
  });

  it('sends X-Tenant-Slug on tenant-aware requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('accounts', { tenantAware: true, tenantSlug: 'clinic' });
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('X-Tenant-Slug')).toBe('clinic');
  });

  it('rejects stale results after a tenant switch', async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    })));

    const oldRequest = apiRequest('accounts', { tenantAware: true, tenantSlug: 'personal' });
    invalidateTenantRequests();
    resolveFetch?.(new Response(JSON.stringify({ data: ['old personal data'] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(oldRequest).rejects.toMatchObject({ name: 'AbortError' });
  });
});
