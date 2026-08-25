import CategoryRounded from '@mui/icons-material/CategoryRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
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

import { exactDecimalSign, formatDashboardMoney, formatDashboardMonth, groupTypeLabel } from './helpers';
import type { DashboardCategoryGroup, DashboardCurrencyActivity, DashboardSummary } from './types';

function Amount({ value, currency, strong = false }: { value: string; currency: string; strong?: boolean }) {
  const sign = exactDecimalSign(value);
  return <Typography component="span" fontWeight={strong ? 800 : 600} color={sign === -1 ? 'error.main' : sign === 1 ? 'success.dark' : 'text.primary'}>{formatDashboardMoney(value, currency)}</Typography>;
}

function ActivityMetric({ label, value, currency, strong = false }: { label: string; value: string; currency: string; strong?: boolean }) {
  return <Box><Typography variant="caption" color="text.secondary" display="block">{label}</Typography><Amount value={value} currency={currency} strong={strong} /></Box>;
}

function GroupDesktop({ bucket }: { bucket: DashboardCurrencyActivity }) {
  return (
    <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
      <Table size="small" aria-label={`${bucket.currency} activity by management category`}>
        <TableHead><TableRow><TableCell>Management category</TableCell><TableCell>Type</TableCell><TableCell align="right">Income</TableCell><TableCell align="right">Expense</TableCell><TableCell align="right">Transfer</TableCell><TableCell align="right">Net change</TableCell></TableRow></TableHead>
        <TableBody>{bucket.groups.map((group) => <TableRow key={group.category.id}>
          <TableCell><Typography fontWeight={700}>{group.category.name}</Typography></TableCell>
          <TableCell><Chip size="small" label={groupTypeLabel(group)} /></TableCell>
          <TableCell align="right"><Amount value={group.amounts_by_type.income} currency={bucket.currency} /></TableCell>
          <TableCell align="right"><Amount value={group.amounts_by_type.expense} currency={bucket.currency} /></TableCell>
          <TableCell align="right"><Amount value={group.amounts_by_type.transfer} currency={bucket.currency} /></TableCell>
          <TableCell align="right"><Amount value={group.net_change} currency={bucket.currency} strong /></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </TableContainer>
  );
}

function GroupMobile({ group, currency }: { group: DashboardCategoryGroup; currency: string }) {
  return <Card variant="outlined" component="article"><CardContent>
    <Stack direction="row" justifyContent="space-between" gap={2}><Box><Typography fontWeight={700}>{group.category.name}</Typography><Chip size="small" label={groupTypeLabel(group)} sx={{ mt: 0.75 }} /></Box><Box textAlign="right"><Typography variant="caption" color="text.secondary">Net change</Typography><br /><Amount value={group.net_change} currency={currency} strong /></Box></Stack>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, mt: 2 }}>
      <ActivityMetric label="Income" value={group.amounts_by_type.income} currency={currency} />
      <ActivityMetric label="Expense" value={group.amounts_by_type.expense} currency={currency} />
      <ActivityMetric label="Transfer" value={group.amounts_by_type.transfer} currency={currency} />
    </Box>
  </CardContent></Card>;
}

function CurrencyBucket({ bucket }: { bucket: DashboardCurrencyActivity }) {
  return <Card variant="outlined" component="article"><CardContent sx={{ p: { xs: 2, sm: 3 } }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
      <Box><Typography component="h3" variant="h6">{bucket.currency} activity</Typography><Typography variant="body2" color="text.secondary">{bucket.posted_transactions_count} posted {bucket.posted_transactions_count === 1 ? 'transaction' : 'transactions'} · {bucket.currency} only</Typography></Box>
      <Box textAlign={{ sm: 'right' }}><Typography variant="caption" color="text.secondary">Confirmed net movement</Typography><br /><Amount value={bucket.confirmed_net_change} currency={bucket.currency} strong /></Box>
    </Stack>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 2, mt: 3 }}>
      <ActivityMetric label="Categorized income" value={bucket.amounts_by_type.income} currency={bucket.currency} />
      <ActivityMetric label="Categorized expense movement" value={bucket.amounts_by_type.expense} currency={bucket.currency} />
      <ActivityMetric label="Categorized transfer movement" value={bucket.amounts_by_type.transfer} currency={bucket.currency} />
      <ActivityMetric label="Uncategorized movement" value={bucket.uncategorized_amount} currency={bucket.currency} />
    </Box>
    <Divider sx={{ my: 3 }} />
    <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Activity by management category</Typography>
    {bucket.groups.length > 0 ? <>
      <GroupDesktop bucket={bucket} />
      <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }} aria-label={`${bucket.currency} activity by management category mobile list`}>
        {bucket.groups.map((group) => <GroupMobile key={group.category.id} group={group} currency={bucket.currency} />)}
      </Stack>
    </> : <Alert severity="info" action={<Button component={Link} href={routes.categories} color="inherit">Manage categories</Button>}>No category groups are available for this {bucket.currency} activity. Categorize transactions to organize this movement.</Alert>}
  </CardContent></Card>;
}

export function PeriodActivity({ summary }: { summary: DashboardSummary }) {
  const multipleCurrencies = summary.period_activity.by_currency.length > 1;
  return <Stack component="section" aria-labelledby="period-activity-heading" spacing={2.5}>
    <Box>
      <Typography id="period-activity-heading" component="h2" variant="h5">Posted activity · {formatDashboardMonth(summary.period.month)}</Typography>
      <Typography color="text.secondary" mt={0.5}>
        Posted bank movement for the complete selected month, {formatDateOnly(summary.period.start_date)} to {formatDateOnly(summary.period.end_date)}. This is management cash activity, not accounting profit.
      </Typography>
      <Typography variant="body2" mt={1}>{summary.period_activity.posted_transactions_count} posted {summary.period_activity.posted_transactions_count === 1 ? 'transaction' : 'transactions'} across the selected profile.</Typography>
      {multipleCurrencies && <Typography variant="body2" color="text.secondary" mt={0.5}>Currencies are shown separately and are not converted or combined.</Typography>}
    </Box>
    {summary.period_activity.by_currency.length === 0 ? (
      <Alert severity="info">No posted transactions were found for {formatDashboardMonth(summary.period.month)}. No currency amount is inferred.</Alert>
    ) : (
      <Stack spacing={2}>{summary.period_activity.by_currency.map((bucket) => <CurrencyBucket key={bucket.currency} bucket={bucket} />)}</Stack>
    )}
    <Button component={Link} href={routes.categories} startIcon={<CategoryRounded />} sx={{ alignSelf: 'flex-start' }}>Manage categories</Button>
  </Stack>;
}
