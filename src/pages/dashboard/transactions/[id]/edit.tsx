import DashboardLayout from "layouts/dashboard";
import {useSnackbar} from "notistack";
import {useRouter} from "next/router";
import Head from "next/head";
import {Container} from "@mui/material";
import {useEffect, useState} from "react";
import {useSettingsContext} from "../../../../components/settings";
import CustomBreadcrumbs from "../../../../components/custom-breadcrumbs";
import {PATH_DASHBOARD} from "../../../../routes/paths";
import {TransactionResource} from "../../../../modules/transactions/types";
import {Transaction} from "../../../../common/apis/Transaction";
import TransactionNewEditForm from "../../../../modules/transactions/forms/TransactionNewEditForm";

EditTransactionPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function EditTransactionPage() {
    const { themeStretch } = useSettingsContext();
    const [currentTransaction, setCurrentTransaction] = useState<TransactionResource>();
    const { enqueueSnackbar } = useSnackbar();

    const {
        query: { id },
    } = useRouter();

    useEffect(() => {
        Transaction.get(id as string)
            .then((response) => {
                setCurrentTransaction(response.data);
            })
            .catch((error) => {
                enqueueSnackbar(error.response.data.message, { variant: 'error' })
            });
    }, [enqueueSnackbar, id])

    return (
        <>
            <Head>
                <title> Edit Transaction | MoneyGuru5</title>
            </Head>

            <Container maxWidth={themeStretch ? false : 'lg'}>
                <CustomBreadcrumbs
                    heading="Edit transaction"
                    links={[
                        {
                            name: 'Dashboard',
                            href: PATH_DASHBOARD.general.banking,
                        },
                        {
                            name: 'Transactions',
                            href: PATH_DASHBOARD.general.transactions,
                        },
                        { name: currentTransaction?.id.toString() },
                    ]}
                />

                <TransactionNewEditForm isEdit currentTransaction={currentTransaction} />
            </Container>
        </>
    );
}
