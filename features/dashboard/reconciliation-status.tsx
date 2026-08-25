import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatDateOnly } from '@/lib/format/date';

import { reconciliationExplanations, reconciliationLabels } from './helpers';
import type { DashboardReconciliation } from './types';

export function ReconciliationStatus({ reconciliation, detailed = false }: { reconciliation: DashboardReconciliation; detailed?: boolean }) {
  const attention = reconciliation.needs_attention;
  return (
    <Stack spacing={0.75} alignItems="flex-start">
      <Chip
        size="small"
        color={attention ? 'warning' : 'success'}
        icon={attention ? <WarningAmberRounded /> : <CheckCircleRounded />}
        label={reconciliationLabels[reconciliation.status]}
      />
      {reconciliation.latest_valid && (
        <Typography variant="caption" color="text.secondary">
          Latest valid statement: {formatDateOnly(reconciliation.latest_valid.statement_date)}
        </Typography>
      )}
      {detailed && reconciliation.status !== 'up_to_date' && (
        <Typography variant="body2" color="text.secondary">
          {reconciliationExplanations[reconciliation.status]}
        </Typography>
      )}
    </Stack>
  );
}
