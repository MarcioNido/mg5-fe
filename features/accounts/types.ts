export const accountTypes = ['chequing', 'savings', 'credit', 'investment', 'cash', 'debit', 'other'] as const;

export type AccountType = typeof accountTypes[number];

export type Account = {
  id: number;
  account_number: string | null;
  name: string;
  type: AccountType;
  currency: string;
  opening_balance: string;
  opening_balance_date: string | null;
};

export type AccountInput = Omit<Account, 'id'>;

export type AccountsResponse = { data: Account[] };
export type AccountResponse = { data: Account };

export const accountTypeLabels: Record<AccountType, string> = {
  chequing: 'Chequing',
  savings: 'Savings',
  credit: 'Credit card',
  investment: 'Investment',
  cash: 'Cash',
  debit: 'Debit',
  other: 'Other',
};
