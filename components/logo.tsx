import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.25}>
      <Box sx={{ width: 38, height: 38, borderRadius: 1.5, bgcolor: 'primary.main', color: 'common.white', display: 'grid', placeItems: 'center' }}>
        <AccountBalanceWalletRounded fontSize="small" />
      </Box>
      {!compact && <Typography variant="h6">Money Guru 5</Typography>}
    </Stack>
  );
}
