import {useCallback, useEffect, useState} from "react";
import {TableHeadCustom, TableNoData, TablePaginationCustom, useTable} from "components/table";
import {useSnackbar} from "notistack";
import {useTheme} from "@mui/material/styles";
import {BalanceResource, ICollectionMetadata} from "common/types";
import useFilter from "components/table/useFilter";
import {Transaction} from "common/apis/Transaction";
import {fDateISOString, fMonth} from "utils/formatTime";
import {Box, Card, Divider, Stack, Table, TableBody, TableContainer, Typography} from "@mui/material";
import {TableFilterBar, TableFilterBarProps} from "components/table/TableFilterBar";
import CustomBackdrop from "components/custom-backdrop/CustomBackdrop";
import Scrollbar from "components/scrollbar";
import {TransactionResource} from "../types";
import TransactionsListTableRow from "./TransactionsListTableRow";
import {fCurrency, fShortenNumber} from "../../../utils/formatNumber";
import TransactionsListTableBalance from "./TransactionsListTableBalance";
import {Balance} from "../../../common/apis/Balance";

const TABLE_HEAD = [
    { id: 'account_number', label: 'Account', align: 'left' },
    { id: 'description', label: 'Description', align: 'left' },
    { id: 'transaction_date', label: 'Date', align: 'left' },
    { id: 'amount', label: 'Amount', align: 'right' },
    { id: 'actions', label: '', align: 'right' },
];

export default function TransactionsListTable() {
    const [tableData, setTableData] = useState<TransactionResource[]>();
    const [tableMetadata, setTableMetadata] = useState<ICollectionMetadata>();
    const [balanceData, setBalanceData] = useState<BalanceResource>();
    const [isLoading, setIsLoading] = useState(false);
    const { dense, onChangeDense, page, onChangePage, rowsPerPage, onChangeRowsPerPage } = useTable();
    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();

    // FILTERS
    const AccountFilterOptions = [
        {value: '06402-5031752', label: 'Marcio RBC Chequing'},
        {value: 2, label: 'Marcio RBC Savings'},
        {value: 3, label: 'Marcio Visa RBC'}
    ];

    const { filterValue: filteraccount_number, handleFilterChange: handleFilteraccount_numberChange } = useFilter('');
    const { filterValue: filterMonth, handleFilterChange: handleFilterMonthChange } =
        useFilter(null);

    const fetchBalance = useCallback(() => {
        setIsLoading(true);
        setBalanceData(undefined);
        if (filteraccount_number && filterMonth) {
            Balance.get(filteraccount_number, fMonth(filterMonth))
                .then((data) => {
                    setBalanceData(data.data);
                    setIsLoading(false);
                })
                .catch((error) => {
                    enqueueSnackbar(error.response.data.message, { variant: 'error' })
                    setIsLoading(false);
                })
        }

    }, [enqueueSnackbar, filteraccount_number, filterMonth])

    const fetchPage = useCallback(() => {
        setIsLoading(true);
        Transaction.getAll({
            page: page + 1,
            page_size: rowsPerPage,
            filters: [
                { column: 'account_number', value: filteraccount_number },
                { column: 'month', value: (fMonth(filterMonth)) },
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
    }, [enqueueSnackbar, filterMonth, filteraccount_number, page, rowsPerPage]);

    useEffect(() => {
        fetchPage();
    }, [fetchPage]);

    useEffect(() => {
        fetchBalance();
    }, [fetchBalance])

    const filtersConfig: TableFilterBarProps = {
        config: [
            {
                column: 'account_number',
                label: 'Account',
                type: 'select',
                options: AccountFilterOptions,
                defaultValue: '',
                value: filteraccount_number,
                onFilterEvent: handleFilteraccount_numberChange,
            },
            {
                column: 'month',
                label: 'Data',
                type: 'month',
                defaultValue: null,
                value: filterMonth,
                onFilterEvent: handleFilterMonthChange,
            },
        ],
        isFiltered: !!(filteraccount_number || filterMonth),
    };

    return (
        <>
            <Card sx={{ mb: 2 }}>
                <TransactionsListTableBalance
                    initialBalance={balanceData?.initialBalance ?? 0}
                    totalCredits={balanceData?.totalCredits ?? 0}
                    totalDebits={balanceData?.totalDebits ?? 0}
                    finalBalance={balanceData?.finalBalance ?? 0}
                />
            </Card>

            <Card>
            <TableFilterBar config={filtersConfig.config} isFiltered={filtersConfig.isFiltered} />

            <TableContainer>
                <CustomBackdrop open={isLoading} theme={theme} />
                <Scrollbar>
                    <Table size={dense ? 'small' : 'medium'}>
                        <TableHeadCustom headLabel={TABLE_HEAD} />
                        <TableBody>
                            {tableData ? (
                                tableData?.map((row: TransactionResource) => <TransactionsListTableRow row={row} />)
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
            </Card>
        </>
    );

}
