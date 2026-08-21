import type { AccountType } from '@/features/accounts/types';

export type TransactionStatus = 'pending' | 'posted';
export type TransactionOrigin = 'manual' | 'csv' | 'system';

export type CategoryIdentity = {
  id: number;
  name: string;
  type: string;
  level: number;
};

export type Category = CategoryIdentity & {
  parent: CategoryIdentity | null;
};

export type CategoryDetail = Category & {
  children?: CategoryDetail[];
};

export type TransactionSplit = {
  id: number;
  category_id: number;
  amount: string;
  description: string | null;
  category: Category | null;
};

export type Transaction = {
  id: number;
  account_id: number;
  account: {
    id: number;
    name: string;
    type: AccountType;
    currency: string;
  };
  transaction_date: string;
  amount: string;
  description: string;
  notes: string | null;
  status: TransactionStatus;
  origin: TransactionOrigin;
  posted_at: string | null;
  category_id: number | null;
  category: Category | null;
  splits: TransactionSplit[];
  is_import_linked: boolean;
  bank_fields_editable: boolean;
  deletable: boolean;
};

export type PaginationLink = { url: string | null; label: string; active: boolean };
export type PaginationMeta = {
  current_page: number;
  from: number | null;
  last_page: number;
  links: PaginationLink[];
  path: string;
  per_page: number;
  to: number | null;
  total: number;
};

export type LaravelPaginatedResponse<T> = {
  data: T[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: PaginationMeta;
};

export type TransactionFilters = {
  page: number;
  perPage: 25;
  accountId: string;
  status: '' | TransactionStatus;
  origin: '' | TransactionOrigin;
  categoryId: string;
  uncategorized: boolean;
  dateFrom: string;
  dateTo: string;
  search: string;
};

export type TransactionSplitInput = {
  category_id: number | '';
  amount: string;
  description: string | null;
};

export type CreateTransactionInput = {
  account_id: number;
  transaction_date: string;
  amount: string;
  description: string;
  notes: string | null;
  status: TransactionStatus;
  category_id: number | null;
  splits: Array<Omit<TransactionSplitInput, 'category_id'> & { category_id: number }>;
};

export type UpdateTransactionInput = Partial<CreateTransactionInput>;
export type TransactionsResponse = LaravelPaginatedResponse<Transaction>;
export type TransactionResponse = { data: Transaction };
export type CategoriesResponse = { data: Category[] };

export const transactionStatusLabels: Record<TransactionStatus, string> = {
  pending: 'Pending',
  posted: 'Posted',
};

export const transactionOriginLabels: Record<TransactionOrigin, string> = {
  manual: 'Manual',
  csv: 'Imported',
  system: 'System',
};
