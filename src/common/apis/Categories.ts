// @ts-ignore
import qs from 'qs';
import {IRestApiOptions} from "../types";
import {RestApi} from "./RestApi";
import { CategoryResource } from '../types/categories';
import { api } from './configs/axiosConfig';

const baseUrl = '/api/categories';
const restApi =  RestApi('/api/categories');
export const Categories = {

    async getAll(options: IRestApiOptions) {
        return restApi.getAll(options);
    },

    async get(id: string) {
        return restApi.get(id);
    },

    async create(data: any): Promise<CategoryResource> {
        const response = await api.request({
            url: baseUrl,
            method: 'POST',
            data,
        });

        return response.data.data;
    },

    async update(id: string, data: any) {
        return restApi.update(id, data);
    }
}
