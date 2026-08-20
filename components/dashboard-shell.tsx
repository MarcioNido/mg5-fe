'use client';

import MenuRounded from '@mui/icons-material/MenuRounded';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { useTenant } from '@/features/tenants/tenant-context';
import { routes } from '@/lib/config/routes';

import { AccountMenu } from './account-menu';
import { navigation } from './dashboard-nav';
import { Logo } from './logo';
import { TenantSelector } from './tenant-selector';

const drawerWidth = 272;

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { tenants, selectedSlug, loading, error, retry } = useTenant();
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Stack height="100%">
      <Box px={3.5} py={2.25}><Logo /></Box>
      <List component="nav" aria-label="Main navigation" sx={{ px: 2, py: 1 }}>
        {navigation.map((item) => {
          const active = item.href === routes.dashboard ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              selected={active}
              sx={{ mb: 0.5, borderRadius: 1, minHeight: 48, color: active ? 'primary.dark' : 'text.secondary', '&.Mui-selected': { bgcolor: 'rgba(0,167,111,.10)' }, '&.Mui-selected:hover': { bgcolor: 'rgba(0,167,111,.16)' } }}
            >
              <ListItemIcon sx={{ minWidth: 42, color: 'inherit' }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 700 : 600 }} />
            </ListItemButton>
          );
        })}
      </List>
      <Box flexGrow={1} />
      <Box p={3}>
        <Typography variant="caption" color="text.secondary">Management finance</Typography>
        <Typography variant="caption" display="block" color="text.disabled">CAD · America/Toronto</Typography>
      </Box>
    </Stack>
  );

  const pageName = navigation.find((item) => item.href === pathname)?.label ?? 'Dashboard';

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      <AppBar position="fixed" color="inherit" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)', width: { lg: `calc(100% - ${drawerWidth}px)` }, ml: { lg: `${drawerWidth}px` } }}>
        <Toolbar sx={{ minHeight: '72px !important', px: { xs: 2, sm: 3 } }}>
          <IconButton aria-label="Open navigation" onClick={() => setMobileOpen(true)} sx={{ display: { lg: 'none' }, mr: 1 }}><MenuRounded /></IconButton>
          <Box flexGrow={1} />
          <Stack direction="row" alignItems="center" spacing={{ xs: 0.5, sm: 1.5 }}>
            <TenantSelector />
            <AccountMenu />
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', lg: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}>
          {drawer}
        </Drawer>
        <Drawer variant="permanent" open sx={{ display: { xs: 'none', lg: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth, borderRightStyle: 'dashed' } }}>
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, pt: '72px' }}>
        <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 5 } }}>
          <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: 2 }}>
            <Typography component={Link} href={routes.dashboard} variant="body2" color="text.secondary">Money Guru</Typography>
            <Typography variant="body2" color="text.primary">{pageName}</Typography>
          </Breadcrumbs>

          {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={retry}>Retry</Button>} sx={{ mb: 3 }}>{error}</Alert>}
          {!loading && !error && tenants.length > 1 && !selectedSlug && (
            <Alert severity="info" sx={{ mb: 3 }}>Choose Personal or Clinic above before loading financial data.</Alert>
          )}
          {!loading && !error && tenants.length === 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>No financial profiles are available for this account.</Alert>
          )}
          {children}
        </Container>
      </Box>
    </Box>
  );
}
