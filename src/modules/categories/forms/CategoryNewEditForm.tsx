import * as Yup from 'yup';
import {useEffect, useMemo} from "react";
import {Button, Card, CardHeader, Grid, Stack} from "@mui/material";
import {useRouter} from "next/router";
import {useSnackbar} from "notistack";
import FormProvider, {RHFSelect, RHFTextField} from "../../../components/hook-form";
import {CategoryResource} from "common/types/categories";
import {Categories} from "../../../common/apis/Categories";
import useCustomForm from "../../../hooks/use-custom-form";
import RhfCategoriesAutocomplete from "../components/rhf-categories-autocomplete";
import {countries} from "../../../assets/data";

type Props = {
    isEdit?: boolean;
    currentCategory?: CategoryResource;
};

type FormValueProps = {
    name: string;
    type: string;
    parent: CategoryResource | null;
}

export default function CategoryNewEditForm({isEdit = false, currentCategory}: Props) {

    const router = useRouter();
    const { enqueueSnackbar } = useSnackbar();

    const formSchema = Yup.object().shape({
        'name': Yup.string().required('Name is required'),
        'type': Yup.string().required('Type is required'),
        'parent': Yup.object().nullable(),
    });

    const defaultValues = useMemo(() => ({
        name: currentCategory?.name || '',
        type: currentCategory?.type || '',
        parent: currentCategory?.parent || null,
    }), [currentCategory]);

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
        if (isEdit && currentCategory) {
            reset(defaultValues);
        }
        if (!isEdit) {
            reset(defaultValues);
        }
    }, [isEdit, currentCategory, reset, defaultValues]);

    const handleSubmitForm = (values: FormValueProps) => {
        if (!isEdit || !currentCategory) {
            Categories.create(values).then(() => {
                enqueueSnackbar('Category created successfully', {variant: 'success'});
                router.push('/dashboard/admin/categories/list');

            }).catch((error) => {
                enqueueSnackbar('Category creation failed', {variant: 'error'});
                console.log(error);
            });
        } else {
            Categories.update(currentCategory.id.toString(), values).then(() => {
                enqueueSnackbar('Category updated successfully', {variant: 'success'});
                router.push('/dashboard/admin/categories/list');
            }).catch((error) => {
                enqueueSnackbar('Category update failed', {variant: 'error'});
                console.log(error);
            });
        }
    }

    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
                <FormProvider methods={methods} onSubmit={handleSubmit(handleSubmitForm)}>
                    <Card sx={{mb: 2}}>
                        <CardHeader title={isEdit ? 'Edit Category' : 'New Category'} />
                        <Stack spacing={2} sx={{ p: 3 }}>
                            <RHFTextField name="name" label="Name" />
                            <RHFSelect native name="type" label="Type">
                                <option value="" />
                                {["income", 'deductions', 'fixed expenses', 'variable expenses', 'financial transactions'].map((accountType) => (
                                    <option key={accountType} value={accountType}>
                                        {accountType}
                                    </option>
                                ))}
                            </RHFSelect>
                            <RhfCategoriesAutocomplete name="parent" label="Parent" maxLevel={2} />
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
