import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

export default function Loading() {
  return <Stack minHeight="100vh" alignItems="center" justifyContent="center"><CircularProgress /></Stack>;
}
