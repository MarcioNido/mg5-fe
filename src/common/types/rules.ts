import {AccountResource} from "./accounts";
import {CategoryResource} from "./categories";

export type RuleResource = {
    id: number;
    content: string;
    account: AccountResource|null;
    category: CategoryResource|null;
}
