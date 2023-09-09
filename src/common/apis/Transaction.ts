// @ts-ignore
import qs from 'qs';
import {api} from "./configs/axiosConfig";

type ITransactionOptions = {
    page?: number;
    page_size?: number;
    filters?: { column: string; value: any }[];
};

const DEFAULT_PAGE_SIZE = 5;

export const Transaction = {

    async getAll(options: ITransactionOptions) {
        // transforma os filtros em um array com a coluna send a chave
        // ex: ?filter[account_number]=06402-12345&filter[transaction_date]=2023-04-06
        // resource: https://github.com/axios/axios/issues/5058
        const paramsSerializer = (params: any) => qs.stringify(params, { arrayFormat: 'repeat' });
        const filters = options.filters
            ?.filter((filter) => !!filter.value)
            .map((filter) => ({ [filter.column]: filter.value }));
        // ------------------------------------------------------------

        const response = await api.request({
            url: '/api/transactions',
            method: 'GET',
            params: {
                page: options.page ?? 1,
                page_size: options.page_size ?? DEFAULT_PAGE_SIZE,
                filter: filters,
            },
            paramsSerializer: {
                serialize: paramsSerializer,
            },
        });

        return response.data;
    },

    async get(id: string) {
        const response = await api.request({
            url: `/api/transactions/${id}`,
            method: 'GET',
        });

        return response.data;
    },

    async create(data: any) {
        const response = await api.request({
            url: `/api/transactions`,
            method: 'POST',
            data,
        });

        return response.data;
    },

    async update(id: string, data: any) {
        const response = await api.request({
            url: `/api/transactions/${id}`,
            method: 'PUT',
            data,
        });

        return response.data;
    },

    async getIncomeByMonth(month: number, year: number) {
        const response = await api.request({
            url: `/api/transactions/income/${month}/${year}`,
            method: 'GET',
        });

        return response.data;
    },

    async getExpenseByMonth(month: number, year: number) {
        const response = await api.request({
            url: `/api/transactions/expense/${month}/${year}`,
            method: 'GET',
        });

        return response.data;
    },

    async getMonthlyBalance(month: number, year: number) {
        const response = await api.request({
            url: `/api/transactions/balance/${month}/${year}`,
            method: 'GET',
        });

        return response.data;
    },

}
