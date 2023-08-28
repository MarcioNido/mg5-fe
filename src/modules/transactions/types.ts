import {CategoryResource} from "common/types/categories";
import {AccountResource} from "common/types/accounts";

export type TransactionResource = {
    id: number;
    account: AccountResource;
    transaction_date: Date;
    description: string;
    amount: number;
    category: CategoryResource
}
