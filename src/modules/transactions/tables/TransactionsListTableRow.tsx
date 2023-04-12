import {
  TableRow,
  TableCell, IconButton, MenuItem,
} from '@mui/material';

import {useState} from "react";
import {useRouter} from "next/router";
import {ITransaction} from "../types";
import {fDate} from "../../../utils/formatTime";
import Iconify from "../../../components/iconify";
import MenuPopover from "../../../components/menu-popover";


// ----------------------------------------------------------------------

type Props = {
  row: ITransaction;
};

export default function TransactionsListTableRow({
  row,
}: Props) {

  const router = useRouter();

  const { id, accountNumber, description, transactionDate, amount } = row;

  const [openPopover, setOpenPopover] = useState<HTMLElement | null>(null);

  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
    setOpenPopover(event.currentTarget);
  };

  const handleClosePopover = () => {
    setOpenPopover(null);
  };

  const onViewRow = () => {
     router.push(`/dashboard/transactions/${id}`);
  }

  return (
    <>
      <TableRow hover>

        <TableCell align="left" sx={{ textTransform: 'capitalize' }}>
          {accountNumber}
        </TableCell>

        <TableCell align="left" sx={{ textTransform: 'capitalize' }}>
          {description}
        </TableCell>

        <TableCell align="left">
          {fDate(transactionDate)}
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
              onViewRow();
              handleClosePopover();
            }}
        >
          <Iconify icon="eva:eye-fill" />
          Ver detalhes
        </MenuItem>
      </MenuPopover>

    </>
  );
}
