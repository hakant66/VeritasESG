/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RrfRankedItem<T> = T & { score: number };

/**
 * Reciprocal Rank Fusion across multiple ranked lists sharing the same id key.
 */
export function rrfMerge<T>(
  lists: Array<Array<T>>,
  getId: (item: T) => string,
  k = 60,
): RrfRankedItem<T>[] {
  const scores = new Map<string, { item: T; score: number }>();

  for (const list of lists) {
    list.forEach((item, rank) => {
      const id = getId(item);
      const contribution = 1 / (k + rank + 1);
      const prev = scores.get(id);
      if (prev) {
        prev.score += contribution;
      } else {
        scores.set(id, { item, score: contribution });
      }
    });
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({ ...entry.item, score: entry.score }));
}
