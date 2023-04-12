// next
import Head from 'next/head';
// @mui
import {useTheme} from '@mui/material/styles';
import {Grid, Container, Stack, Typography, Box} from '@mui/material';
// layouts
import {useCallback, useEffect, useState} from "react";
import DashboardLayout from '../../layouts/dashboard';
// _mock_
import {
    _bankingContacts,
    _bankingCreditCard,
    _bankingRecentTransitions,
} from '../../_mock/arrays';
// components
import {useSettingsContext} from '../../components/settings';
// sections
import {
    BankingLatestUploads,
    BankingWidgetSummary,
    BankingCurrentBalance,
    BankingBalanceStatistics,
    BankingRecentTransitions,
    BankingExpensesCategories,
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

// ----------------------------------------------------------------------
export default function GeneralBankingPage() {
    const theme = useTheme();
    const [latestUploads, setLatestUploads] = useState([]);
    const [latestTransactions, setLatestTransactions] = useState<TransactionInterface[]>([]);

    const {themeStretch} = useSettingsContext();

    const fetchLatestUploads = useCallback(() => {
        FileApi.getAll().then(data => {
            setLatestUploads(data);
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [latestUploads]);

    const fetchTransactionData = useCallback(async () => {
        const transactionData = await Transaction.getAll();
        setLatestTransactions(transactionData);
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
                                percent={2.6}
                                total={18765}
                                chart={{
                                    series: [111, 136, 76, 108, 74, 54, 57, 84],
                                }}
                            />

                            <BankingWidgetSummary
                                title="Expenses"
                                color="warning"
                                icon="eva:diagonal-arrow-right-up-fill"
                                percent={-0.5}
                                total={8938}
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
                            <BankingBalanceStatistics
                                title="Balance Statistics"
                                subheader="(+43% Income | +12% Expense) than last year"
                                chart={{
                                    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
                                    colors: [theme.palette.primary.main, theme.palette.warning.main],
                                    series: [
                                        {
                                            type: 'Week',
                                            data: [
                                                {name: 'Income', data: [10, 41, 35, 151, 49, 62, 69, 91, 48]},
                                                {name: 'Expenses', data: [10, 34, 13, 56, 77, 88, 99, 77, 45]},
                                            ],
                                        },
                                        {
                                            type: 'Month',
                                            data: [
                                                {name: 'Income', data: [148, 91, 69, 62, 49, 51, 35, 41, 10]},
                                                {name: 'Expenses', data: [45, 77, 99, 88, 77, 56, 13, 34, 10]},
                                            ],
                                        },
                                        {
                                            type: 'Year',
                                            data: [
                                                {name: 'Income', data: [76, 42, 29, 41, 27, 138, 117, 86, 63]},
                                                {name: 'Expenses', data: [80, 55, 34, 114, 80, 130, 15, 28, 55]},
                                            ],
                                        },
                                    ],
                                }}
                            />

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
