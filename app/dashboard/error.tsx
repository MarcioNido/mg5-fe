'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Stack spacing={2}>
      <Alert severity="error">This page could not be loaded. Your financial data was not changed.</Alert>
      <Button onClick={reset} variant="outlined" sx={{ alignSelf: 'flex-start' }}>Try again</Button>
    </Stack>
  );
}
