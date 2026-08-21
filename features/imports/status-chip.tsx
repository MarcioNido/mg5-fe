import Chip from '@mui/material/Chip';

import { importStatusLabels, rowStatusLabels, type ImportRowStatus, type ImportStatus } from './types';

const colours: Record<ImportStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  pending: 'default',
  processing: 'info',
  complete: 'success',
  complete_with_errors: 'warning',
  failed: 'error',
};

export function ImportStatusChip({ status }: { status: ImportStatus }) {
  return <Chip size="small" color={colours[status]} label={importStatusLabels[status]} />;
}

export function RowStatusChip({ status }: { status: ImportRowStatus }) {
  const color = status === 'failed' ? 'error' : status === 'needs_review' ? 'warning' : status === 'pending' ? 'default' : 'success';
  return <Chip size="small" color={color} label={rowStatusLabels[status]} />;
}
