import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

import { formatDateOnly } from '@/lib/format/date';
import { routes } from '@/lib/config/routes';

import { accountTypeLabel, formatDashboardMoney } from './helpers';
import { ReconciliationStatus } from './reconciliation-status';
import type { DashboardSummary } from './types';

export function AccountBalances({ summary }: { summary: DashboardSummary }) {
  return (
    <Stack component="section" aria-labelledby="current-balances-heading" spacing={2.5}>
      <Box>
        <Typography id="current-balances-heading" component="h2" variant="h5">Current confirmed balances</Typography>
        <Typography color="text.secondary" mt={0.5}>
          Opening checkpoints plus posted transactions through {formatDateOnly(summary.as_of_date)}.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        {summary.account_totals_by_currency.map((total) => (
          <Card key={total.currency} variant="outlined">
            <CardContent>
              <Typography variant="overline" color="text.secondary">Total {total.currency} balance</Typography>
              <Typography variant="h4" mt={0.5}>{formatDashboardMoney(total.amount, total.currency)}</Typography>
              <Typography variant="caption" color="text.secondary">{total.currency} only · no currency conversion</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {summary.workflow.accounts_needing_attention_count > 0 && (
        <Alert severity="warning" action={<Button component={Link} href={routes.reconciliation} color="inherit">Reconcile accounts</Button>}>
          {summary.workflow.accounts_needing_attention_count} {summary.workflow.accounts_needing_attention_count === 1 ? 'account needs' : 'accounts need'} reconciliation attention.
        </Alert>
      )}

      <TableContainer component={Card} variant="outlined" sx={{ display: { xs: 'none', md: 'block' } }}>
        <Table size="small" aria-label="Current confirmed account balances">
          <TableHead><TableRow><TableCell>Account</TableCell><TableCell>Type</TableCell><TableCell>Last posted activity</TableCell><TableCell>Reconciliation</TableCell><TableCell align="right">Current balance</TableCell></TableRow></TableHead>
          <TableBody>{summary.accounts.map((account) => (
            <TableRow key={account.id} hover>
              <TableCell><Typography fontWeight={700}>{account.name}</Typography><Typography variant="caption" color="text.secondary">{account.currency}</Typography></TableCell>
              <TableCell><Chip size="small" variant="outlined" label={accountTypeLabel(account)} /></TableCell>
              <TableCell>{account.last_posted_transaction_date ? formatDateOnly(account.last_posted_transaction_date) : 'No posted activity'}</TableCell>
              <TableCell><ReconciliationStatus reconciliation={account.reconciliation} detailed /></TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{formatDashboardMoney(account.current_balance, account.currency)}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </TableContainer>

      <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }} aria-label="Current confirmed account balances mobile list">
        {summary.accounts.map((account) => (
          <Card key={account.id} variant="outlined" component="article"><CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
              <Box minWidth={0}><Typography fontWeight={700}>{account.name}</Typography><Typography variant="body2" color="text.secondary">{accountTypeLabel(account)} · {account.currency}</Typography></Box>
              <Typography fontWeight={700} whiteSpace="nowrap">{formatDashboardMoney(account.current_balance, account.currency)}</Typography>
            </Stack>
            <Typography variant="body2" mt={1.5}>Last posted activity: {account.last_posted_transaction_date ? formatDateOnly(account.last_posted_transaction_date) : 'No posted activity'}</Typography>
            <Box mt={1.5}><ReconciliationStatus reconciliation={account.reconciliation} detailed /></Box>
          </CardContent></Card>
        ))}
      </Stack>

      <Button component={Link} href={routes.accounts} startIcon={<AccountBalanceWalletRounded />} sx={{ alignSelf: 'flex-start' }}>View accounts</Button>
    </Stack>
  );
}
