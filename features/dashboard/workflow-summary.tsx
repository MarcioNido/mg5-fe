import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

import { routes } from '@/lib/config/routes';

import type { DashboardWorkflow } from './types';

const items = [
  { key: 'pending_transactions_count', label: 'Pending transactions', action: 'Review transactions', href: routes.transactions },
  { key: 'uncategorized_posted_count', label: 'Uncategorized posted transactions', action: 'Review transactions', href: routes.transactions },
  { key: 'uncategorized_pending_count', label: 'Uncategorized pending transactions', action: 'Review transactions', href: routes.transactions },
  { key: 'accounts_needing_attention_count', label: 'Accounts needing reconciliation attention', action: 'Reconcile accounts', href: routes.reconciliation },
] as const;

export function WorkflowSummary({ workflow }: { workflow: DashboardWorkflow }) {
  return <Stack component="section" aria-labelledby="workflow-heading" spacing={2}>
    <BoxHeader />
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      {items.map((item) => <Card key={item.key} variant="outlined" sx={{ flex: 1 }}><CardContent sx={{ height: '100%' }}>
        <Stack height="100%" spacing={1.5} alignItems="flex-start">
          <Typography variant="h4">{workflow[item.key]}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>{item.label}</Typography>
          <Button component={Link} href={item.href} size="small">{item.action}</Button>
        </Stack>
      </CardContent></Card>)}
    </Stack>
  </Stack>;
}

function BoxHeader() {
  return <div><Typography id="workflow-heading" component="h2" variant="h5">Current workflow</Typography><Typography color="text.secondary" mt={0.5}>Tenant-wide current counts; changing the selected month does not change these values.</Typography></div>;
}
