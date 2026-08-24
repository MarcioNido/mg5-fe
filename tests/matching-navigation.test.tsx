import { describe, expect, it } from 'vitest';

import { navigation } from '@/components/dashboard-nav';
import { routes } from '@/lib/config/routes';

describe('matching navigation', () => {
  it('exposes the matching route through central configuration and navigation', () => {
    expect(routes.matching).toBe('/dashboard/matching');
    expect(navigation).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Matching', href: routes.matching })]));
  });
});
