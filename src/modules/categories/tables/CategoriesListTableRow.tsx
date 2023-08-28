import {IconButton, MenuItem, TableCell, TableRow} from "@mui/material";
import {useState} from "react";
import { useRouter } from "next/router";
import Iconify from "../../../components/iconify";
import MenuPopover from "../../../components/menu-popover";
import {CategoryResource} from "../../../common/types/categories";

type Props = {
    row: CategoryResource;
};
export default function CategoriesListTableRow({row}: Props) {
    const [openPopover, setOpenPopover] = useState<HTMLElement | null>(null);
    const router = useRouter();
    

    const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
        setOpenPopover(event.currentTarget);
    };

    const handleClosePopover = () => {
        setOpenPopover(null);
    };


    function onEditRow() {
        router.push(`/dashboard/admin/categories/${row.id}/edit`);
    }

    return (
        <>
            <TableRow hover>
                <TableCell align="left" sx={{textTransform: 'capitalize'}}>
                    {
                        [...Array(row.level - 1)].map((e,i) =>
                            <Iconify key={i} icon="eva:chevron-right-fill" sx={{ verticalAlign: 'middle', mr: 3 }} />
                        )
                    }
                    {row.name}
                </TableCell>
                <TableCell align="left" sx={{textTransform: 'capitalize'}}>
                    {row.type}
                </TableCell>
                <TableCell align="left">
                    {row.level}
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

            {
                row.children?.map((child: CategoryResource) => (
                    <CategoriesListTableRow row={child} />
                ))
            }
        </>
    );
}
