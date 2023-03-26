import {api} from "./configs/axiosConfig";
import {TransactionInterface} from "../types/transactions";

export const TransactionsApi = {

    async getAll(): Promise<TransactionInterface[]> {
        const response = await api.request({
            url: "/api/transactions/",
            method: "GET",
        })
        return response.data.data;
    }
}
