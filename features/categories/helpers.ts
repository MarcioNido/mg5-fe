import type { Category } from './types';

export type CategoryNode = { category: Category; children: CategoryNode[] };
export type CategoryOption = { id: number; label: string; category: Category };

const compareCategories = (left: Category, right: Category) =>
  left.name.localeCompare(right.name, 'en-CA', { sensitivity: 'base' }) || left.id - right.id;

function safeParentId(category: Category, byId: Map<number, Category>) {
  const parentId = category.parent?.id;
  if (!parentId || !byId.has(parentId) || parentId === category.id) return null;
  const visited = new Set<number>([category.id]);
  let cursor: Category | undefined = byId.get(parentId);
  while (cursor?.parent?.id) {
    if (visited.has(cursor.id)) return null;
    visited.add(cursor.id);
    cursor = byId.get(cursor.parent.id);
  }
  return cursor && visited.has(cursor.id) ? null : parentId;
}

export function buildCategoryHierarchy(categories: Category[]): CategoryNode[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const nodes = new Map(categories.map((category) => [category.id, { category, children: [] as CategoryNode[] }]));
  const roots: CategoryNode[] = [];
  for (const category of categories) {
    const parentId = safeParentId(category, byId);
    const node = nodes.get(category.id)!;
    const parent = parentId ? nodes.get(parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (items: CategoryNode[]) => {
    items.sort((left, right) => compareCategories(left.category, right.category));
    items.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
}

export function categoryPath(category: Category | null, categories: Category[]) {
  if (!category) return 'Uncategorized';
  const byId = new Map(categories.map((item) => [item.id, item]));
  const names = [category.name];
  const visited = new Set<number>([category.id]);
  let parent = category.parent;
  while (parent && !visited.has(parent.id)) {
    visited.add(parent.id);
    const fullParent = byId.get(parent.id);
    names.unshift(fullParent?.name ?? parent.name);
    parent = fullParent?.parent ?? null;
  }
  return names.join(' › ');
}

export function buildCategoryOptions(categories: Category[]): CategoryOption[] {
  return categories.map((category) => ({ id: category.id, label: categoryPath(category, categories), category }))
    .sort((left, right) => left.label.localeCompare(right.label, 'en-CA', { sensitivity: 'base' }) || left.id - right.id);
}

export function categoryDescendantIds(categoryId: number, categories: Category[]) {
  const children = new Map<number, number[]>();
  categories.forEach((category) => {
    const parentId = category.parent?.id;
    if (parentId) children.set(parentId, [...(children.get(parentId) ?? []), category.id]);
  });
  const result = new Set<number>();
  const pending = [...(children.get(categoryId) ?? [])];
  while (pending.length) {
    const id = pending.shift()!;
    if (id === categoryId || result.has(id)) continue;
    result.add(id);
    pending.push(...(children.get(id) ?? []));
  }
  return result;
}

function subtreeDepth(categoryId: number, categories: Category[]) {
  const descendants = categoryDescendantIds(categoryId, categories);
  const root = categories.find((category) => category.id === categoryId);
  if (!root) return 0;
  let depth = 0;
  descendants.forEach((id) => {
    const category = categories.find((item) => item.id === id);
    if (category) depth = Math.max(depth, category.level - root.level);
  });
  return depth;
}

export function validParentOptions(categories: Category[], edited: Category | null) {
  const excluded = edited ? categoryDescendantIds(edited.id, categories) : new Set<number>();
  if (edited) excluded.add(edited.id);
  const depth = edited ? subtreeDepth(edited.id, categories) : 0;
  return buildCategoryOptions(categories.filter((candidate) =>
    !excluded.has(candidate.id) && candidate.level + 1 + depth <= 3));
}

