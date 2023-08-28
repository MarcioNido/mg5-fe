import { DeepPartial, FieldValues, useForm, UseFormProps } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup/dist/yup';
import {AnyObjectSchema, ObjectSchema} from 'yup';
import {useSnackbar} from "notistack";

type Props = UseFormProps & {
  formSchema: ObjectSchema<any>;
};

/**
 * Hook para criar formulários com validação e tratamento de erros
 * @param formSchema
 * @param defaultValues
 */
export default function useCustomForm<TFormValues extends FieldValues>({
  formSchema,
  defaultValues,
}: Props) {
  const methods = useForm<TFormValues>({
    resolver: yupResolver(formSchema),
    defaultValues: defaultValues as DeepPartial<TFormValues>,
  });
  const { enqueueSnackbar } = useSnackbar();

  const handleErrorResponse = (err: { response: { data: { errors: any; message: any } } }) => {
    if (err.response?.data?.errors) {
      const apiErrors = err.response.data.errors;
      Object.keys(apiErrors).forEach((field) => {
        const fieldWithError = field as keyof TFormValues;
        // @ts-ignore
        methods.setError(fieldWithError, {
          type: 'manual',
          message: apiErrors[field][0],
        });
      });
      // @ts-ignore
      methods.setError('afterSubmit', {
        type: 'manual',
        message: err.response.data.message || 'Ocorreu um erro ao realizar a operação',
      });
    }
    enqueueSnackbar('Ocorreu um erro ao realizar a operação', { variant: 'error' });
  };

  return { ...methods, handleErrorResponse };
}
