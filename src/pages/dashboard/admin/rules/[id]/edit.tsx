import DashboardLayout from "layouts/dashboard";
import Head from "next/head";
import {Container} from "@mui/material";

import {useRouter} from "next/router";
import CustomBreadcrumbs from "components/custom-breadcrumbs";
import { PATH_DASHBOARD } from "routes/paths";
import {useEffect, useState} from "react";
import {useSettingsContext} from "../../../../../components/settings";
import {RuleResource} from "../../../../../common/types/rules";
import {Rule} from "../../../../../common/apis/Rule";
import RuleNewEditForm from "../../../../../modules/rules/forms/RuleNewEditForm";

EditRulePage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function EditRulePage() {
    const { themeStretch } = useSettingsContext();
    const [rule, setRule] = useState<RuleResource>();
    const {
        query: { id },
    } = useRouter();

    useEffect(() => {
        Rule.get(id as string)
            .then((response) => {
                setRule(response.data);
            })
    }, [id]);
 
    return (
        <>
            <Head>
                <title> Edit Rule</title>
            </Head>

            <Container maxWidth={themeStretch ? false : 'lg'}>
                <CustomBreadcrumbs
                    heading="Edit rule"
                    links={[
                        {
                            name: 'Dashboard',
                            href: PATH_DASHBOARD.general.banking,
                        },
                        {
                            name: 'Rules',
                            href: PATH_DASHBOARD.rules.list,
                        },
                        { name: `Edit ${id}` },
                    ]}
                />

                <RuleNewEditForm currentRule={rule} isEdit />
            </Container>
        </>
    );
}
