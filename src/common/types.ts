export type ICollectionMetadata = {
    current_page: number,
    per_page: number,
    total: number,
}

export type IRestApiOptions = {
    page?: number;
    page_size?: number;
    filters?: { column: string; operator?: string; value: any }[];
};

export type BalanceResource = {
    'initialBalance': number,
    'totalCredits': number,
    'totalDebits': number,
    'finalBalance': number,
};
