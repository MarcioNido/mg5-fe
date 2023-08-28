import DashboardLayout from "layouts/dashboard";
import Head from "next/head";
import {Container} from "@mui/material";

import {useRouter} from "next/router";
import CustomBreadcrumbs from "components/custom-breadcrumbs";
import { PATH_DASHBOARD } from "routes/paths";
import CategoryNewEditForm from "modules/categories/forms/CategoryNewEditForm";
import {useEffect, useState} from "react";
import {CategoryResource} from "common/types/categories";
import {useSettingsContext} from "../../../../../components/settings";
import {Categories} from "../../../../../common/apis/Categories";

NewCategoryPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function NewCategoryPage() {
    const { themeStretch } = useSettingsContext();
    const [category, setCategory] = useState<CategoryResource>();
    const {
        query: { id },
    } = useRouter();

    useEffect(() => {
        Categories.get(id as string)
            .then((response) => {
                setCategory(response.data);
            })
    }, [id]);
 
    return (
        <>
            <Head>
                <title> Edit Category</title>
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
                        { name: `Edit${id}` },
                    ]}
                />

                <CategoryNewEditForm currentCategory={category} isEdit />
            </Container>
        </>
    );
}
