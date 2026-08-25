import { apiRequest } from '@/lib/api/client';

import type { CategoriesResponse, Category, CategoryInput, CategoryResponse } from './types';

export function listCategories(tenantSlug: string, signal?: AbortSignal) {
  return apiRequest<CategoriesResponse>('categories', { tenantAware: true, tenantSlug, signal });
}

export function createCategory(tenantSlug: string, input: CategoryInput) {
  return apiRequest<CategoryResponse>('categories', { method: 'POST', tenantAware: true, tenantSlug, body: input });
}

export function updateCategory(tenantSlug: string, id: Category['id'], input: CategoryInput) {
  return apiRequest<CategoryResponse>(`categories/${id}`, { method: 'PATCH', tenantAware: true, tenantSlug, body: input });
}

export function deleteCategory(tenantSlug: string, id: Category['id']) {
  return apiRequest<void>(`categories/${id}`, { method: 'DELETE', tenantAware: true, tenantSlug });
}

