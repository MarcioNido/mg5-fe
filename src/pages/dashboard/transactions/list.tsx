import {useTheme} from "@mui/material/styles";
import {useState} from "react";
import {Button, Card, Container, Grid} from "@mui/material";
import NextLink from "next/link";
import {useSettingsContext} from "../../../components/settings";
import {useTable} from "../../../components/table";
import {TransactionInterface} from "../../../common/types/transactions";
import CustomBreadcrumbs from "../../../components/custom-breadcrumbs";
import {PATH_DASHBOARD} from "../../../routes/paths";
import Iconify from "../../../components/iconify";
import DashboardLayout from "../../../layouts/dashboard";
import TransactionsListTable from "../../../modules/transactions/tables/TransactionsListTable";

TransactionsListPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function TransactionsListPage() {
    const theme = useTheme();
    const { themeStretch } = useSettingsContext();
    const {
        dense,
        page,
        order,
        orderBy,
        rowsPerPage,
        setPage,
        //
        selected,
        setSelected,
        onSelectRow,
        onSelectAllRows,
        //
        onSort,
        onChangeDense,
        onChangePage,
        onChangeRowsPerPage,
    } = useTable({ defaultOrderBy: 'transactionDate' });
    const [tableData, setTableData] = useState<TransactionInterface[]>([]);


    return (
        <>
            <Container maxWidth={themeStretch ? false : 'lg'}>
                <CustomBreadcrumbs
                    heading="Transactions List"
                    links={[
                        {
                            name: 'Dashboard',
                            href: PATH_DASHBOARD.root,
                        },
                        {
                            name: 'Transactions',
                            href: PATH_DASHBOARD.transactions.root,
                        },
                        {
                            name: 'List',
                        },
                    ]}
                    action={
                        <Button
                            component={NextLink}
                            href={PATH_DASHBOARD.transactions.new}
                            variant="contained"
                            startIcon={<Iconify icon="eva:plus-fill" />}
                        >
                            New Transaction
                        </Button>
                    }
                />
            </Container>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <TransactionsListTable />
                </Grid>
            </Grid>
        </>
    );
}
