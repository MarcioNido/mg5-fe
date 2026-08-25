import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildCategoryHierarchy, buildCategoryOptions, categoryDescendantIds, validParentOptions } from '@/features/categories/helpers';
import { createCategory, deleteCategory, listCategories, updateCategory } from '@/features/categories/service';
import type { Category } from '@/features/categories/types';

const root: Category = { id: 1, name: 'Staffing', type: 'expense', level: 1, parent: null };
const child: Category = { id: 2, name: 'Salaries', type: 'expense', level: 2, parent: { id: 1, name: 'Staffing', type: 'expense', level: 1 } };
const detail: Category = { id: 3, name: 'Overtime', type: 'expense', level: 3, parent: { id: 2, name: 'Salaries', type: 'expense', level: 2 } };

describe('category services', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('uses tenant-aware paths, methods, flat payloads, signals, and 204 deletion', async () => {
    const fetchMock = vi.fn().mockImplementation((_path, init: RequestInit) => Promise.resolve(init.method === 'DELETE' ? new Response(null, { status: 204 }) : new Response(JSON.stringify({ data: [] }), { headers: { 'Content-Type': 'application/json' } })));
    vi.stubGlobal('fetch', fetchMock); const controller = new AbortController(); const input = { name: 'Travel', type: 'expense' as const, parent_id: null };
    await listCategories('personal', controller.signal); await createCategory('clinic', input); await updateCategory('clinic', 8, input); await expect(deleteCategory('clinic', 8)).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(['/api/categories', '/api/categories', '/api/categories/8', '/api/categories/8']);
    expect((fetchMock.mock.calls[0]?.[1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
    expect(((fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers).get('X-Tenant-Slug')).toBe('personal');
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).method).toBe('POST'); expect((fetchMock.mock.calls[2]?.[1] as RequestInit).method).toBe('PATCH'); expect((fetchMock.mock.calls[3]?.[1] as RequestInit).method).toBe('DELETE');
    expect((fetchMock.mock.calls[2]?.[1] as RequestInit).body).toBe(JSON.stringify(input));
  });
});

describe('category hierarchy helpers', () => {
  it('builds deterministic hierarchy, paths, and descendants', () => {
    const another: Category = { id: 4, name: 'administration', type: 'expense', level: 1, parent: null };
    const tree = buildCategoryHierarchy([detail, child, root, another]);
    expect(tree.map((node) => node.category.name)).toEqual(['administration', 'Staffing']);
    expect(tree[1]?.children[0]?.children[0]?.category.name).toBe('Overtime');
    expect(buildCategoryOptions([detail, child, root]).map((option) => option.label)).toEqual(['Staffing', 'Staffing › Salaries', 'Staffing › Salaries › Overtime']);
    expect([...categoryDescendantIds(1, [detail, child, root])]).toEqual([2, 3]);
  });

  it('terminates malformed cycles and keeps every category visible', () => {
    const a: Category = { id: 10, name: 'A', type: 'income', level: 1, parent: { id: 11, name: 'B', type: 'income', level: 1 } };
    const b: Category = { id: 11, name: 'B', type: 'income', level: 1, parent: { id: 10, name: 'A', type: 'income', level: 1 } };
    expect(buildCategoryHierarchy([a, b]).map((node) => node.category.id).sort()).toEqual([10, 11]);
    expect(buildCategoryOptions([a, b])).toHaveLength(2);
  });

  it('excludes self, descendants, level-three parents, and subtree moves below level three', () => {
    const otherChild: Category = { id: 4, name: 'Other child', type: 'expense', level: 2, parent: root };
    expect(validParentOptions([root, child, detail, otherChild], child).map((option) => option.id)).toEqual([1]);
    expect(validParentOptions([root, child, detail, otherChild], null).map((option) => option.id)).toEqual([1, 4, 2]);
  });
});
