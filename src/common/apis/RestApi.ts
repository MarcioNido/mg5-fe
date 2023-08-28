// @ts-ignore
import qs from 'qs';
import {api} from "./configs/axiosConfig";
import {IRestApiOptions} from "../types";

const DEFAULT_PAGE_SIZE = 20;

export const RestApi = (baseUrl: string) => {

    async function getAll(options: IRestApiOptions) {
        const paramsSerializer = (params: any) => qs.stringify(params, { arrayFormat: 'repeat' });
        const filters = options.filters
            ?.filter((filter) => !!filter.value)
            .map((filter) => ({ [filter.column]: filter.operator ? `${filter.operator},${filter.value}` : filter.value  }));
        // ------------------------------------------------------------

        const response = await api.request({
            url: baseUrl,
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
    }

    async function get(id: string) {
        const response = await api.request({
            url: `${baseUrl}/${id}`,
            method: 'GET',
        });

        return response.data;
    }

    async function create(data: any) {
        const response = await api.request({
            url: baseUrl,
            method: 'POST',
            data,
        });

        return response.data;
    }

    async function update(id: string, data: any) {
        const response = await api.request({
            url: `${baseUrl}/${id}`,
            method: 'PUT',
            data,
        });

        return response.data;
    }

    return {
        getAll,
        get,
        create,
        update
    }

}
