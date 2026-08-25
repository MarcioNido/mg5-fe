import type { AccountType } from '@/features/accounts/types';
import type { Category } from '@/features/categories/types';
import type { LaravelPaginatedResponse } from '@/features/transactions/types';

export type Rule = {
  id: number;
  match_text: string;
  account: { id: number; name: string; type: AccountType; currency: string } | null;
  category: Category;
  created_at: string;
  updated_at: string;
};

export type RuleInput = { match_text: string; account_id: number | null; category_id: number };
export type RuleFilters = { page: number; perPage: 25; search: string; accountId: string; categoryId: string };
export type RulesResponse = LaravelPaginatedResponse<Rule>;
export type RuleResponse = { data: Rule };

