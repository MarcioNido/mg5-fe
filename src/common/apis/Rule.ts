// @ts-ignore
import qs from 'qs';
import {RestApi} from "./RestApi";
import {IRestApiOptions} from "../types";

const restApi =  RestApi('/api/rules');

export const Rule = {

    async getAll(options: IRestApiOptions) {
        return restApi.getAll(options);
    },

    async get(id: string) {
        const response = await restApi.get(id);
        return response.data;
    },

    async create(data: any) {
        const response = await restApi.create(data);
        return response.data;
    },

    async update(id: string, data: any) {
        const response = await restApi.update(id, data);
        return response.data;
    }
}
