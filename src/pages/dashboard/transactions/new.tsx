import Head from "next/head";
import {Container} from "@mui/material";
import CustomBreadcrumbs from "../../../components/custom-breadcrumbs";
import {PATH_DASHBOARD} from "../../../routes/paths";
import TransactionNewEditForm from "../../../modules/transactions/forms/TransactionNewEditForm";
import {useSettingsContext} from "../../../components/settings";

export default function NewTransactionPage() {
    const { themeStretch } = useSettingsContext();

    return (
        <>
            <Head>
                <title> New Transaction | MoneyGuru5</title>
            </Head>

            <Container maxWidth={themeStretch ? false : 'lg'}>
                <CustomBreadcrumbs
                    heading="New transaction"
                    links={[
                        {
                            name: 'Dashboard',
                            href: PATH_DASHBOARD.general.banking,
                        },
                        {
                            name: 'Transactions',
                            href: PATH_DASHBOARD.general.transactions,
                        },
                        { name: 'New' },
                    ]}
                />

                <TransactionNewEditForm isEdit={false} />
            </Container>
        </>
    );
}
