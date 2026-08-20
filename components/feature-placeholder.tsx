import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export function FeaturePlaceholder({ title, description, icon }: { title: string; description: string; icon: ReactNode }) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>{title}</Typography>
        <Typography color="text.secondary">{description}</Typography>
      </Box>
      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Stack alignItems="center" textAlign="center" spacing={2} py={4}>
            <Box sx={{ width: 64, height: 64, display: 'grid', placeItems: 'center', borderRadius: '50%', color: 'primary.main', bgcolor: 'rgba(0,167,111,.10)', '& svg': { fontSize: 32 } }}>{icon}</Box>
            <Typography variant="h6">Ready for the next phase</Typography>
            <Typography color="text.secondary" maxWidth={480}>The clean foundation is in place. This workflow will be connected to real API data in Phase 5.</Typography>
            <Chip icon={<AccessTimeRounded />} label="Coming in Phase 5" variant="outlined" />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
