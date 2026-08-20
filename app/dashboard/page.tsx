'use client';

import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import SecurityRounded from '@mui/icons-material/SecurityRounded';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useAuth } from '@/features/auth/auth-context';
import { useTenant } from '@/features/tenants/tenant-context';
import { profileLabel } from '@/features/tenants/tenant-storage';

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedTenant } = useTenant();

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>Good to see you, {user?.name?.split(' ')[0]}</Typography>
        <Typography color="text.secondary">Your management-finance workspace is ready.</Typography>
      </Box>
      <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 }, background: 'linear-gradient(135deg, rgba(0,167,111,.10), rgba(0,167,111,.02) 65%)' }}>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="overline" color="primary.dark">Current financial profile</Typography>
                <Typography variant="h3" mt={0.5}>{selectedTenant ? profileLabel(selectedTenant) : 'Choose a profile'}</Typography>
              </Box>
              <Chip icon={<SecurityRounded />} label="Tenant isolated" color="success" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
            </Stack>
            <Typography color="text.secondary" maxWidth={680}>
              No financial figures are shown until the core workflows are connected to the backend. This keeps the dashboard honest and free of demo data.
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} color="success.dark">
              <CheckCircleRounded fontSize="small" />
              <Typography variant="body2" fontWeight={700}>Secure session and profile selection are active</Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
