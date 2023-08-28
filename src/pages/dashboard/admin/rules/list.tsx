
import NextLink from "next/link";
import {Button, Container, Grid} from "@mui/material";
import DashboardLayout from "../../../../layouts/dashboard";
import CustomBreadcrumbs from "../../../../components/custom-breadcrumbs";
import {PATH_DASHBOARD} from "../../../../routes/paths";
import Iconify from "../../../../components/iconify";
import {useSettingsContext} from "../../../../components/settings";
import RulesListTable from "../../../../modules/rules/tables/RulesListTable";

RulesListPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function RulesListPage() {
    const { themeStretch } = useSettingsContext();

    return (
        <>
            <Container maxWidth={themeStretch ? false : 'lg'}>
                <CustomBreadcrumbs
                    heading="Rules List"
                    links={[
                        {
                            name: 'Dashboard',
                            href: PATH_DASHBOARD.root,
                        },
                        {
                            name: 'Rules',
                            href: PATH_DASHBOARD.rules.root,
                        },
                        {
                            name: 'List',
                        },
                    ]}
                    action={
                        <Button
                            component={NextLink}
                            href={PATH_DASHBOARD.rules.new}
                            variant="contained"
                            startIcon={<Iconify icon="eva:plus-fill" />}
                        >
                            New Rule
                        </Button>
                    }
                />
            </Container>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <RulesListTable />
                </Grid>
            </Grid>
        </>
    );
}
