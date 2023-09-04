import React, {useCallback, useEffect, useState} from "react";
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
import {Categories} from "../../../common/apis/Categories";
import {CategoryResource} from "../../../common/types/categories";
import useParseCategoriesList from "../../../hooks/use-parse-categories-list";
import {useSessionStorage} from "usehooks-ts";

const TABLE_HEAD = [
    { id: 'transaction_date', label: 'Date', align: 'left' },
    { id: 'description', label: 'Description', align: 'left' },
    { id: 'category', label: 'Category', align: 'left' },
    { id: 'amount', label: 'Amount', align: 'right' },
    { id: 'actions', label: '', align: 'right' },
];

export default function TransactionsListTable() {
    const [tableData, setTableData] = useState<TransactionResource[]>();
    const [tableMetadata, setTableMetadata] = useState<ICollectionMetadata>();
    const [balanceData, setBalanceData] = useState<BalanceResource>();
    const [parsedCategoriesList, setParsedCategoriesList] = useState<CategoryResource[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { dense, onChangeDense } = useTable();

    const [page, setPage] = useSessionStorage('transactionsListTablePage', 0);
    const [rowsPerPage, setRowsPerPage] = useSessionStorage('transactionsListTableRowsPerPage', 15);


    const { enqueueSnackbar } = useSnackbar();
    const theme = useTheme();
    const parseCategoriesList = useParseCategoriesList();

    // FILTERS
    const AccountFilterOptions = [
        {value: '06402-5031752', label: 'Marcio RBC Chequing'},
        {value: 2, label: 'Marcio RBC Savings'},
        {value: 3, label: 'Marcio Visa RBC'}
    ];

    const { filterValue: filterAccountNumber, handleFilterChange: handleFilterAccountNumberChange } = useFilter('');
    const { filterValue: filterMonth, handleFilterChange: handleFilterMonthChange } =
        useFilter(null);
    const { filterValue: filterCategory, handleFilterChange: handleFilterCategoryChange } = useFilter('');

    const onChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const onChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const fetchBalance = useCallback(() => {
        setIsLoading(true);
        setBalanceData(undefined);
        if (filterAccountNumber && filterMonth) {
            Balance.get(filterAccountNumber, fMonth(filterMonth))
                .then((data) => {
                    setBalanceData(data.data);
                    setIsLoading(false);
                })
                .catch((error) => {
                    enqueueSnackbar(error.response.data.message, { variant: 'error' })
                    setIsLoading(false);
                })
        }

    }, [enqueueSnackbar, filterAccountNumber, filterMonth])

    const fetchPage = useCallback(() => {
        setIsLoading(true);
        Transaction.getAll({
            page: page + 1,
            page_size: rowsPerPage,
            filters: [
                { column: 'account_number', value: filterAccountNumber },
                { column: 'category_id', value: filterCategory },
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
    }, [enqueueSnackbar, filterCategory, filterMonth, filterAccountNumber, page, rowsPerPage]);

    useEffect(() => {
        Categories.getAll({
            filters: [{ column: 'level', operator: 'lte', value: 1}],
            orderBy: [{ column: 'name', direction: 'asc' }],
        }).then((res) => setParsedCategoriesList(parseCategoriesList(res.data, 3)));
    }, []);

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
                value: filterAccountNumber,
                onFilterEvent: handleFilterAccountNumberChange,
            },
            {
                column: 'month',
                label: 'Data',
                type: 'month',
                defaultValue: null,
                value: filterMonth,
                onFilterEvent: handleFilterMonthChange,
            },
            {
                column: 'category',
                label: 'Category',
                type: 'category',
                options: parsedCategoriesList.map((category) => ({
                    value: category.id,
                    label: category.name,
                    level: category.level,
                })),
                defaultValue: '',
                value: filterCategory,
                onFilterEvent: handleFilterCategoryChange,
            },
        ],
        isFiltered: !!(filterAccountNumber || filterMonth),
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
