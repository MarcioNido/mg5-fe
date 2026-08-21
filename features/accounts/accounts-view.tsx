'use client';

import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { useTenant } from '@/features/tenants/tenant-context';
import { formatDecimalCurrency } from '@/lib/format/money';

import { AccountFormDialog } from './account-form-dialog';
import { accountTypeLabels, type Account } from './types';
import { useAccounts } from './use-accounts';

export function maskAccountNumber(value: string | null) {
  if (!value) return null;
  const lastFour = value.slice(-4);
  return `•••• ${lastFour}`;
}

export function AccountsView() {
  const { selectedSlug } = useTenant();
  return <AccountsTenantView key={selectedSlug ?? 'no-tenant'} selectedSlug={selectedSlug} />;
}

function AccountsTenantView({ selectedSlug }: { selectedSlug: string | null }) {
  const { accounts, loading, error, retry, refresh } = useAccounts(selectedSlug);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [formTenantSlug, setFormTenantSlug] = useState<string | null>(null);

  const openCreate = () => { setEditing(null); setFormTenantSlug(selectedSlug); setFormOpen(true); };
  const openEdit = (account: Account) => { setEditing(account); setFormTenantSlug(selectedSlug); setFormOpen(true); };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2}>
        <Box>
          <Typography variant="h4">Accounts</Typography>
          <Typography color="text.secondary" mt={0.75}>Manage the bank accounts and cards used by this financial profile.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} disabled={!selectedSlug}>Add account</Button>
      </Stack>

      {!selectedSlug && <Alert severity="info">Choose Personal or Clinic to manage its accounts.</Alert>}
      {error && <Alert severity="error" action={<Button color="inherit" onClick={retry}>Retry</Button>}>{error}</Alert>}
      {loading && <Stack alignItems="center" py={8}><CircularProgress aria-label="Loading accounts" /></Stack>}
      {!loading && !error && selectedSlug && accounts.length === 0 && (
        <Card variant="outlined"><CardContent><Stack alignItems="center" textAlign="center" py={6} spacing={1.5}>
          <AccountBalanceWalletRounded color="disabled" sx={{ fontSize: 48 }} />
          <Typography variant="h6">No accounts yet</Typography>
          <Typography color="text.secondary">Add an account before importing a bank statement.</Typography>
          <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate}>Add account</Button>
        </Stack></CardContent></Card>
      )}
      {!loading && accounts.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 2 }}>
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                  <Box minWidth={0}>
                    <Typography variant="h6" noWrap>{account.name}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center" mt={1} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={accountTypeLabels[account.type]} />
                      {maskAccountNumber(account.account_number) && <Typography variant="body2" color="text.secondary">{maskAccountNumber(account.account_number)}</Typography>}
                    </Stack>
                  </Box>
                  <IconButton aria-label={`Edit ${account.name}`} onClick={() => openEdit(account)}><EditRounded /></IconButton>
                </Stack>
                <Typography variant="body2" color="text.secondary" mt={3}>Opening balance</Typography>
                <Typography fontWeight={700}>{formatDecimalCurrency(account.opening_balance, account.currency)}</Typography>
                <Typography variant="caption" color="text.secondary">{account.opening_balance_date ?? 'No opening date'}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {formOpen && formTenantSlug === selectedSlug && <AccountFormDialog key={`${formTenantSlug}-${editing?.id ?? 'new'}`} open account={editing} tenantSlug={selectedSlug} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={refresh} />}
    </Stack>
  );
}
