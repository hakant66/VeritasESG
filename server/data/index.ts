/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Entry point for the relational data-access seam.
 */

import { PrismaResourceRepository } from './prismaResourceRepository.ts';
import type { ResourceRepository } from './resourceRepository.ts';

let repo: ResourceRepository | null = null;

export function getSqlResourceRepository(): ResourceRepository {
  if (!repo) repo = new PrismaResourceRepository();
  return repo;
}

export * from './platformAuth.ts';
export type { ResourceRepository, ListQuery, Row } from './resourceRepository.ts';
