export const importStatuses = ['pending', 'processing', 'complete', 'complete_with_errors', 'failed'] as const;
export type ImportStatus = typeof importStatuses[number];

export const importRowStatuses = ['pending', 'imported', 'matched', 'needs_review', 'duplicate', 'failed'] as const;
export type ImportRowStatus = typeof importRowStatuses[number];

export type ImportAccount = { id: number; name: string; type: string; currency: string };

export type ImportSummary = {
  id: number;
  account_id: number;
  account: ImportAccount;
  original_filename: string | null;
  source_name: string;
  source_type: string;
  status: ImportStatus;
  total_rows: number;
  processed_rows: number;
  failed_rows: number;
  error_message: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ImportRow = {
  id: number;
  line_number: number;
  status: ImportRowStatus;
  error_message: string | null;
  transaction_date?: string | null;
  description?: string | null;
  amount?: string | null;
};

export type ImportDetail = ImportSummary & { rows: ImportRow[] };

export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
};

export type ImportHistoryResponse = { data: ImportSummary[]; meta: PaginationMeta };
export type ImportDetailResponse = { data: ImportDetail };
export type UploadResponse = { data: ImportSummary; meta: { duplicate_upload: boolean } };

export type ImportFilters = { page: number; perPage: number; accountId: string; status: string };

export const importStatusLabels: Record<ImportStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  complete: 'Complete',
  complete_with_errors: 'Completed with errors',
  failed: 'Failed',
};

export const rowStatusLabels: Record<ImportRowStatus, string> = {
  pending: 'Pending',
  imported: 'Imported',
  matched: 'Matched',
  needs_review: 'Needs matching review',
  duplicate: 'Duplicate',
  failed: 'Failed',
};

export function isActiveImportStatus(status: ImportStatus) {
  return status === 'pending' || status === 'processing';
}
