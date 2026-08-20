'use client';

import LogoutRounded from '@mui/icons-material/LogoutRounded';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type MouseEvent } from 'react';

import { useAuth } from '@/features/auth/auth-context';

export function AccountMenu() {
  const { user, logout } = useAuth();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <IconButton aria-label="Open account menu" onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}>
        <Avatar sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontWeight: 700 }}>
          {user?.name?.charAt(0).toUpperCase() ?? 'M'}
        </Avatar>
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} PaperProps={{ sx: { width: 250, mt: 1 } }}>
        <Stack px={2} py={1}>
          <Typography variant="subtitle2" noWrap>{user?.name}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>{user?.email}</Typography>
        </Stack>
        <Divider />
        <MenuItem onClick={() => void logout()} sx={{ color: 'error.main' }}>
          <ListItemIcon><LogoutRounded fontSize="small" color="error" /></ListItemIcon>
          Log out
        </MenuItem>
      </Menu>
    </>
  );
}
