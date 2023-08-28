// @ts-ignore
import qs from 'qs';
import {IRestApiOptions} from "../types";
import {RestApi} from "./RestApi";

const restApi =  RestApi('/api/categories');
export const Categories = {

    async getAll(options: IRestApiOptions) {
        return restApi.getAll(options);
    },

    async get(id: string) {
        return restApi.get(id);
    },

    async create(data: any) {
        return restApi.create(data);
    },

    async update(id: string, data: any) {
        return restApi.update(id, data);
    }
}
