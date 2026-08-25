import { apiRequest } from '@/lib/api/client';

import type { Rule, RuleFilters, RuleInput, RuleResponse, RulesResponse } from './types';

export function ruleQuery(filters: RuleFilters) {
  const params = new URLSearchParams({ page: String(filters.page), per_page: String(filters.perPage) });
  const search = filters.search.trim();
  if (search) params.set('search', search);
  if (filters.accountId) params.set('account_id', filters.accountId);
  if (filters.categoryId) params.set('category_id', filters.categoryId);
  return params.toString();
}

export function listRules(tenantSlug: string, filters: RuleFilters, signal?: AbortSignal) {
  return apiRequest<RulesResponse>(`rules?${ruleQuery(filters)}`, { tenantAware: true, tenantSlug, signal });
}

export function createRule(tenantSlug: string, input: RuleInput) {
  return apiRequest<RuleResponse>('rules', { method: 'POST', tenantAware: true, tenantSlug, body: input });
}

export function updateRule(tenantSlug: string, id: Rule['id'], input: RuleInput) {
  return apiRequest<RuleResponse>(`rules/${id}`, { method: 'PATCH', tenantAware: true, tenantSlug, body: input });
}

export function deleteRule(tenantSlug: string, id: Rule['id']) {
  return apiRequest<void>(`rules/${id}`, { method: 'DELETE', tenantAware: true, tenantSlug });
}

