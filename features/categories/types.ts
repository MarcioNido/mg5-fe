export const categoryTypes = ['income', 'expense', 'transfer'] as const;

export type CategoryType = typeof categoryTypes[number];

export const categoryTypeLabels: Record<CategoryType, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
};

export type CategoryIdentity = {
  id: number;
  name: string;
  type: CategoryType | (string & {});
  level: number;
};

export type Category = CategoryIdentity & {
  parent: CategoryIdentity | null;
};

export type CategoryDetail = Category & { children?: Category[] };
export type CategoryInput = { name: string; type: CategoryType; parent_id: number | null };
export type CategoriesResponse = { data: Category[] };
export type CategoryResponse = { data: CategoryDetail };
