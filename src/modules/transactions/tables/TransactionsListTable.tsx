import {useCallback, useEffect, useState} from "react";
import {TableHeadCustom, TableNoData, TablePaginationCustom, useTable} from "components/table";
import {useSnackbar} from "notistack";
import {useTheme} from "@mui/material/styles";
import {ICollectionMetadata} from "common/types";
import useFilter from "components/table/useFilter";
import {Transaction} from "common/apis/Transaction";
import {fDateISOString} from "utils/formatTime";
import {Table, TableBody, TableContainer} from "@mui/material";
import {TableFilterBar, TableFilterBarProps} from "components/table/TableFilterBar";
import CustomBackdrop from "components/custom-backdrop/CustomBackdrop";
import Scrollbar from "components/scrollbar";
import {ITransaction} from "../types";
import TransactionsListTableRow from "./TransactionsListTableRow";

const TABLE_HEAD = [
    { id: 'accountNumber', label: 'Account', align: 'left' },
    { id: 'description', label: 'Description', align: 'left' },
    { id: 'transactionDate', label: 'Date', align: 'left' },
    { id: 'amount', label: 'Amount', align: 'right' },
    { id: 'actions', label: '', align: 'right' },
];

export default function TransactionsListTable() {
    const [tableData, setTableData] = useState<ITransaction[]>();
    const [tableMetadata, setTableMetadata] = useState<ICollectionMetadata>();
    const [isLoading, setIsLoading] = useState(false);
    const { dense, onChangeDense, page, onChangePage, rowsPerPage, onChangeRowsPerPage } = useTable();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();

    // FILTERS
    const AccountFilterOptions = ['Marcio RBC Chequing', 'Marcio RBC Savings', 'Marcio Visa RBC'];
    const { filterValue: filterAccountNumber, handleFilterChange: handleFilterAccountNumberChange } = useFilter('');
    const { filterValue: filterTransactionDate, handleFilterChange: handleFilterTransactionDateChange } =
        useFilter(null);

    const fetchPage = useCallback(() => {
        setIsLoading(true);
        Transaction.getAll({
            page: page + 1,
            page_size: rowsPerPage,
            filters: [
                { column: 'account_number', value: filterAccountNumber },
                { column: 'transaction_date', value: fDateISOString(filterTransactionDate) },
            ],
        })
            .then((data) => {
                setTableData(data.data);
                setTableMetadata(data.meta);
                setIsLoading(false);
            })
            .catch((error) => {
                enqueueSnackbar(error.response.data.message, { variant: 'error' });
                setIsLoading(false);
            });
    }, [enqueueSnackbar, filterTransactionDate, filterAccountNumber, page, rowsPerPage]);

    useEffect(() => {
        fetchPage();
    }, [fetchPage]);

    const filtersConfig: TableFilterBarProps = {
        config: [
            {
                column: 'accountNumber',
                type: 'select',
                options: AccountFilterOptions,
                defaultValue: '',
                value: filterAccountNumber,
                onFilterEvent: handleFilterAccountNumberChange,
            },
            {
                column: 'transactionDate',
                type: 'date',
                defaultValue: null,
                value: filterTransactionDate,
                onFilterEvent: handleFilterTransactionDateChange,
            },
        ],
        isFiltered: !!(filterAccountNumber || filterTransactionDate),
    };

    return (
        <>
            <TableFilterBar config={filtersConfig.config} isFiltered={filtersConfig.isFiltered} />
            <TableContainer>
                <CustomBackdrop open={isLoading} theme={theme} />
                <Scrollbar>
                    <Table size={dense ? 'small' : 'medium'}>
                        <TableHeadCustom headLabel={TABLE_HEAD} />
                        <TableBody>
                            {tableData ? (
                                tableData?.map((row: ITransaction) => <TransactionsListTableRow row={row} />)
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
                //
                dense={dense}
                onChangeDense={onChangeDense}
            />
        </>
    );

}
