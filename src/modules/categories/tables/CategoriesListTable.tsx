import {useCallback, useEffect, useState} from "react";
import {Card, Table, TableBody, TableContainer} from "@mui/material";
import {useSnackbar} from "notistack";
import {useTheme} from "@mui/material/styles";
import {CategoryResource} from "common/types/categories";
import {ICollectionMetadata} from "../../../common/types";
import {TableHeadCustom, TableNoData, useTable} from "../../../components/table";
import {Categories} from "../../../common/apis/Categories";
import CategoriesListTableRow from "./CategoriesListTableRow";

const TABLE_HEAD = [
    { id: 'name', label: 'Category', align: 'left' },
    { id: 'type', label: 'Type', align: 'left' },
    { id: 'level', label: 'Level', align: 'left' },
    { id: 'actions', label: '', align: 'right' },
];

export default function CategoriesListTable() {
    const [tableData, setTableData] = useState<CategoryResource[]>();
    const [tableMetadata, setTableMetadata] = useState<ICollectionMetadata>();
    const [isLoading, setIsLoading] = useState(false);
    const { dense, onChangeDense, page, onChangePage, rowsPerPage, onChangeRowsPerPage } = useTable();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();

    const fetchPage = useCallback(() => {
        Categories.getAll({
            filters: [{ column: 'level', value: 1}]
        })
            .then((data) => {
                console.log(data.data);
                setTableData(data.data);
                setTableMetadata(data.meta);
            })
            .catch((error) => {
                console.log(error);
            });
    }, []);


    useEffect(() => {
        fetchPage();
    }, [fetchPage])


    return (
        <Card>
            <TableContainer>
                <Table size='small'>
                    <TableHeadCustom headLabel={TABLE_HEAD} />
                    <TableBody>
                        {tableData ? (
                            tableData?.map((row: CategoryResource) => <CategoriesListTableRow row={row} />)
                        ) : (
                            <TableNoData isNotFound={false} />
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Card>
    )
}
