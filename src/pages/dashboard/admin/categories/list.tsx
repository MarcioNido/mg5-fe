import {useCallback, useEffect, useState} from "react";
import NextLink from "next/link";
import {Categories} from "../../../../common/apis/Categories";
import DashboardLayout from "../../../../layouts/dashboard";
import {Button, Container, Grid} from "@mui/material";
import CustomBreadcrumbs from "../../../../components/custom-breadcrumbs";
import {PATH_DASHBOARD} from "../../../../routes/paths";
import Iconify from "../../../../components/iconify";
import {useSettingsContext} from "../../../../components/settings";
import CategoriesListTable from "../../../../modules/categories/tables/CategoriesListTable";

CategoriesListPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function CategoriesListPage() {
    const { themeStretch } = useSettingsContext();

    return (
        <>
            <Container maxWidth={themeStretch ? false : 'lg'}>
                <CustomBreadcrumbs
                    heading="Categories List"
                    links={[
                        {
                            name: 'Dashboard',
                            href: PATH_DASHBOARD.root,
                        },
                        {
                            name: 'Categories',
                            href: PATH_DASHBOARD.categories.root,
                        },
                        {
                            name: 'List',
                        },
                    ]}
                    action={
                        <Button
                            component={NextLink}
                            href={PATH_DASHBOARD.categories.new}
                            variant="contained"
                            startIcon={<Iconify icon="eva:plus-fill" />}
                        >
                            New Category
                        </Button>
                    }
                />
            </Container>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <CategoriesListTable />
                </Grid>
            </Grid>
        </>
    );
}
