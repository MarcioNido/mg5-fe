import {IconButton, MenuItem, TableCell, TableRow} from "@mui/material";
import {useState} from "react";
import { useRouter } from "next/router";
import {RuleResource} from "common/types/rules";
import Iconify from "../../../components/iconify";
import MenuPopover from "../../../components/menu-popover";

type Props = {
    row: RuleResource;
};
export default function RulesListTableRow({row}: Props) {
    const [openPopover, setOpenPopover] = useState<HTMLElement | null>(null);
    const router = useRouter();
    

    const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
        setOpenPopover(event.currentTarget);
    };

    const handleClosePopover = () => {
        setOpenPopover(null);
    };


    function onEditRow() {
        router.push(`/dashboard/admin/rules/${row.id}/edit`);
    }

    return (
        <>
            <TableRow hover>
                <TableCell align="left" sx={{textTransform: 'capitalize'}}>
                    {row.content}
                </TableCell>
                <TableCell align="left" sx={{textTransform: 'capitalize'}}>
                    {row.account?.name}
                </TableCell>
                <TableCell align="left">
                    {row.category?.name}
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
