'use client';

import BusinessRounded from '@mui/icons-material/BusinessRounded';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

import { useTenant } from '@/features/tenants/tenant-context';
import { profileLabel } from '@/features/tenants/tenant-storage';

export function TenantSelector() {
  const { tenants, selectedSlug, loading, selectTenant } = useTenant();

  return (
    <FormControl size="small" sx={{ minWidth: { xs: 142, sm: 180 } }} disabled={loading}>
      <InputLabel id="financial-profile-label">Financial profile</InputLabel>
      <Select
        labelId="financial-profile-label"
        label="Financial profile"
        value={selectedSlug ?? ''}
        onChange={(event) => selectTenant(event.target.value)}
        startAdornment={loading ? <CircularProgress size={17} sx={{ mr: 1 }} /> : <BusinessRounded fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />}
      >
        {tenants.length > 1 && <MenuItem value="" disabled>Choose a profile</MenuItem>}
        {tenants.map((tenant) => <MenuItem key={tenant.id} value={tenant.slug}>{profileLabel(tenant)}</MenuItem>)}
      </Select>
    </FormControl>
  );
}
