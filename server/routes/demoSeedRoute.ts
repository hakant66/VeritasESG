/**
 * Demo seed endpoint: restores the frozen snapshot in server/data/demo-snapshot.json
 * into Postgres via Prisma. The snapshot is generated from live data via
 * `npx tsx scripts/generate-demo-snapshot.ts` and committed to the repo.
 *
 * Records are matched by natural keys (sector name+type, customer name,
 * contact email, user email, project name) and upserted; original snapshot
 * IDs are remapped so cross-entity relations stay intact. No random data.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Express, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { getPrisma } from '../data/prismaClient.ts';
import { resolvePlatformUserFromRequest } from '../lib/requestAuth.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = path.join(__dirname, '..', 'data', 'demo-snapshot.json');

type SnapshotDoc = Record<string, any> & { id: string };

interface DemoSnapshot {
  generatedAt: string;
  counts: Record<string, number>;
  segments: SnapshotDoc[];
  sectorCategories: SnapshotDoc[];
  templates?: SnapshotDoc[];
  templatePages?: SnapshotDoc[];
  questions?: SnapshotDoc[];
  customers: SnapshotDoc[];
  branches: SnapshotDoc[];
  contacts: SnapshotDoc[];
  platformUsers: SnapshotDoc[];
  projects: SnapshotDoc[];
}

function loadSnapshot(): DemoSnapshot {
  const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  return JSON.parse(raw) as DemoSnapshot;
}

/** Snapshot doc → Prisma payload (drops id + timestamps; timestamps are managed by Prisma). */
function toPayload(doc: SnapshotDoc): Record<string, any> {
  const { id, createdAt, updatedAt, ...rest } = doc;
  return rest;
}

const fieldSetCache = new Map<string, Set<string>>();
function fieldSetFor(modelName: string): Set<string> {
  let fields = fieldSetCache.get(modelName);
  if (!fields) {
    fields = new Set(
      Prisma.dmmf.datamodel.models.find((m) => m.name === modelName)?.fields.map((f) => f.name) ?? [],
    );
    fieldSetCache.set(modelName, fields);
  }
  return fields;
}

/** Keeps only keys that are real scalar/enum columns on the target Prisma model. */
function pickFields(modelName: string, data: Record<string, unknown>): Record<string, unknown> {
  const allowed = fieldSetFor(modelName);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (allowed.has(key)) out[key] = value;
  }
  return out;
}

type Delegate = {
  findFirst: (args: { where: Record<string, unknown> }) => Promise<{ id: string } | null>;
  create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<{ id: string }>;
};

async function upsertRow(
  modelName: string,
  delegate: Delegate,
  where: Record<string, unknown>,
  payload: Record<string, unknown>,
): Promise<{ id: string; created: boolean }> {
  const data = pickFields(modelName, payload);
  const existing = await delegate.findFirst({ where });
  if (existing) {
    await delegate.update({ where: { id: existing.id }, data });
    return { id: existing.id, created: false };
  }
  const created = await delegate.create({ data });
  return { id: created.id, created: true };
}

export function registerDemoSeedRoutes(app: Express, options: { jwtSecret: string }) {
  app.post('/api/demo/seed', async (req: Request, res: Response) => {
    const { user } = await resolvePlatformUserFromRequest(req, options.jwtSecret);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (user.role !== 'platform_admin') {
      return res.status(403).json({ error: 'Only platform admins can run the demo seed.' });
    }

    const prisma = getPrisma();
    const log: string[] = [];
    const addLog = (msg: string) => log.push(msg);

    try {
      if (!fs.existsSync(SNAPSHOT_PATH)) {
        return res.status(500).json({
          error: 'Demo snapshot file is missing (server/data/demo-snapshot.json).',
        });
      }
      const snapshot = loadSnapshot();
      addLog(`Snapshot loaded (generated at ${snapshot.generatedAt}).`);

      const stats = {
        segments: { created: 0, updated: 0 },
        sectorCategories: { created: 0, updated: 0 },
        templates: { created: 0, updated: 0 },
        templatePages: { created: 0, updated: 0 },
        questions: { created: 0, updated: 0 },
        platformUsers: { created: 0, updated: 0 },
        customers: { created: 0, updated: 0 },
        branches: { created: 0, updated: 0 },
        contacts: { created: 0, updated: 0 },
        projects: { created: 0, updated: 0 },
      };
      const bump = (key: keyof typeof stats, created: boolean) => {
        if (created) stats[key].created += 1;
        else stats[key].updated += 1;
      };

      // 1. Platform users (by email). customerId is remapped after customers exist.
      const userIdMap = new Map<string, string>();
      for (const u of snapshot.platformUsers) {
        const email = String(u.email || '').trim().toLowerCase();
        if (!email) continue;
        const payload = toPayload(u);
        delete payload.customerId;
        delete payload.lastLoginAt;
        const r = await upsertRow('PlatformUser', prisma.platformUser, { email }, { ...payload, email, department: payload.department || '' });
        userIdMap.set(u.id, r.id);
        bump('platformUsers', r.created);
      }
      addLog(
        `Users synced: ${stats.platformUsers.created} created, ${stats.platformUsers.updated} updated.`,
      );

      const mapUser = (oldId: unknown): string | undefined =>
        typeof oldId === 'string' ? userIdMap.get(oldId) : undefined;

      // 2. Sectors / service categories (segments, by name + type).
      const segmentIdMap = new Map<string, string>();
      for (const s of snapshot.segments) {
        const payload = toPayload(s);
        const mappedCreatedBy = mapUser(s.createdBy);
        if (mappedCreatedBy) payload.createdBy = mappedCreatedBy;
        const type = s.type ?? '';
        const r = await upsertRow('Segment', prisma.segment, { name: s.name, type }, { ...payload, type });
        segmentIdMap.set(s.id, r.id);
        bump('segments', r.created);
      }
      addLog(`Sectors synced: ${stats.segments.created} created, ${stats.segments.updated} updated.`);

      // 3. Sector categories (by questionSetType + kod).
      for (const c of snapshot.sectorCategories) {
        const payload = toPayload(c);
        const mappedCreatedBy = mapUser(c.createdBy);
        if (mappedCreatedBy) payload.createdBy = mappedCreatedBy;
        const r = await upsertRow(
          'SectorCategory',
          prisma.sectorCategory,
          { questionSetType: c.questionSetType, kod: c.kod },
          payload,
        );
        bump('sectorCategories', r.created);
      }
      addLog(
        `Categories synced: ${stats.sectorCategories.created} created, ${stats.sectorCategories.updated} updated.`,
      );

      const templates = snapshot.templates ?? [];
      const templatePages = snapshot.templatePages ?? [];
      const questions = snapshot.questions ?? [];

      // 4. Templates (by sector + name). sectorId remapped via segmentIdMap.
      const templateIdMap = new Map<string, string>();
      for (const tmpl of templates) {
        const name = String(tmpl.name || '').trim();
        if (!name) continue;
        const payload = toPayload(tmpl);
        const sectorId = segmentIdMap.get(String(tmpl.sectorId)) || tmpl.sectorId;
        payload.sectorId = sectorId;
        const mappedCreatedBy = mapUser(tmpl.createdBy);
        if (mappedCreatedBy) payload.createdBy = mappedCreatedBy;
        const r = await upsertRow('Template', prisma.template, { name, sectorId }, payload);
        templateIdMap.set(tmpl.id, r.id);
        bump('templates', r.created);
      }
      addLog(
        `Templates synced: ${stats.templates.created} created, ${stats.templates.updated} updated.`,
      );

      // 5. Template pages (by template + title).
      const templatePageIdMap = new Map<string, string>();
      for (const page of templatePages) {
        const templateId = templateIdMap.get(String(page.templateId));
        if (!templateId) {
          addLog(`Skipping template page "${page.title}" (template not in snapshot).`);
          continue;
        }
        const title = String(page.title || '').trim();
        if (!title) continue;
        const payload = toPayload(page);
        payload.templateId = templateId;
        const mappedCreatedBy = mapUser(page.createdBy);
        if (mappedCreatedBy) payload.createdBy = mappedCreatedBy;
        const r = await upsertRow('TemplatePage', prisma.templatePage, { templateId, title }, payload);
        templatePageIdMap.set(page.id, r.id);
        bump('templatePages', r.created);
      }
      addLog(
        `Template pages synced: ${stats.templatePages.created} created, ${stats.templatePages.updated} updated.`,
      );

      // 6. Questions (by template + kod).
      for (const q of questions) {
        const templateId = templateIdMap.get(String(q.templateId));
        if (!templateId) {
          addLog(`Skipping question "${q.kod}" (template not in snapshot).`);
          continue;
        }
        const kod = String(q.kod || '').trim();
        if (!kod) continue;
        const payload = toPayload(q);
        payload.templateId = templateId;
        payload.sectorId = segmentIdMap.get(String(q.sectorId)) || q.sectorId;
        if (q.pageId) {
          payload.pageId = templatePageIdMap.get(String(q.pageId)) || q.pageId;
        }
        const mappedCreatedBy = mapUser(q.createdBy);
        if (mappedCreatedBy) payload.createdBy = mappedCreatedBy;
        const r = await upsertRow('Question', prisma.question, { templateId, kod }, payload);
        bump('questions', r.created);
      }
      addLog(
        `Questions synced: ${stats.questions.created} created, ${stats.questions.updated} updated.`,
      );

      // 7. Customers (by name, case-insensitive). sectorIds remapped to new segment ids.
      const customerIdMap = new Map<string, string>();
      for (const c of snapshot.customers) {
        const name = String(c.name || '').trim();
        if (!name) continue;
        const payload = toPayload(c);
        if (Array.isArray(c.sectorIds)) {
          payload.sectorIds = c.sectorIds
            .map((sid: string) => segmentIdMap.get(sid) || sid)
            .filter(Boolean);
        }
        const mappedCreatedBy = mapUser(c.createdBy);
        if (mappedCreatedBy) payload.createdBy = mappedCreatedBy;
        const r = await upsertRow(
          'Customer',
          prisma.customer,
          { name: { equals: name, mode: 'insensitive' } },
          payload,
        );
        customerIdMap.set(c.id, r.id);
        bump('customers', r.created);
      }
      addLog(
        `Customers synced: ${stats.customers.created} created, ${stats.customers.updated} updated.`,
      );

      // 8. Branches (by customer + name).
      const branchIdMap = new Map<string, string>();
      for (const b of snapshot.branches) {
        const customerId = customerIdMap.get(b.customerId);
        if (!customerId) {
          addLog(`Skipping branch "${b.name}" (customer not in snapshot).`);
          continue;
        }
        const payload = toPayload(b);
        payload.customerId = customerId;
        const mappedCreatedBy = mapUser(b.createdBy);
        if (mappedCreatedBy) payload.createdBy = mappedCreatedBy;
        const r = await upsertRow('Branch', prisma.branch, { customerId, name: b.name }, payload);
        branchIdMap.set(b.id, r.id);
        bump('branches', r.created);
      }
      addLog(`Branches synced: ${stats.branches.created} created, ${stats.branches.updated} updated.`);

      // 9. Contacts / stakeholders (by customer + email, falling back to name + role).
      for (const ct of snapshot.contacts) {
        const customerId = customerIdMap.get(ct.customerId);
        if (!customerId) {
          addLog(`Skipping stakeholder "${ct.name}" (customer not in snapshot).`);
          continue;
        }
        const payload = toPayload(ct);
        payload.customerId = customerId;
        if (ct.branchId) payload.branchId = branchIdMap.get(ct.branchId) || ct.branchId;
        const mappedCreatedBy = mapUser(ct.createdBy);
        if (mappedCreatedBy) payload.createdBy = mappedCreatedBy;
        const email = String(ct.email || '').trim().toLowerCase();
        const where = email
          ? { customerId, email }
          : { customerId, name: ct.name, role: ct.role };
        const r = await upsertRow('Contact', prisma.contact, where, payload);
        bump('contacts', r.created);
      }
      addLog(`Stakeholders synced: ${stats.contacts.created} created, ${stats.contacts.updated} updated.`);

      // 10. Projects (by customer + name). templateId remapped when present.
      for (const p of snapshot.projects) {
        const customerId = customerIdMap.get(p.customerId) || p.customerId;
        const payload = toPayload(p);
        payload.customerId = customerId;
        if (p.templateId) {
          payload.templateId =
            templateIdMap.get(String(p.templateId)) || p.templateId;
        }
        const mappedCreatedBy = mapUser(p.createdBy);
        if (mappedCreatedBy) payload.createdBy = mappedCreatedBy;
        const r = await upsertRow('Project', prisma.project, { customerId, name: p.name }, payload);
        bump('projects', r.created);
      }
      addLog(`Projects synced: ${stats.projects.created} created, ${stats.projects.updated} updated.`);

      // 11. Backfill user → customer links now that customers exist.
      let userCustomerLinks = 0;
      for (const u of snapshot.platformUsers) {
        if (!u.customerId) continue;
        const newUserId = userIdMap.get(u.id);
        const newCustomerId = customerIdMap.get(u.customerId);
        if (!newUserId || !newCustomerId) continue;
        await prisma.platformUser.update({
          where: { id: newUserId },
          data: { customerId: newCustomerId },
        });
        userCustomerLinks += 1;
      }
      if (userCustomerLinks > 0) {
        addLog(`Linked ${userCustomerLinks} user(s) to their customer accounts.`);
      }

      addLog('Demo snapshot seeding complete.');
      return res.json({ ok: true, log, stats, generatedAt: snapshot.generatedAt });
    } catch (err) {
      console.error('[DEMO SEED] Failed:', err);
      addLog(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
      return res.status(500).json({ ok: false, log, error: 'Demo seed failed.' });
    }
  });
}
