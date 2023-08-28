import * as Yup from 'yup';
import {useEffect, useMemo} from "react";
import {useForm} from "react-hook-form";
import {yupResolver} from "@hookform/resolvers/yup/dist/yup";
import {Button, Card, CardHeader, Grid, Stack} from "@mui/material";
import {useRouter} from "next/router";
import {CategoryResource} from "common/types/categories";
import FormProvider, {RHFTextField} from "../../../components/hook-form";
import {TransactionResource} from "../types";
import RhfCategoriesAutocomplete from "../../categories/components/rhf-categories-autocomplete";
import {Transaction} from "../../../common/apis/Transaction";
import RhfAccountsAutocomplete from "../../accounts/components/rhf-accounts-autocomplete";
import {AccountResource} from "../../../common/types/accounts";
import {fDateISOString} from "../../../utils/formatTime";

type Props = {
    isEdit?: boolean;
    currentTransaction?: TransactionResource;
};

type FormValueProps = {
    account: AccountResource|null;
    description: string;
    transaction_date: Date|string;
    amount: number;
    category?: CategoryResource|null;
}


export default function TransactionNewEditForm({isEdit = false, currentTransaction}: Props) {

    const router = useRouter();

    const TransactionSchema = Yup.object().shape({
        'account': Yup.object().required('Account is required'),
        'description': Yup.string().required('Description is required'),
        'transaction_date': Yup.date().required('Transaction date is required'),
        'amount': Yup.number().required('Amount is required'),
        'category': Yup.object().required('Category is required'),
    });

    const defaultValues = useMemo(() => ({
        account: currentTransaction?.account || null,
        description: currentTransaction?.description || '',
        transaction_date: currentTransaction?.transaction_date || '',
        amount: currentTransaction?.amount || 0,
        category: currentTransaction?.category || null,
    }), [currentTransaction]);

    const methods = useForm({
        resolver: yupResolver(TransactionSchema),
        defaultValues,
    });

    const {
        reset,
        watch,
        control,
        setValue,
        handleSubmit,
        formState: { isSubmitting },
    } = methods;

    useEffect(() => {
        if (isEdit && currentTransaction) {
            reset(defaultValues);
        }
        if (!isEdit) {
            reset(defaultValues);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, currentTransaction]);

    const handleSubmitForm = (values: FormValueProps) => {
        const parsedValues = {...values, transaction_date: fDateISOString(values.transaction_date)}
        if (isEdit && currentTransaction) {
            Transaction.update(currentTransaction.id.toString(), parsedValues)
                .then(() => {
                    router.back();
                })
                .catch((error) => {
                    console.log(error);
                });
        } else {
            Transaction.create(parsedValues)
                .then(() => {
                    router.back();
                })
                .catch((error) => {
                    console.log(error);
                });
        }
    }

    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
                <FormProvider methods={methods} onSubmit={handleSubmit(handleSubmitForm)}>
                    <Card sx={{mb: 2}}>
                        <CardHeader title={isEdit ? 'Edit Transaction' : 'New Transaction'} />
                        <Stack spacing={2} sx={{ p: 3 }}>
                            <RhfAccountsAutocomplete name="account" label="Account" />
                            <RHFTextField name="description" label="Description" />
                            <RHFTextField name="transaction_date" label="Transaction Date" type="date" />
                            <RhfCategoriesAutocomplete name="category" label="Category" />
                            <RHFTextField name="amount" label="Amount" type="number" />
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