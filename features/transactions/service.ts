import { apiRequest } from '@/lib/api/client';
export { listCategories } from '@/features/categories/service';

import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilters,
  TransactionResponse,
  TransactionsResponse,
  UpdateTransactionInput,
} from './types';

export function transactionQuery(filters: TransactionFilters) {
  const params = new URLSearchParams({ page: String(filters.page), per_page: String(filters.perPage) });
  const search = filters.search.trim();
  if (filters.accountId) params.set('account_id', filters.accountId);
  if (filters.status) params.set('status', filters.status);
  if (filters.origin) params.set('origin', filters.origin);
  if (filters.categoryId) params.set('category_id', filters.categoryId);
  if (filters.uncategorized) params.set('uncategorized', 'true');
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  if (search) params.set('search', search);
  return params.toString();
}

export function listTransactions(tenantSlug: string, filters: TransactionFilters, signal?: AbortSignal) {
  return apiRequest<TransactionsResponse>(`transactions?${transactionQuery(filters)}`, {
    tenantAware: true,
    tenantSlug,
    signal,
  });
}

export function createTransaction(tenantSlug: string, input: CreateTransactionInput) {
  return apiRequest<TransactionResponse>('transactions', {
    method: 'POST', tenantAware: true, tenantSlug, body: input,
  });
}

export function updateTransaction(tenantSlug: string, id: Transaction['id'], input: UpdateTransactionInput) {
  return apiRequest<TransactionResponse>(`transactions/${id}`, {
    method: 'PATCH', tenantAware: true, tenantSlug, body: input,
  });
}

export function deleteTransaction(tenantSlug: string, id: Transaction['id']) {
  return apiRequest<void>(`transactions/${id}`, {
    method: 'DELETE', tenantAware: true, tenantSlug,
  });
}
