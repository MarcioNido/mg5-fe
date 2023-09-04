import * as Yup from 'yup';
import {useEffect, useMemo} from "react";
import {Button, Card, CardHeader, Grid, Stack} from "@mui/material";
import {useRouter} from "next/router";
import {useSnackbar} from "notistack";
import {CategoryResource} from "common/types/categories";
import FormProvider, {RHFTextField} from "../../../components/hook-form";
import useCustomForm from "../../../hooks/use-custom-form";
import {AccountResource} from "../../../common/types/accounts";
import {RuleResource} from "../../../common/types/rules";
import {Rule} from "../../../common/apis/Rule";
import RhfAccountsAutocomplete from "../../accounts/components/rhf-accounts-autocomplete";
import RhfCategoriesAutocomplete from "../../categories/components/rhf-categories-autocomplete";

type Props = {
    isEdit?: boolean;
    currentRule?: RuleResource;
};

type FormValueProps = {
    content: string;
    account: AccountResource | null;
    category: CategoryResource | null;
}

export default function RuleNewEditForm({isEdit = false, currentRule}: Props) {

    const router = useRouter();
    const { enqueueSnackbar } = useSnackbar();

    const formSchema = Yup.object().shape({
        'content': Yup.string().required('Content is required'),
        'account': Yup.object().nullable(),
        'category': Yup.object().required(),
    });

    const defaultValues = useMemo(() => ({
        content: currentRule?.content || '',
        account: currentRule?.account || null,
        category: currentRule?.category || null,
    }), [currentRule]);

    const methods = useCustomForm<FormValueProps>({
        formSchema,
        defaultValues,
    });

    const {
        reset,
        handleSubmit,
        formState: { isSubmitting },
    } = methods;

    useEffect(() => {
        console.log('defaultValues', defaultValues);
        if (isEdit && currentRule) {
            reset(defaultValues);
        }
        if (!isEdit) {
            reset(defaultValues);
        }
    }, [isEdit, currentRule, reset, defaultValues]);

    const handleSubmitForm = (values: FormValueProps) => {
        if (!isEdit || !currentRule) {
            Rule.create(values).then(() => {
                enqueueSnackbar('Rule created successfully', {variant: 'success'});
                router.back();

            }).catch((error) => {
                enqueueSnackbar('Rule creation failed', {variant: 'error'});
            });
        } else {
            Rule.update(currentRule.id.toString(), values).then(() => {
                enqueueSnackbar('Rule updated successfully', {variant: 'success'});
                router.back();
            }).catch((error) => {
                enqueueSnackbar('Rule update failed', {variant: 'error'});
            });
        }
    }

    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
                <FormProvider methods={methods} onSubmit={handleSubmit(handleSubmitForm)}>
                    <Card sx={{mb: 2}}>
                        <CardHeader title={isEdit ? 'Edit Rule' : 'New Rule'} />
                        <Stack spacing={2} sx={{ p: 3 }}>
                            <RHFTextField name="content" label="Content" />
                            <RhfAccountsAutocomplete name="account" label="Account" />
                            <RhfCategoriesAutocomplete name="category" label="Category" maxLevel={3} />
                        </Stack>

                    </Card>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            variant="contained"
                            color="primary"
                            sx={{ textTransform: 'none' }}
                        >
                            Save
                        </Button>
                    </Stack>

                </FormProvider>
            </Grid>
        </Grid>
    );
}
