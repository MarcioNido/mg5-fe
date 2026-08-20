import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { routes } from '@/lib/config/routes';

export default function NotFound() {
  return (
    <Container maxWidth="sm">
      <Stack minHeight="100vh" justifyContent="center" alignItems="center" textAlign="center" spacing={2}>
        <Typography variant="h3">Page not found</Typography>
        <Typography color="text.secondary">The page may have moved or no longer exists.</Typography>
        <Button href={routes.dashboard} variant="contained">Back to dashboard</Button>
      </Stack>
    </Container>
  );
}
