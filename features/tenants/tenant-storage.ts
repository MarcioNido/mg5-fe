import type { Tenant } from '@/lib/api/types';

export const TENANT_STORAGE_KEY = 'mg5:selected-tenant';

export function resolveStoredTenant(tenants: Tenant[], storedSlug: string | null) {
  if (tenants.length === 1) return tenants[0]?.slug ?? null;
  if (storedSlug && tenants.some((tenant) => tenant.slug === storedSlug)) return storedSlug;
  return null;
}

export function profileLabel(tenant: Tenant) {
  if (tenant.slug === 'personal') return 'Personal';
  if (tenant.slug === 'clinic') return 'Clinic';
  return tenant.name;
}
