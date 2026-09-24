/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SQL implementations of `/api/gri-materiality/*` routes (DB_DRIVER=sql).
 */

import type { Request, Response } from 'express';
import { getPrisma } from './prismaClient.ts';
import { findByIdOrLegacy } from './sqlRecord.ts';
import { serialize } from '../lib/apiSerialize.ts';

function success(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function failure(res: Response, status: number, error: string, code = 'gri-materiality/error') {
  return res.status(status).json({ success: false, error, code });
}

export async function listRows(req: Request, res: Response) {
  const { customerId } = req.query;
  if (!customerId) {
    return failure(res, 400, 'customerId required', 'gri-materiality/invalid-params');
  }

  const rows = await getPrisma().gRIMaterialityMatrixRow.findMany({
    where: { customerId: String(customerId) },
    orderBy: { order: 'asc' },
  });
  return success(res, { rows: rows.map((row) => serialize(row)) });
}

export async function createRow(req: Request, res: Response) {
  const { customerId, subject, griMapping, disclosures, notes } = req.body;
  const userId = (req as { userId?: string }).userId;
  if (!customerId || !subject || !griMapping || !disclosures) {
    return failure(res, 400, 'Missing required fields', 'gri-materiality/invalid-params');
  }

  const prisma = getPrisma();
  const maxOrder = await prisma.gRIMaterialityMatrixRow.findFirst({
    where: { customerId: String(customerId) },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  const newOrder = (maxOrder?.order ?? 0) + 1;

  const doc = await prisma.gRIMaterialityMatrixRow.create({
    data: {
      customerId: String(customerId),
      order: newOrder,
      subject: String(subject).trim(),
      griMapping: String(griMapping).trim(),
      disclosures: String(disclosures).trim(),
      notes: typeof notes === 'string' ? notes.trim() : '',
      createdBy: userId,
      ownerId: userId,
    },
  });
  return success(res, { row: serialize(doc) }, 201);
}

export async function updateRow(req: Request, res: Response) {
  const { id } = req.params;
  const { subject, griMapping, disclosures, notes } = req.body;

  const prisma = getPrisma();
  const existing = await findByIdOrLegacy(prisma.gRIMaterialityMatrixRow, id);
  if (!existing) return failure(res, 404, 'Row not found', 'gri-materiality/not-found');

  const doc = await prisma.gRIMaterialityMatrixRow.update({
    where: { id: String(existing.id) },
    data: {
      subject: subject?.trim(),
      griMapping: griMapping?.trim(),
      disclosures: disclosures?.trim(),
      notes: notes?.trim() || '',
      updatedAt: new Date(),
    },
  });
  return success(res, { row: serialize(doc) });
}

export async function deleteRow(req: Request, res: Response) {
  const { id } = req.params;
  const prisma = getPrisma();
  const doc = await findByIdOrLegacy(prisma.gRIMaterialityMatrixRow, id);
  if (!doc) return failure(res, 404, 'Row not found', 'gri-materiality/not-found');

  await prisma.gRIMaterialityMatrixRow.delete({ where: { id: String(doc.id) } });
  await prisma.gRIMaterialityMatrixRow.updateMany({
    where: {
      customerId: String(doc.customerId),
      order: { gt: Number(doc.order) },
    },
    data: { order: { decrement: 1 } },
  });

  return success(res, { id });
}

export async function reorderRows(req: Request, res: Response) {
  const { customerId, rowIds } = req.body;
  if (!customerId || !Array.isArray(rowIds)) {
    return failure(res, 400, 'Invalid reorder params', 'gri-materiality/invalid-params');
  }

  const prisma = getPrisma();
  await Promise.all(
    rowIds.map((rowId: string, idx: number) =>
      prisma.gRIMaterialityMatrixRow.updateMany({
        where: { OR: [{ id: rowId }, { legacyFirebaseId: rowId }] },
        data: { order: idx, updatedAt: new Date() },
      }),
    ),
  );

  const rows = await prisma.gRIMaterialityMatrixRow.findMany({
    where: { customerId: String(customerId) },
    orderBy: { order: 'asc' },
  });
  return success(res, { rows: rows.map((row) => serialize(row)) });
}

export async function importRows(req: Request, res: Response) {
  const { customerId, rows } = req.body;
  const userId = (req as { userId?: string }).userId;
  if (!customerId || !Array.isArray(rows)) {
    return failure(res, 400, 'Invalid import params', 'gri-materiality/invalid-params');
  }

  const prisma = getPrisma();
  const cid = String(customerId);
  await prisma.gRIMaterialityMatrixRow.deleteMany({ where: { customerId: cid } });

  const docs = await prisma.$transaction(
    rows.map((row: Record<string, unknown>, idx: number) =>
      prisma.gRIMaterialityMatrixRow.create({
        data: {
          customerId: cid,
          order: idx,
          subject: String(row.subject || '').trim(),
          griMapping: String(row.griMapping || '').trim(),
          disclosures: String(row.disclosures || '').trim(),
          notes: String(row.notes || '').trim(),
          createdBy: userId,
          ownerId: userId,
        },
      }),
    ),
  );

  return success(res, { imported: docs.length });
}
