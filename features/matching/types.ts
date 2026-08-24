import type { AccountType } from '@/features/accounts/types';
import type {
  Category,
  LaravelPaginatedResponse,
  Transaction,
  TransactionOrigin,
  TransactionSplit,
  TransactionStatus,
} from '@/features/transactions/types';

export type MatchReviewTransaction = {
  id: number;
  transaction_date: string;
  amount: string;
  description: string;
  notes: string | null;
  status: TransactionStatus;
  origin: TransactionOrigin;
  category: Category | null;
  splits: TransactionSplit[];
};

export type MatchCandidate = {
  suggestion_id: number;
  confidence: string;
  transaction: MatchReviewTransaction;
};

export type MatchReview = {
  id: number;
  account: { id: number; name: string; type: AccountType; currency: string };
  import: { id: number; original_filename: string | null; source_name: string; created_at: string };
  line_number: number;
  imported_transaction: MatchReviewTransaction;
  candidates: MatchCandidate[];
};

export type MatchReviewFilters = { page: number; perPage: 10; accountId: string };
export type MatchReviewsResponse = LaravelPaginatedResponse<MatchReview>;

export type ConfirmMatchResult = {
  review_id: number;
  suggestion_id: number;
  resolution: 'matched';
  transaction: Transaction;
};

export type RejectMatchResult = {
  review_id: number;
  suggestion_id: number;
  resolution: 'candidate_rejected' | 'imported_transaction_kept';
  remaining_candidates: number;
};

export type ConfirmMatchResponse = { data: ConfirmMatchResult };
export type RejectMatchResponse = { data: RejectMatchResult };
