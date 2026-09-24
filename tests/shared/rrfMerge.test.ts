/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { rrfMerge } from '../../lib/rrfMerge.ts';

describe('rrfMerge', () => {
  it('fuses ranked lists by reciprocal rank', () => {
    const vector = [
      { id: 'a', text: 'alpha' },
      { id: 'b', text: 'beta' },
    ];
    const text = [
      { id: 'b', text: 'beta' },
      { id: 'c', text: 'gamma' },
    ];

    const merged = rrfMerge([vector, text], (item) => item.id, 60);

    expect(merged[0]?.id).toBe('b');
    expect(merged.map((item) => item.id)).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    expect(merged[0]?.score).toBeGreaterThan(merged[1]?.score ?? 0);
  });

  it('dedupes items appearing in multiple lists', () => {
    const list1 = [{ id: 'x', v: 1 }];
    const list2 = [{ id: 'x', v: 1 }];
    const merged = rrfMerge([list1, list2], (item) => item.id, 60);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.score).toBeCloseTo(2 / (60 + 1), 5);
  });
});
