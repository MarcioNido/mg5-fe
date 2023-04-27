import {api} from "./configs/axiosConfig";
import {BalanceResource} from "../types";

export const Balance = {
    async get(account_number: string | Date, month: string | number | null) {
        const response = await api.request({
            url: `/api/balances/${account_number}/${month}`,
            method: "GET",
        });

        return response.data;
    }
}
