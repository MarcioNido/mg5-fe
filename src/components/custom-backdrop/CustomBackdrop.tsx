import { Theme } from '@mui/material/styles';
import { Backdrop, CircularProgress } from '@mui/material';
import React from 'react';

export default function CustomBackdrop({
  open,
  theme: { palette },
}: {
  open: boolean;
  theme: Theme;
}) {
  return (
    <Backdrop
      open={open}
      sx={{
        position: 'absolute',
        alignItems: 'center',
        background: palette.action.disabledBackground,
        zIndex: 999999,
      }}
    >
      <CircularProgress color="primary" sx={{ position: 'relative', alignItems: 'center' }} />
    </Backdrop>
  );
}
