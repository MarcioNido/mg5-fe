import type { LaravelPaginatedResponse } from '@/features/transactions/types';

export type ReconciliationPreview = {
  statement_date: string;
  calculated_balance: string;
  review_period?: {
    date_from: string | null;
    date_to: string;
    previous_statement_date: string | null;
  };
};

export type Reconciliation = {
  id: number;
  statement_date: string;
  entered_bank_balance: string;
  calculated_balance: string;
  difference: string;
  is_valid: boolean;
  reconciled_at: string | null;
};

export type StoreReconciliationInput = {
  statement_date: string;
  entered_bank_balance: string;
};

export type ReconciliationPreviewResponse = { data: ReconciliationPreview };
export type ReconciliationResponse = { data: Reconciliation };
export type LatestReconciliationResponse = { data: Reconciliation | null };
export type ReconciliationHistoryResponse = LaravelPaginatedResponse<Reconciliation>;
