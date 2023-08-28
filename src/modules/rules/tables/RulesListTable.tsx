import {useCallback, useEffect, useState} from "react";
import {Card, Table, TableBody, TableContainer} from "@mui/material";
import {useSnackbar} from "notistack";
import Scrollbar from "components/scrollbar";
import {useTheme} from "@mui/material/styles";
import {ICollectionMetadata} from "../../../common/types";
import {TableHeadCustom, TableNoData, TablePaginationCustom, useTable} from "../../../components/table";
import {RuleResource} from "../../../common/types/rules";
import RulesListTableRow from "./RulesListTableRow";
import CustomBackdrop from "../../../components/custom-backdrop/CustomBackdrop";
import {Rule} from "../../../common/apis/Rule";

const TABLE_HEAD = [
    { id: 'content', label: 'Content', align: 'left' },
    { id: 'account', label: 'Account', align: 'left' },
    { id: 'category', label: 'Category', align: 'left' },
    { id: 'actions', label: '', align: 'right' },
];

export default function RulesListTable() {
    const [tableData, setTableData] = useState<RuleResource[]>();
    const [tableMetadata, setTableMetadata] = useState<ICollectionMetadata>();
    const [isLoading, setIsLoading] = useState(false);
    const { dense, onChangeDense, page, onChangePage, rowsPerPage, onChangeRowsPerPage } = useTable();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();

    const fetchPage = useCallback(() => {
        setIsLoading(true);
        Rule.getAll({})
            .then((data) => {
                setTableData(data.data);
                setTableMetadata(data.meta);
                setIsLoading(false);
            })
            .catch((error) => {
                enqueueSnackbar(error.response.data.message, { variant: 'error' });
                setIsLoading(false);
            });
    }, [enqueueSnackbar]);


    useEffect(() => {
        fetchPage();
    }, [fetchPage])


    return (
        <Card>
            <TableContainer>
                <CustomBackdrop open={isLoading} theme={theme} />
                <Scrollbar>
                    <Table size='small'>
                        <TableHeadCustom headLabel={TABLE_HEAD} />
                        <TableBody>
                            {tableData ? (
                                tableData?.map((row: RuleResource) => <RulesListTableRow row={row} />)
                            ) : (
                                <TableNoData isNotFound={false} />
                            )}
                        </TableBody>
                    </Table>
                </Scrollbar>
            </TableContainer>
            <TablePaginationCustom
                count={tableMetadata ? tableMetadata.total : 0}
                page={tableMetadata ? tableMetadata.current_page - 1 : 0}
                rowsPerPage={tableMetadata ? tableMetadata.per_page : 5}
                onPageChange={onChangePage}
                onRowsPerPageChange={onChangeRowsPerPage}
                dense={dense}
                onChangeDense={onChangeDense}
            />
        </Card>
    )
}
