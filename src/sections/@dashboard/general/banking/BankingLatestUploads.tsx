// @mui
import {
  Box,
  Card,
  Stack,
  Button,
  Avatar,
  Tooltip,
  CardProps,
  Typography,
  CardHeader,
  IconButton, Chip,
} from '@mui/material';
// components
import {format} from "date-fns";
import Iconify from '../../../../components/iconify';

// ----------------------------------------------------------------------

interface Props extends CardProps {
  title?: string;
  subheader?: string;
  refresh?: React.MouseEventHandler<HTMLElement>;
  list: {
    id: string;
    filename: string;
    created_at: Date;
    status: string;
  }[];
}

export default function BankingLatestUploads({ title, subheader, list, refresh, ...other }: Props) {
  return (
    <Card {...other}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={
          <Tooltip title="Refresh">
            <IconButton color="primary" size="large" onClick={refresh}>
              <Iconify icon="eva:cloud-upload-outline" />
            </IconButton>
          </Tooltip>
        }
      />

      <Stack spacing={3} sx={{ p: 3 }}>
        {list.map((file) => (
          <Stack direction="row" alignItems="center" key={file.id}>
            <Chip label={file.status} color={file.status === 'pending' ? 'warning' : 'success'} sx={{ textTransform: 'capitalize' }} />

            <Box sx={{ flexGrow: 1, ml: 2, minWidth: 100 }}>
              <Typography variant="body2">{format(new Date(file.created_at), 'dd MMM yyyy p')}</Typography>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }} noWrap>
                {file.filename}
              </Typography>

            </Box>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
