// next
import Head from 'next/head';
// @mui
import {useTheme} from '@mui/material/styles';
import {Container, Grid, Stack, Typography} from '@mui/material';
// layouts
import {useCallback, useEffect, useState} from "react";
import DashboardLayout from '../../layouts/dashboard';
// _mock_
import {_bankingCreditCard,} from '../../_mock/arrays';
// components
import {useSettingsContext} from '../../components/settings';
// sections
import {
    BankingBalanceStatistics,
    BankingCurrentBalance,
    BankingExpensesCategories,
    BankingLatestUploads,
    BankingRecentTransitions,
    BankingWidgetSummary,
} from '../../sections/@dashboard/general/banking';
import {UploadBox} from "../../components/upload";
import Iconify from "../../components/iconify";
import {FileApi} from "../../common/apis/FileApi";
import {TransactionInterface} from "../../common/types/transactions";
import {Transaction} from "../../common/apis/Transaction";


// ----------------------------------------------------------------------

GeneralBankingPage.getLayout = (page: React.ReactElement) => (
    <DashboardLayout>{page}</DashboardLayout>
);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type IMonthlyBalance = {
    categories?: string[];
    income?: number[];
    expense?: number[];
}

// ----------------------------------------------------------------------
export default function GeneralBankingPage() {
    const theme = useTheme();
    const [latestUploads, setLatestUploads] = useState([]);
    const [latestTransactions, setLatestTransactions] = useState<TransactionInterface[]>([]);
    const [currentMonthIncome, setCurrentMonthIncome] = useState(0);
    const [currentMonthExpense, setCurrentMonthExpense] = useState(0);
    const [previousMonthIncome, setPreviousMonthIncome] = useState(0);
    const [previousMonthExpenses, setPreviousMonthExpenses] = useState(0);
    const [monthlyBalance, setMonthlyBalance] = useState<IMonthlyBalance>({});

    const {themeStretch} = useSettingsContext();

    const fetchLatestUploads = useCallback(() => {
        FileApi.getAll().then(data => {
            setLatestUploads(data);
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [latestUploads]);

    const parseMonthlyBalanceResponse = (balance: any) => {
        const currentDate = new Date();
        const categories = [];
        const income = [];
        const expense = [];

        for (let i = 11; i >= 0; i-=1) {
            const balanceDate = new Date();
            balanceDate.setMonth(currentDate.getMonth() - i);
            const month = balanceDate.getMonth() + 1;
            const year = balanceDate.getFullYear();

            categories.push(`${MONTHS[month - 1]} ${year}`);
            income.push(Math.floor(balance.income.find((item: any) => item.month === month && item.year === year)?.total || 0));
            expense.push(Math.floor(Math.abs(balance.expense.find((item: any) => item.month === month && item.year === year)?.total || 0)));
        }

        return {
            categories,
            income,
            expense,
        };
    }

    const fetchMonthlyStats = useCallback(async () => {
        const currentMonthDate = new Date();
        const currentMonth = currentMonthDate.getMonth();
        const currentYear = currentMonthDate.getFullYear();

        const previousMonthDate = new Date();
        previousMonthDate.setMonth(currentMonth - 1);
        const previousMonth = previousMonthDate.getMonth();
        const previousYear = previousMonthDate.getFullYear();

        const currentMonthIncomeResponse = await Transaction.getIncomeByMonth(currentMonth + 1, currentYear);
        setCurrentMonthIncome(currentMonthIncomeResponse.income);

        const currentMonthExpensesResponse = await Transaction.getExpenseByMonth(currentMonth + 1, currentYear);
        setCurrentMonthExpense(currentMonthExpensesResponse.expense);

        const previousMonthIncomeResponse = await Transaction.getIncomeByMonth(previousMonth + 1, previousYear);
        setPreviousMonthIncome(previousMonthIncomeResponse.income);

        const previousMonthExpensesResponse = await Transaction.getExpenseByMonth(previousMonth + 1, previousYear);
        setPreviousMonthExpenses(previousMonthExpensesResponse.expense);

        const monthlyBalanceResponse = await Transaction.getMonthlyBalance(currentMonth + 1, currentYear);
        setMonthlyBalance(parseMonthlyBalanceResponse(monthlyBalanceResponse));

    }, []);

    const fetchTransactionData = useCallback(async () => {
        const transactionData = await Transaction.getAll({});
        console.log(transactionData);
        setLatestTransactions(transactionData.data);
    }, []);

    const handleDrop = useCallback(
        (acceptedFiles: File[]) => {
            const currentFile = Object.assign(acceptedFiles[0]);

            FileApi.store(currentFile)
                .then(() => fetchLatestUploads())
                .catch(error => console.log(error));
        },
        [fetchLatestUploads]
    );


    useEffect(() => {
        fetchTransactionData()
            .catch(console.error)
    }, [fetchTransactionData]);

    useEffect(() => {
        fetchMonthlyStats()
            .catch(console.error)
    }, [fetchMonthlyStats]);

    return (
        <>
            <Head>
                <title> General: Banking | Minimal UI</title>
            </Head>

            <Container maxWidth={themeStretch ? false : 'xl'}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={7}>
                        <Stack direction={{xs: 'column', sm: 'row'}} spacing={3}>
                            <BankingWidgetSummary
                                title="Income"
                                icon="eva:diagonal-arrow-left-down-fill"
                                previous={previousMonthIncome}
                                total={currentMonthIncome}
                                chart={{
                                    series: [111, 136, 76, 108, 74, 54, 57, 84],
                                }}
                            />

                            <BankingWidgetSummary
                                title="Expenses"
                                color="warning"
                                icon="eva:diagonal-arrow-right-up-fill"
                                previous={previousMonthExpenses}
                                total={currentMonthExpense}
                                chart={{
                                    series: [111, 136, 76, 108, 74, 54, 57, 84],
                                }}
                            />
                        </Stack>
                    </Grid>

                    <Grid item xs={12} md={5}>
                        <BankingCurrentBalance list={_bankingCreditCard}/>
                    </Grid>

                    <Grid item xs={12} md={8}>
                        <Stack spacing={3}>
                            {monthlyBalance.categories && (<BankingBalanceStatistics
                                title="Balance Statistics"
                                subheader="monthly analytics"
                                chart={{
                                    categories: monthlyBalance.categories,
                                    colors: [theme.palette.primary.main, theme.palette.warning.main],
                                    series: [
                                        // {
                                        //     type: 'Week',
                                        //     data: [
                                        //         {name: 'Income', data: monthlyBalance.income ?? []},
                                        //         {name: 'Expenses', data: monthlyBalance.expense ?? []},
                                        //     ],
                                        // },
                                        {
                                            type: 'Month',
                                            data: [
                                                {name: 'Income', data: monthlyBalance.income ?? []},
                                                {name: 'Expenses', data: monthlyBalance.expense ?? []},
                                            ],
                                        },
                                        // {
                                        //     type: 'Year',
                                        //     data: [
                                        //         {name: 'Income', data: monthlyBalance.income ?? []},
                                        //         {name: 'Expenses', data: monthlyBalance.expense ?? []},
                                        //     ],
                                        // },
                                    ],
                                }}
                            />)}

                            <BankingExpensesCategories
                                title="Expenses Categories"
                                chart={{
                                    series: [
                                        {label: 'Category 1', value: 14},
                                        {label: 'Category 2', value: 23},
                                        {label: 'Category 3', value: 21},
                                        {label: 'Category 4', value: 17},
                                        {label: 'Category 5', value: 15},
                                        {label: 'Category 6', value: 10},
                                        {label: 'Category 7', value: 12},
                                        {label: 'Category 8', value: 17},
                                        {label: 'Category 9', value: 21},
                                    ],
                                    colors: [
                                        theme.palette.primary.main,
                                        theme.palette.warning.dark,
                                        theme.palette.success.darker,
                                        theme.palette.error.main,
                                        theme.palette.info.dark,
                                        theme.palette.info.darker,
                                        theme.palette.success.main,
                                        theme.palette.warning.main,
                                        theme.palette.info.main,
                                    ],
                                }}
                            />

                            <BankingRecentTransitions
                                title="Recent Transactions"
                                tableData={latestTransactions}
                                tableLabels={[
                                    {id: 'account', label: 'Description'},
                                    {id: 'date', label: 'Date'},
                                    {id: 'amount', label: 'Amount', align: 'right'},
                                    {id: ''},
                                ]}
                            />
                        </Stack>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Stack spacing={3}>

                            <UploadBox
                                onDrop={handleDrop}
                                placeholder={
                                    <Stack spacing={0.5} alignItems="center" sx={{color: 'text.disabled'}}>
                                        <Iconify icon="eva:cloud-upload-fill" width={40}/>
                                        <Typography variant="body2">Upload file</Typography>
                                    </Stack>
                                }
                                sx={{
                                    mb: 3,
                                    py: 2.5,
                                    width: 'auto',
                                    height: 'auto',
                                    borderRadius: 1.5,
                                }}
                                maxFiles={1}
                            />

                            <BankingLatestUploads
                                title="Latest Uploads"
                                subheader="last 5 uploads"
                                list={latestUploads}
                                refresh={fetchLatestUploads}
                            />

                        </Stack>
                    </Grid>
                </Grid>
            </Container>
        </>
    );
}
