import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export default function DashboardLoading() {
  return <Stack spacing={2}><Skeleton width="34%" height={54} /><Skeleton variant="rounded" height={220} /></Stack>;
}
