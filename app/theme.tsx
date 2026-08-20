'use client';

import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import type { ReactNode } from 'react';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#00A76F', dark: '#007867', light: '#5BE49B' },
    background: { default: '#F9FAFB', paper: '#FFFFFF' },
    text: { primary: '#1C252E', secondary: '#637381' },
    divider: 'rgba(145, 158, 171, 0.20)',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"MG5 Sans", "Public Sans", Arial, sans-serif',
    h3: { fontWeight: 800, letterSpacing: '-0.03em' },
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: 'none' },
  },
  components: {
    MuiButton: { styleOverrides: { root: { minHeight: 44, boxShadow: 'none' } } },
    MuiCard: { styleOverrides: { root: { boxShadow: '0 0 2px rgba(145,158,171,.2), 0 12px 24px -4px rgba(145,158,171,.12)' } } },
    MuiTextField: { defaultProps: { variant: 'outlined' } },
  },
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
