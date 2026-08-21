import type { Category } from './types';

export type CategoryOption = { id: number; label: string; category: Category };

export function buildCategoryOptions(categories: Category[]): CategoryOption[] {
  const byId = new Map(categories.map((category) => [category.id, category]));

  const pathFor = (category: Category) => {
    const names = [category.name];
    const visited = new Set<number>([category.id]);
    let parent = category.parent;
    while (parent && !visited.has(parent.id)) {
      visited.add(parent.id);
      const indexedParent = byId.get(parent.id);
      names.unshift(indexedParent?.name ?? parent.name);
      parent = indexedParent?.parent ?? null;
    }
    return names.join(' › ');
  };

  return categories
    .map((category) => ({ id: category.id, label: pathFor(category), category }))
    .sort((left, right) => left.label.localeCompare(right.label, 'en-CA', { sensitivity: 'base' }));
}

export function categoryPath(category: Category | null, categories: Category[]) {
  if (!category) return 'Uncategorized';
  return buildCategoryOptions(categories).find((option) => option.id === category.id)?.label ?? category.name;
}
