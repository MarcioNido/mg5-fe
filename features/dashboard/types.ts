import type { AccountType } from '@/features/accounts/types';
import type { CategoryType } from '@/features/categories/types';

export type ReconciliationStatus =
  | 'never_reconciled'
  | 'up_to_date'
  | 'activity_after_reconciliation'
  | 'latest_attempt_invalid';

export type DashboardReconciliation = {
  status: ReconciliationStatus;
  needs_attention: boolean;
  latest_valid: {
    statement_date: string;
    reconciled_at: string;
  } | null;
  latest_attempt: {
    statement_date: string;
    is_valid: boolean;
  } | null;
};

export type DashboardAccount = {
  id: number;
  name: string;
  type: AccountType;
  currency: string;
  current_balance: string;
  last_posted_transaction_date: string | null;
  reconciliation: DashboardReconciliation;
};

export type AmountsByType = {
  income: string;
  expense: string;
  transfer: string;
};

export type DashboardCategoryGroup = {
  category: {
    id: number;
    name: string;
    type: CategoryType;
    level: number;
  };
  amounts_by_type: AmountsByType;
  net_change: string;
};

export type DashboardCurrencyActivity = {
  currency: string;
  posted_transactions_count: number;
  amounts_by_type: AmountsByType;
  uncategorized_amount: string;
  confirmed_net_change: string;
  groups: DashboardCategoryGroup[];
};

export type DashboardWorkflow = {
  pending_transactions_count: number;
  uncategorized_posted_count: number;
  uncategorized_pending_count: number;
  accounts_needing_attention_count: number;
};

export type DashboardSummary = {
  period: {
    month: string;
    start_date: string;
    end_date: string;
  };
  as_of_date: string;
  accounts: DashboardAccount[];
  account_totals_by_currency: Array<{ currency: string; amount: string }>;
  period_activity: {
    posted_transactions_count: number;
    by_currency: DashboardCurrencyActivity[];
  };
  workflow: DashboardWorkflow;
};

export type DashboardSummaryResponse = { data: DashboardSummary };
