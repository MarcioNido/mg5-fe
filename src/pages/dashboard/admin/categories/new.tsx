import DashboardLayout from "layouts/dashboard";
import Head from "next/head";
import {Container} from "@mui/material";
import {useSettingsContext} from "../../../../components/settings";
import CustomBreadcrumbs from "../../../../components/custom-breadcrumbs";
import {PATH_DASHBOARD} from "../../../../routes/paths";
import CategoryNewEditForm from "../../../../modules/categories/forms/CategoryNewEditForm";

NewCategoryPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function NewCategoryPage() {
    const { themeStretch } = useSettingsContext();
 
    return (
        <>
            <Head>
                <title> User: Edit user | Minimal UI</title>
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
                            href: PATH_DASHBOARD.categories.list,
                        },
                        { name: 'New' },
                    ]}
                />

                <CategoryNewEditForm />
            </Container>
        </>
    );
}
