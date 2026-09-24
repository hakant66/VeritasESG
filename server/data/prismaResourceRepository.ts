/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Prisma-backed implementation of the engine-neutral ResourceRepository.
 * Translates the neutral ListQuery into Prisma `where`/`orderBy` and mirrors the
 * dual-id (`id` OR `legacyFirebaseId`) lookup semantics of the Mongo API so the
 * `/api/db/:resource` HTTP contract is preserved byte-for-byte.
 */

import { Prisma } from '@prisma/client';
import { getPrisma } from './prismaClient.ts';
import {
  type ListQuery,
  type ResourceRepository,
  type Row,
  isObjectIdLike,
} from './resourceRepository.ts';
import { getCollectionSpec } from './migration/schemaMap.ts';

/** Scalar field names per Prisma model (used to strip unknown/foreign keys). */
const modelFieldNames = new Map<string, Set<string>>();
for (const model of Prisma.dmmf.datamodel.models) {
  modelFieldNames.set(
    model.name,
    new Set(model.fields.filter((f) => f.kind === 'scalar' || f.kind === 'enum').map((f) => f.name)),
  );
}

function delegateName(prismaModel: string): string {
  return prismaModel.charAt(0).toLowerCase() + prismaModel.slice(1);
}

function resolveModel(resource: string): { delegate: any; model: string; fields: Set<string> } {
  const spec = getCollectionSpec(resource);
  if (!spec) throw new Error(`Unknown resource: ${resource}`);
  const fields = modelFieldNames.get(spec.prismaModel);
  if (!fields) throw new Error(`No Prisma model for resource: ${resource}`);
  const prisma = getPrisma() as unknown as Record<string, any>;
  const delegate = prisma[delegateName(spec.prismaModel)];
  if (!delegate) throw new Error(`No Prisma delegate for model: ${spec.prismaModel}`);
  return { delegate, model: spec.prismaModel, fields };
}

/** Keep only keys that are real columns on the model (mirrors Mongoose strict mode). */
function pickKnownFields(fields: Set<string>, data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (key === '_id' || key === '__v') continue;
    if (fields.has(key)) out[key] = value;
  }
  return out;
}

function buildWhere(fields: Set<string>, query: ListQuery): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (query.equals) {
    for (const [key, value] of Object.entries(query.equals)) {
      if (fields.has(key)) where[key] = value;
    }
  }

  if (typeof query.timestampGteMs === 'number' && fields.has('timestamp')) {
    where.timestamp = { gte: new Date(query.timestampGteMs) };
  }

  if (query.ids && query.ids.length > 0) {
    where.OR = [{ id: { in: query.ids } }, { legacyFirebaseId: { in: query.ids } }];
  }

  return where;
}

function buildOrderBy(fields: Set<string>, sort?: Record<string, 'asc' | 'desc'>) {
  if (!sort) return undefined;
  const entries = Object.entries(sort).filter(([field]) => fields.has(field));
  if (entries.length === 0) return undefined;
  return entries.map(([field, dir]) => ({ [field]: dir }));
}

export class PrismaResourceRepository implements ResourceRepository {
  async list(resource: string, query: ListQuery): Promise<Row[]> {
    const { delegate, fields } = resolveModel(resource);
    return delegate.findMany({
      where: buildWhere(fields, query),
      orderBy: buildOrderBy(fields, query.sort),
      skip: query.skip && query.skip > 0 ? query.skip : undefined,
      take: query.limit && query.limit > 0 ? query.limit : undefined,
    });
  }

  async count(resource: string, query: ListQuery): Promise<number> {
    const { delegate, fields } = resolveModel(resource);
    return delegate.count({ where: buildWhere(fields, query) });
  }

  async findByExternalId(resource: string, id: string): Promise<Row | null> {
    const { delegate } = resolveModel(resource);
    if (isObjectIdLike(id)) {
      const byId = await delegate.findUnique({ where: { id } });
      if (byId) return byId;
    }
    return delegate.findFirst({ where: { OR: [{ id }, { legacyFirebaseId: id }] } });
  }

  async create(resource: string, data: Record<string, unknown>): Promise<Row> {
    const { delegate, fields } = resolveModel(resource);
    const now = new Date();
    const payload = pickKnownFields(fields, data);
    if (!payload.updatedAt) payload.updatedAt = now;
    if (!payload.createdAt) payload.createdAt = now;
    return delegate.create({ data: payload });
  }

  async createMany(resource: string, items: Record<string, unknown>[]): Promise<Row[]> {
    const { delegate, fields } = resolveModel(resource);
    const now = new Date();
    const rows = items.map((item) => {
      const payload = pickKnownFields(fields, item);
      if (!payload.updatedAt) payload.updatedAt = now;
      if (!payload.createdAt) payload.createdAt = now;
      return payload;
    });
    // Engine-neutral (createManyAndReturn is Postgres-only): create in a tx.
    return getPrisma().$transaction(rows.map((data) => delegate.create({ data })));
  }

  async updateByExternalId(
    resource: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Row | null> {
    const { delegate, fields } = resolveModel(resource);
    const existing = await this.findByExternalId(resource, id);
    if (!existing) return null;
    const payload = pickKnownFields(fields, data);
    payload.updatedAt = new Date();
    return delegate.update({ where: { id: existing.id }, data: payload });
  }

  async upsertByLegacyId(
    resource: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Row> {
    const { delegate, fields } = resolveModel(resource);
    const now = new Date();
    const existing = await delegate.findFirst({ where: { legacyFirebaseId: id } });
    const payload = pickKnownFields(fields, { ...data, legacyFirebaseId: id });
    payload.updatedAt = now;
    if (existing) {
      return delegate.update({ where: { id: existing.id }, data: payload });
    }
    if (!payload.createdAt) payload.createdAt = now;
    return delegate.create({ data: payload });
  }

  async deleteByExternalId(resource: string, id: string): Promise<Row | null> {
    const { delegate } = resolveModel(resource);
    const existing = await this.findByExternalId(resource, id);
    if (!existing) return null;
    await delegate.delete({ where: { id: existing.id } });
    return existing;
  }
}
