import { TransactionsView } from '@/features/transactions/transactions-view';

type Query = Record<string, string | string[] | undefined>;

export default async function Page({ searchParams }: { searchParams: Promise<Query> }) {
  return <TransactionsView query={await searchParams} />;
}
