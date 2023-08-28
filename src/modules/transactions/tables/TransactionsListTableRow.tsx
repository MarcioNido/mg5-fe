import {
  TableRow,
  TableCell, IconButton, MenuItem,
} from '@mui/material';

import {useState} from "react";
import {useRouter} from "next/router";
import {TransactionResource} from "../types";
import {fDate} from "../../../utils/formatTime";
import Iconify from "../../../components/iconify";
import MenuPopover from "../../../components/menu-popover";


// ----------------------------------------------------------------------

type Props = {
  row: TransactionResource;
};

export default function TransactionsListTableRow({
  row,
}: Props) {

  const router = useRouter();

  const { id, account, description, transaction_date, amount } = row;

  const [openPopover, setOpenPopover] = useState<HTMLElement | null>(null);

  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
    setOpenPopover(event.currentTarget);
  };

  const handleClosePopover = () => {
    setOpenPopover(null);
  };

  const onEditRow = () => {
     router.push(`/dashboard/transactions/${id}/edit`);
  }

  return (
    <>
      <TableRow hover>

        <TableCell align="left" sx={{ textTransform: 'capitalize' }}>
          {account.account_number}
        </TableCell>

        <TableCell align="left" sx={{ textTransform: 'capitalize' }}>
          {description}
        </TableCell>

        <TableCell align="left">
          {fDate(transaction_date)}
        </TableCell>

        <TableCell align="right">
          {amount}
        </TableCell>

        <TableCell align="right">
          <IconButton color={openPopover ? 'inherit' : 'default'} onClick={handleOpenPopover}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>

      </TableRow>

      <MenuPopover
          open={openPopover}
          onClose={handleClosePopover}
          arrow="right-top"
          sx={{ width: 160 }}
      >
        <MenuItem
            onClick={() => {
              onEditRow();
              handleClosePopover();
            }}
        >
          <Iconify icon="eva:edit-2-fill" />
          Edit
        </MenuItem>
      </MenuPopover>

    </>
  );
}
