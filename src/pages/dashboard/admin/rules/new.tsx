import DashboardLayout from "layouts/dashboard";
import Head from "next/head";
import {Container} from "@mui/material";
import {useSettingsContext} from "../../../../components/settings";
import CustomBreadcrumbs from "../../../../components/custom-breadcrumbs";
import {PATH_DASHBOARD} from "../../../../routes/paths";
import CategoryNewEditForm from "../../../../modules/categories/forms/CategoryNewEditForm";
import RuleNewEditForm from "../../../../modules/rules/forms/RuleNewEditForm";

NewRulePage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function NewRulePage() {
    const { themeStretch } = useSettingsContext();
 
    return (
        <>
            <Head>
                <title> New Rule | Admin</title>
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
                            name: 'Categories',
                            href: PATH_DASHBOARD.rules.list,
                        },
                        { name: 'New' },
                    ]}
                />

                <RuleNewEditForm />
            </Container>
        </>
    );
}
