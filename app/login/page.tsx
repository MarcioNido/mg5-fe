'use client';

import AccountBalanceWalletRounded from '@mui/icons-material/AccountBalanceWalletRounded';
import VisibilityOffRounded from '@mui/icons-material/VisibilityOffRounded';
import VisibilityRounded from '@mui/icons-material/VisibilityRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { safeReturnTo, validateLogin } from '@/features/auth/login-utils';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateLogin(email, password);
    setFieldErrors(validation);
    setError('');
    if (Object.keys(validation).length) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace(safeReturnTo(searchParams.get('returnTo')));
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', py: 4, background: 'radial-gradient(circle at 12% 12%, rgba(0,167,111,.12), transparent 34%), #F9FAFB' }}>
      <Container maxWidth="sm">
        <Stack alignItems="center" spacing={3}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: 'primary.main', color: 'common.white', display: 'grid', placeItems: 'center' }}>
              <AccountBalanceWalletRounded />
            </Box>
            <Typography variant="h5">Money Guru 5</Typography>
          </Stack>

          <Card sx={{ width: 1, p: { xs: 3, sm: 5 }, borderRadius: 2 }}>
            <Stack spacing={1} mb={4}>
              <Typography variant="h4">Welcome back</Typography>
              <Typography color="text.secondary">Sign in to manage your personal and clinic finances.</Typography>
            </Stack>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.5}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField
                  autoFocus
                  autoComplete="email"
                  label="Email address"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  error={Boolean(fieldErrors.email)}
                  helperText={fieldErrors.email}
                  fullWidth
                />
                <TextField
                  autoComplete="current-password"
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  error={Boolean(fieldErrors.password)}
                  helperText={fieldErrors.password}
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((value) => !value)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOffRounded /> : <VisibilityRounded />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button type="submit" variant="contained" size="large" disabled={submitting}>
                  {submitting ? <CircularProgress size={24} color="inherit" /> : 'Sign in'}
                </Button>
              </Stack>
            </Box>
          </Card>
          <Typography variant="caption" color="text.secondary">Secure session · Canada (CAD)</Typography>
        </Stack>
      </Container>
    </Box>
  );
}
