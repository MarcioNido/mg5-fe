'use client';

import UploadFileRounded from '@mui/icons-material/UploadFileRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useRef, useState } from 'react';

import type { Account } from '@/features/accounts/types';
import { ApiError } from '@/lib/api/error';
import { messageFromError } from '@/lib/api/ui-error';

import { uploadStatement } from './service';
import type { ImportSummary } from './types';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function validateStatementFile(file: File) {
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension !== 'csv' && extension !== 'txt') return 'Choose a .csv or .txt file.';
  if (file.size > MAX_UPLOAD_BYTES) return 'The file must not be larger than 10 MB.';
  return null;
}

type Props = {
  tenantSlug: string | null;
  accounts: Account[];
  accountsLoading: boolean;
  accountsError: string | null;
  onAccountsRetry: () => void;
  onUploaded: (item: ImportSummary, duplicate: boolean) => void;
};

export function UploadForm({ tenantSlug, accounts, accountsLoading, accountsError, onAccountsRetry, onUploaded }: Props) {
  const [accountId, setAccountId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileHelpId = 'statement-file-help';
  const fileDisabled = uploading || accountsLoading || Boolean(accountsError) || accounts.length === 0;

  const chooseFile = (selected: File | null) => {
    setFile(selected);
    setFileError(selected ? validateStatementFile(selected) : null);
    setGeneralError(null);
  };

  const submit = async () => {
    if (!tenantSlug) { setGeneralError('Choose a financial profile before importing.'); return; }
    if (!accountId) { setGeneralError('Choose an account.'); return; }
    if (!file) { setFileError('Choose a statement file.'); return; }
    const validation = validateStatementFile(file);
    if (validation) { setFileError(validation); return; }

    setUploading(true);
    setGeneralError(null);
    try {
      const response = await uploadStatement(tenantSlug, accountId, file);
      onUploaded(response.data, response.meta.duplicate_upload);
      setFile(null);
      setFileError(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 422) {
        setFileError(reason.validationErrors?.file?.[0] ?? null);
      }
      setGeneralError(messageFromError(reason, 'Unable to upload this statement.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Upload statement</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>RBC and Triangle CSV or TXT exports are supported, up to 10 MB.</Typography>
        <Stack spacing={2} mt={3}>
          {generalError && <Alert severity="error">{generalError}</Alert>}
          {accountsError ? (
            <Alert severity="error" action={<Button color="inherit" onClick={onAccountsRetry}>Retry</Button>}>{accountsError}</Alert>
          ) : !accountsLoading && accounts.length === 0 ? (
            <Alert severity="info">Create an <Link component={NextLink} href="/dashboard/accounts" fontWeight={700}>account first</Link> before importing a statement.</Alert>
          ) : (
            <TextField select required label="Account" value={accountId} onChange={(event) => setAccountId(event.target.value)} disabled={accountsLoading || uploading}>
              {accounts.map((account) => <MenuItem key={account.id} value={String(account.id)}>{account.name}</MenuItem>)}
            </TextField>
          )}
          <Box
            role="button"
            tabIndex={fileDisabled ? -1 : 0}
            aria-label="Choose file"
            aria-disabled={fileDisabled}
            aria-describedby={fileHelpId}
            onClick={() => { if (!fileDisabled) inputRef.current?.click(); }}
            onKeyDown={(event) => {
              if (!fileDisabled && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            sx={{ border: '1px dashed', borderColor: fileError ? 'error.main' : 'divider', borderRadius: 1.5, p: 2.5, cursor: fileDisabled ? 'default' : 'pointer', bgcolor: 'background.default', opacity: fileDisabled ? 0.6 : 1 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <UploadFileRounded color="primary" />
              <Box minWidth={0}>
                <Typography fontWeight={700} noWrap>{file?.name ?? 'Choose one statement file'}</Typography>
                <Typography id={fileHelpId} role={fileError ? 'alert' : undefined} variant="caption" color={fileError ? 'error.main' : 'text.secondary'}>{fileError ?? '.csv or .txt · maximum 10 MB'}</Typography>
              </Box>
            </Stack>
            <input
              ref={inputRef}
              type="file"
              aria-label="Statement file"
              aria-invalid={Boolean(fileError)}
              aria-describedby={fileHelpId}
              accept=".csv,.txt,text/csv,text/plain"
              disabled={fileDisabled}
              tabIndex={-1}
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}
            />
          </Box>
          <Button variant="contained" onClick={submit} disabled={uploading || !tenantSlug || accountsLoading || Boolean(accountsError) || !accounts.length} startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <UploadFileRounded />}>
            {uploading ? 'Uploading…' : 'Import CSV'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
