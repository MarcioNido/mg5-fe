// @ts-ignore
import qs from 'qs';
import {api} from "./configs/axiosConfig";

type IAccountsOptions = {
    page?: number;
    page_size?: number;
    filters?: { column: string; operator?: string; value: any }[];
    orderBy?: { column: string; direction: 'asc' | 'desc' }[];
};

const DEFAULT_PAGE_SIZE = 5;
export const Accounts = {

    async getAll(options: IAccountsOptions) {
        const paramsSerializer = (params: any) => qs.stringify(params, { arrayFormat: 'repeat' });
        const filters = options.filters
            ?.filter((filter) => !!filter.value)
            .map((filter) => ({ [filter.column]: filter.operator ? `${filter.operator},${filter.value}` : filter.value }));

        const response = await api.request({
            url: '/api/accounts',
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
            url: `/api/accounts/${id}`,
            method: 'GET',
        });

        return response.data;
    },

    async create(data: any) {
        const response = await api.request({
            url: '/api/accounts',
            method: 'POST',
            data,
        });

        return response.data;
    },

    async update(id: string, data: any) {
        const response = await api.request({
            url: `/api/accounts/${id}`,
            method: 'PUT',
            data,
        });

        return response.data;
    }
}
