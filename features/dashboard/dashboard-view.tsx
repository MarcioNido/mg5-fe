'use client';

import RefreshRounded from '@mui/icons-material/RefreshRounded';
import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { useTenant } from '@/features/tenants/tenant-context';
import { profileLabel } from '@/features/tenants/tenant-storage';
import { routes } from '@/lib/config/routes';

import { AccountBalances } from './account-balances';
import { currentTorontoMonth, formatDashboardMonth, isSelectableDashboardMonth } from './helpers';
import { PeriodActivity } from './period-activity';
import { useDashboardSummary } from './use-dashboard-summary';
import { WorkflowSummary } from './workflow-summary';

export function DashboardView() {
  const { user } = useAuth();
  const { selectedSlug, selectedTenant, loading: tenantLoading } = useTenant();
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';
  const currentMonth = currentTorontoMonth();

  return <Stack spacing={3}>
    <Box>
      <Typography component="h1" variant="h4">Good to see you, {firstName}</Typography>
      <Typography color="text.secondary" mt={0.75}>
        {selectedTenant ? `${profileLabel(selectedTenant)} management overview` : 'Choose a financial profile to view its management overview.'}
      </Typography>
    </Box>

    {tenantLoading ? (
      <Stack alignItems="center" py={8} spacing={1.5} role="status" aria-live="polite">
        <CircularProgress aria-label="Loading financial profiles" />
        <Typography color="text.secondary">Loading financial profiles…</Typography>
      </Stack>
    ) : !selectedSlug || !selectedTenant ? (
      <Alert severity="info">Choose Personal or Clinic to load its dashboard.</Alert>
    ) : (
      <DashboardTenantView key={selectedSlug} tenantSlug={selectedSlug} profileName={profileLabel(selectedTenant)} currentMonth={currentMonth} />
    )}
  </Stack>;
}

function DashboardTenantView({ tenantSlug, profileName, currentMonth }: { tenantSlug: string; profileName: string; currentMonth: string }) {
  const [month, setMonth] = useState(currentMonth);
  const [monthDraft, setMonthDraft] = useState(currentMonth);
  const validDraft = isSelectableDashboardMonth(monthDraft, currentMonth);
  const { summary, retainedWorkflow, loading, refreshing, error, retry, refresh } = useDashboardSummary(tenantSlug, month);

  const changeMonth = (value: string) => {
    setMonthDraft(value);
    if (isSelectableDashboardMonth(value, currentMonth)) setMonth(value);
  };

  const trueEmpty = summary?.accounts.length === 0 && summary.period_activity.posted_transactions_count === 0;

  return <Stack spacing={4}>
    <Card variant="outlined"><CardContent>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-start' }} gap={2}>
        <Box>
          <Typography variant="overline" color="primary.dark">Selected profile</Typography>
          <Typography variant="h6">{profileName}</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Balances are current; activity follows the selected complete civil month.</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-start' }} gap={1.5}>
          <TextField
            type="month"
            size="small"
            label="Activity month"
            value={monthDraft}
            onChange={(event) => changeMonth(event.target.value)}
            inputProps={{ max: currentMonth, 'aria-describedby': 'dashboard-month-help' }}
            InputLabelProps={{ shrink: true }}
            error={!validDraft}
            helperText={!validDraft ? `Choose a valid month no later than ${formatDashboardMonth(currentMonth)}.` : 'Complete civil month in America/Toronto.'}
            FormHelperTextProps={{ id: 'dashboard-month-help' }}
          />
          <Button variant="outlined" startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshRounded />} onClick={refresh} disabled={!validDraft || loading || refreshing} aria-label="Refresh dashboard">Refresh</Button>
        </Stack>
      </Stack>
      <Box role="status" aria-live="polite" sx={{ minHeight: 20, mt: 1 }}>
        {refreshing && <Typography variant="caption" color="text.secondary">Refreshing dashboard while current data remains visible…</Typography>}
        {loading && <Typography variant="caption" color="text.secondary">Loading {formatDashboardMonth(month)} dashboard…</Typography>}
      </Box>
    </CardContent></Card>

    {error && <Alert severity="error" action={<Button color="inherit" onClick={retry}>Retry</Button>}>{error}</Alert>}

    {loading && !summary && <Stack alignItems="center" py={7}><CircularProgress aria-label="Loading dashboard summary" /></Stack>}

    {!loading && !error && summary && trueEmpty && <Card variant="outlined"><CardContent><Stack alignItems="center" textAlign="center" py={5} spacing={1.5}>
      <AccountBalanceWalletRounded color="disabled" sx={{ fontSize: 48 }} />
      <Typography variant="h6">No accounts or posted activity yet</Typography>
      <Typography color="text.secondary" maxWidth={560}>Add an account to begin tracking confirmed balances and importing bank activity for this profile.</Typography>
      <Button component={Link} href={routes.accounts} variant="contained">Go to Accounts</Button>
    </Stack></CardContent></Card>}

    {summary && !trueEmpty && <AccountBalances summary={summary} />}
    {summary && !trueEmpty && <PeriodActivity summary={summary} />}
    {(summary?.workflow ?? retainedWorkflow) && <WorkflowSummary workflow={(summary?.workflow ?? retainedWorkflow)!} />}
  </Stack>;
}
