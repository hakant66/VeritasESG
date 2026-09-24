/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Persistence seam for the Materiality Assessment Survey module
 * (docs/features/materiality-survey-module-plan.md).
 *
 * Talks to Prisma; responses are normalized with withExternalId(s) to match
 * the rest of the API serialization.
 */

import { getPrisma } from './prismaClient.ts';
import { withExternalId, withExternalIds } from './entityLookup.ts';

type Row = Record<string, unknown>;

function db() {
  return getPrisma();
}

// --- Surveys ---------------------------------------------------------------

export interface SurveyInput {
  customerId: string;
  subeId?: string | null;
  title: string;
  standardRef?: string;
  year?: number | null;
  status?: string;
  deadline?: Date | null;
  scaleMax?: number;
  topicRollup?: string;
  materialThreshold?: number | null;
  reminderCadence?: number[];
  reminderCutoffDays?: number;
  maxReminders?: number;
  isTemplate?: boolean;
  createdBy?: string | null;
  ownerId?: string | null;
}

export async function createSurvey(input: SurveyInput): Promise<Row> {
  const row = await db().materialitySurvey.create({ data: input });
  return withExternalId(row as Row)!;
}

export async function listSurveys(customerId: string): Promise<Row[]> {
  const rows = await db().materialitySurvey.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
  });
  return withExternalIds(rows as Row[]);
}

/** Surveys flagged as reusable templates, across all customers. */
export async function listTemplateSurveys(): Promise<Row[]> {
  const rows = await db().materialitySurvey.findMany({
    where: { isTemplate: true },
    orderBy: { createdAt: 'desc' },
  });
  return withExternalIds(rows as Row[]);
}

export async function getSurveyById(id: string): Promise<Row | null> {
  return withExternalId(await db().materialitySurvey.findUnique({ where: { id } }));
}

export async function updateSurvey(id: string, data: Partial<SurveyInput>): Promise<Row | null> {
  const existing = await db().materialitySurvey.findUnique({ where: { id } });
  if (!existing) return null;
  const row = await db().materialitySurvey.update({
    where: { id },
    data: { ...data, updatedAt: new Date() },
  });
  return withExternalId(row as Row);
}

/** Cascade-delete a survey and all its IROs, groups, stakeholders, responses, and reminder logs. */
export async function deleteSurvey(id: string): Promise<boolean> {
  const prisma = db();
  const iros = await prisma.materialityIro.findMany({ where: { surveyId: id }, select: { id: true } });
  const groups = await prisma.materialityStakeholderGroup.findMany({
    where: { surveyId: id },
    select: { id: true },
  });
  const groupIds = groups.map((g) => g.id);
  const stakeholders = await prisma.materialityStakeholder.findMany({
    where: { groupId: { in: groupIds } },
    select: { id: true },
  });
  const stakeholderIds = stakeholders.map((s) => s.id);
  const iroIds = iros.map((i) => i.id);

  await prisma.$transaction([
    prisma.materialitySurveyResponse.deleteMany({ where: { iroId: { in: iroIds } } }),
    prisma.materialitySurveyReminderLog.deleteMany({ where: { stakeholderId: { in: stakeholderIds } } }),
    prisma.materialityStakeholder.deleteMany({ where: { groupId: { in: groupIds } } }),
    prisma.materialityStakeholderGroup.deleteMany({ where: { surveyId: id } }),
    prisma.materialityIro.deleteMany({ where: { surveyId: id } }),
    prisma.materialitySurvey.delete({ where: { id } }),
  ]);
  return true;
}

/**
 * Clone a survey's topics + IROs into a new draft survey for `targetCustomerId`.
 * Stakeholder groups/stakeholders/responses are intentionally NOT copied — the
 * clone is a fresh instance to run. When cloning within the same customer, the
 * existing GRIMaterialityMatrixRow topics are reused directly; across customers
 * (e.g. copying a template into a real client) the topic rows are duplicated
 * into the target customer's longlist first.
 */
export async function cloneSurvey(
  sourceId: string,
  target: { customerId: string; title: string; createdBy?: string | null; ownerId?: string | null },
): Promise<Row | null> {
  const prisma = db();
  const source = await prisma.materialitySurvey.findUnique({ where: { id: sourceId } });
  if (!source) return null;

  const sourceIros = await prisma.materialityIro.findMany({
    where: { surveyId: sourceId },
    orderBy: [{ topicRef: 'asc' }, { sortOrder: 'asc' }],
  });

  const topicRefs = [...new Set(sourceIros.map((i) => i.topicRef))];
  let topicRefMap = new Map<string, string>();
  if (topicRefs.length > 0) {
    if (target.customerId === source.customerId) {
      topicRefMap = new Map(topicRefs.map((ref) => [ref, ref]));
    } else {
      const topics = await prisma.gRIMaterialityMatrixRow.findMany({ where: { id: { in: topicRefs } } });
      let order = 0;
      for (const topic of topics) {
        const created = await prisma.gRIMaterialityMatrixRow.create({
          data: {
            customerId: target.customerId,
            order: order++,
            subject: topic.subject,
            griMapping: topic.griMapping,
            disclosures: topic.disclosures,
            notes: topic.notes,
            isUniversalDisclosure: topic.isUniversalDisclosure,
            createdBy: target.createdBy ?? null,
            ownerId: target.ownerId ?? null,
          },
        });
        topicRefMap.set(topic.id, created.id);
      }
    }
  }

  const created = await prisma.materialitySurvey.create({
    data: {
      customerId: target.customerId,
      subeId: source.subeId,
      title: target.title,
      standardRef: source.standardRef,
      year: source.year,
      status: 'draft',
      scaleMax: source.scaleMax,
      topicRollup: source.topicRollup,
      materialThreshold: source.materialThreshold,
      reminderCadence: source.reminderCadence as unknown as number[],
      reminderCutoffDays: source.reminderCutoffDays,
      maxReminders: source.maxReminders,
      isTemplate: false,
      createdBy: target.createdBy ?? null,
      ownerId: target.ownerId ?? null,
    },
  });

  const iroInputs = sourceIros
    .map((iro) => topicRefMap.get(iro.topicRef))
    .map((mappedRef, idx) =>
      mappedRef
        ? {
            surveyId: created.id,
            topicRef: mappedRef,
            description: sourceIros[idx].description,
            iroType: sourceIros[idx].iroType,
            valueChainPosition: sourceIros[idx].valueChainPosition,
            polarity: sourceIros[idx].polarity,
            sasbRef: sourceIros[idx].sasbRef,
            esrsRef: sourceIros[idx].esrsRef,
            sortOrder: sourceIros[idx].sortOrder,
            createdBy: target.createdBy ?? null,
            ownerId: target.ownerId ?? null,
          }
        : null,
    )
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (iroInputs.length > 0) {
    await prisma.materialityIro.createMany({ data: iroInputs });
  }

  return withExternalId(created as Row);
}

// --- IROs ------------------------------------------------------------------

export interface IroInput {
  surveyId: string;
  topicRef: string;
  description?: string;
  iroType?: string;
  valueChainPosition?: string;
  polarity?: string;
  sasbRef?: string | null;
  esrsRef?: string | null;
  sortOrder?: number;
  createdBy?: string | null;
  ownerId?: string | null;
}

export async function listIros(surveyId: string): Promise<Row[]> {
  const rows = await db().materialityIro.findMany({
    where: { surveyId },
    orderBy: [{ topicRef: 'asc' }, { sortOrder: 'asc' }],
  });
  return withExternalIds(rows as Row[]);
}

export async function createIro(input: IroInput): Promise<Row> {
  return withExternalId(await db().materialityIro.create({ data: input }) as Row)!;
}

export async function createIros(inputs: IroInput[]): Promise<number> {
  const res = await db().materialityIro.createMany({ data: inputs });
  return res.count;
}

export async function updateIro(id: string, data: Partial<IroInput>): Promise<Row | null> {
  const existing = await db().materialityIro.findUnique({ where: { id } });
  if (!existing) return null;
  return withExternalId(
    (await db().materialityIro.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    })) as Row,
  );
}

export async function deleteIro(id: string): Promise<boolean> {
  await db().$transaction([
    db().materialitySurveyResponse.deleteMany({ where: { iroId: id } }),
    db().materialityIro.delete({ where: { id } }),
  ]);
  return true;
}

// --- Stakeholder groups ----------------------------------------------------

export interface GroupInput {
  surveyId: string;
  name: string;
  weight?: number;
  sortOrder?: number;
  createdBy?: string | null;
  ownerId?: string | null;
}

export async function listGroups(surveyId: string): Promise<Row[]> {
  const rows = await db().materialityStakeholderGroup.findMany({
    where: { surveyId },
    orderBy: { sortOrder: 'asc' },
  });
  return withExternalIds(rows as Row[]);
}

export async function createGroup(input: GroupInput): Promise<Row> {
  return withExternalId(await db().materialityStakeholderGroup.create({ data: input }) as Row)!;
}

export async function updateGroup(id: string, data: Partial<GroupInput>): Promise<Row | null> {
  const existing = await db().materialityStakeholderGroup.findUnique({ where: { id } });
  if (!existing) return null;
  return withExternalId(
    (await db().materialityStakeholderGroup.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    })) as Row,
  );
}

export async function deleteGroup(id: string): Promise<boolean> {
  const prisma = db();
  const stakeholders = await prisma.materialityStakeholder.findMany({
    where: { groupId: id },
    select: { id: true },
  });
  const stakeholderIds = stakeholders.map((s) => s.id);
  await prisma.$transaction([
    prisma.materialitySurveyReminderLog.deleteMany({ where: { stakeholderId: { in: stakeholderIds } } }),
    prisma.materialityStakeholder.deleteMany({ where: { groupId: id } }),
    prisma.materialityStakeholderGroup.delete({ where: { id } }),
  ]);
  return true;
}

// --- Stakeholders ----------------------------------------------------------

export interface StakeholderInput {
  groupId: string;
  name: string;
  email: string;
  phone?: string | null;
  locale?: string;
  inviteToken: string;
  status?: string;
  createdBy?: string | null;
  ownerId?: string | null;
}

/** All stakeholders in a survey (joined through its groups). */
export async function listStakeholders(surveyId: string): Promise<Row[]> {
  const groups = await db().materialityStakeholderGroup.findMany({
    where: { surveyId },
    select: { id: true },
  });
  const rows = await db().materialityStakeholder.findMany({
    where: { groupId: { in: groups.map((g) => g.id) } },
    orderBy: { createdAt: 'asc' },
  });
  return withExternalIds(rows as Row[]);
}

export async function createStakeholders(inputs: StakeholderInput[]): Promise<number> {
  const res = await db().materialityStakeholder.createMany({ data: inputs });
  return res.count;
}

export async function getStakeholderByToken(inviteToken: string): Promise<Row | null> {
  return withExternalId(await db().materialityStakeholder.findUnique({ where: { inviteToken } }));
}

export async function updateStakeholder(
  id: string,
  data: Partial<StakeholderInput> & { invitedAt?: Date; completedAt?: Date | null },
): Promise<Row | null> {
  const existing = await db().materialityStakeholder.findUnique({ where: { id } });
  if (!existing) return null;
  return withExternalId(
    (await db().materialityStakeholder.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
    })) as Row,
  );
}

/**
 * Resolve a public survey token into everything the SurveyRunner needs:
 * the stakeholder, its survey, and the survey's IROs. Null if the token is unknown.
 */
export async function getSurveyContextForToken(
  inviteToken: string,
): Promise<{ stakeholder: Row; group: Row; survey: Row; iros: Row[] } | null> {
  const prisma = db();
  const stakeholder = await prisma.materialityStakeholder.findUnique({ where: { inviteToken } });
  if (!stakeholder) return null;
  const group = await prisma.materialityStakeholderGroup.findUnique({ where: { id: stakeholder.groupId } });
  if (!group) return null;
  const survey = await prisma.materialitySurvey.findUnique({ where: { id: group.surveyId } });
  if (!survey) return null;
  const iros = await prisma.materialityIro.findMany({
    where: { surveyId: survey.id },
    orderBy: [{ topicRef: 'asc' }, { sortOrder: 'asc' }],
  });
  return {
    stakeholder: withExternalId(stakeholder as Row)!,
    group: withExternalId(group as Row)!,
    survey: withExternalId(survey as Row)!,
    iros: withExternalIds(iros as Row[]),
  };
}

// --- Responses -------------------------------------------------------------

export interface ResponseInput {
  iroId: string;
  stakeholderId: string;
  financialMaterialityScore: number;
  impactSeverityScore: number;
  impactScopeScore: number;
  impactProbabilityScore: number;
  irremediabilityScore?: number | null;
  freeTextComment?: string;
}

/** Idempotent per (iroId, stakeholderId): re-submitting overwrites the prior answer. */
export async function upsertResponse(input: ResponseInput): Promise<Row> {
  const { iroId, stakeholderId, ...scores } = input;
  const row = await db().materialitySurveyResponse.upsert({
    where: { iroId_stakeholderId: { iroId, stakeholderId } },
    create: { iroId, stakeholderId, ...scores },
    update: { ...scores, submittedAt: new Date(), updatedAt: new Date() },
  });
  return withExternalId(row as Row)!;
}

export async function listStakeholderResponses(stakeholderId: string): Promise<Row[]> {
  const rows = await db().materialitySurveyResponse.findMany({ where: { stakeholderId } });
  return withExternalIds(rows as Row[]);
}

// --- Reminders -------------------------------------------------------------

/**
 * Record a reminder send. Idempotent: the unique (stakeholderId, reminderNumber)
 * constraint means overlapping cron runs cannot double-count. Returns true when a
 * new row was written (i.e. this reminder had not been sent yet).
 */
export async function recordReminder(stakeholderId: string, reminderNumber: number): Promise<boolean> {
  const res = await db().materialitySurveyReminderLog.createMany({
    data: [{ stakeholderId, reminderNumber }],
    skipDuplicates: true,
  });
  return res.count > 0;
}

export async function countReminders(stakeholderId: string): Promise<number> {
  return db().materialitySurveyReminderLog.count({ where: { stakeholderId } });
}

export interface ReminderCandidate {
  id: string;
  name: string;
  email: string;
  locale: string;
  inviteToken: string;
  status: string;
  invitedAt: Date | null;
  surveyId: string;
  surveyTitle: string;
  reminderCadence: number[];
  reminderCutoffDays: number;
  maxReminders: number;
  deadline: Date | null;
  reminderCount: number;
}

/**
 * Stakeholders eligible for a reminder sweep: surveys still collecting, not yet
 * completed, previously invited. The route decides who is actually due from the
 * cadence/cutoff. reminderCount lets it pick the next reminder number.
 */
export async function listReminderCandidates(): Promise<ReminderCandidate[]> {
  const rows = await db().$queryRawUnsafe<
    Array<Record<string, unknown>>
  >(
    `SELECT s.id, s.name, s.email, s.locale, s."inviteToken", s.status, s."invitedAt",
            sv.id AS "surveyId", sv.title AS "surveyTitle",
            sv."reminderCadence", sv."reminderCutoffDays", sv."maxReminders", sv.deadline,
            (SELECT COUNT(*) FROM materialitysurveyreminderlogs rl WHERE rl."stakeholderId" = s.id) AS "reminderCount"
     FROM materialitystakeholders s
     JOIN materialitystakeholdergroups g ON g.id = s."groupId"
     JOIN materialitysurveys sv ON sv.id = g."surveyId"
     WHERE sv.status = 'collecting'
       AND s."completedAt" IS NULL
       AND s.status IN ('invited', 'reminded')
       AND s."invitedAt" IS NOT NULL`,
  );

  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    email: String(r.email ?? ''),
    locale: String(r.locale ?? 'tr'),
    inviteToken: String(r.inviteToken ?? ''),
    status: String(r.status ?? ''),
    invitedAt: r.invitedAt ? new Date(r.invitedAt as string) : null,
    surveyId: String(r.surveyId),
    surveyTitle: String(r.surveyTitle ?? ''),
    reminderCadence: Array.isArray(r.reminderCadence) ? (r.reminderCadence as number[]) : [],
    reminderCutoffDays: Number(r.reminderCutoffDays ?? 14),
    maxReminders: Number(r.maxReminders ?? 3),
    deadline: r.deadline ? new Date(r.deadline as string) : null,
    reminderCount: Number(r.reminderCount ?? 0),
  }));
}

// --- Aggregation (matrix) --------------------------------------------------

export interface IroAggregate {
  iroId: string;
  topicRef: string;
  responseCount: number;
  avgFinancialMateriality: number | null;
  avgImpactMateriality: number | null;
}

/**
 * Stakeholder-weighted aggregation per IRO for the materiality matrix.
 * Impact = severity × scope × probability, averaged weighted by group weight;
 * financial = financialMaterialityScore, likewise weighted. Normalization to the
 * matrix scale happens in the frontend (Phase 5).
 */
export async function getSurveyAggregates(surveyId: string): Promise<IroAggregate[]> {
  const rows = await db().$queryRawUnsafe<
    Array<{
      iroId: string;
      topicRef: string;
      responseCount: bigint;
      avgFinancial: number | null;
      avgImpact: number | null;
    }>
  >(
    `SELECT i.id AS "iroId",
            i."topicRef" AS "topicRef",
            COUNT(r.id) AS "responseCount",
            SUM(r."financialMaterialityScore" * COALESCE(g.weight, 1)) / NULLIF(SUM(COALESCE(g.weight, 1)), 0) AS "avgFinancial",
            SUM((r."impactSeverityScore" * r."impactScopeScore" * r."impactProbabilityScore") * COALESCE(g.weight, 1)) / NULLIF(SUM(COALESCE(g.weight, 1)), 0) AS "avgImpact"
     FROM materialityiros i
     LEFT JOIN materialitysurveyresponses r ON r."iroId" = i.id
     LEFT JOIN materialitystakeholders s ON s.id = r."stakeholderId"
     LEFT JOIN materialitystakeholdergroups g ON g.id = s."groupId"
     WHERE i."surveyId" = $1
     GROUP BY i.id, i."topicRef"`,
    surveyId,
  );

  return rows.map((r) => ({
    iroId: r.iroId,
    topicRef: r.topicRef,
    responseCount: Number(r.responseCount),
    avgFinancialMateriality: r.avgFinancial === null ? null : Number(r.avgFinancial),
    avgImpactMateriality: r.avgImpact === null ? null : Number(r.avgImpact),
  }));
}

export interface IroDimensionScore {
  iroId: string;
  topicRef: string;
  responseCount: number;
  financial: number;
  severity: number;
  scope: number;
  probability: number;
}

/**
 * Per-IRO stakeholder-weighted averages of each raw dimension (financial +
 * impact severity/scope/probability). The matrix/export layer normalizes and
 * rolls these up to topic level.
 */
export async function getSurveyIroScores(surveyId: string): Promise<IroDimensionScore[]> {
  const rows = await db().$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT i.id AS "iroId", i."topicRef",
            COUNT(r.id) AS "responseCount",
            SUM(r."financialMaterialityScore" * COALESCE(g.weight, 1)) / NULLIF(SUM(COALESCE(g.weight, 1)), 0) AS fin,
            SUM(r."impactSeverityScore" * COALESCE(g.weight, 1)) / NULLIF(SUM(COALESCE(g.weight, 1)), 0) AS sev,
            SUM(r."impactScopeScore" * COALESCE(g.weight, 1)) / NULLIF(SUM(COALESCE(g.weight, 1)), 0) AS scope,
            SUM(r."impactProbabilityScore" * COALESCE(g.weight, 1)) / NULLIF(SUM(COALESCE(g.weight, 1)), 0) AS prob
     FROM materialityiros i
     LEFT JOIN materialitysurveyresponses r ON r."iroId" = i.id
     LEFT JOIN materialitystakeholders s ON s.id = r."stakeholderId"
     LEFT JOIN materialitystakeholdergroups g ON g.id = s."groupId"
     WHERE i."surveyId" = $1
     GROUP BY i.id, i."topicRef"`,
    surveyId,
  );
  return rows.map((r) => ({
    iroId: String(r.iroId),
    topicRef: String(r.topicRef),
    responseCount: Number(r.responseCount),
    financial: r.fin === null ? 0 : Number(r.fin),
    severity: r.sev === null ? 0 : Number(r.sev),
    scope: r.scope === null ? 0 : Number(r.scope),
    probability: r.prob === null ? 0 : Number(r.prob),
  }));
}

/** Resolve topicRef (GRIMaterialityMatrixRow ids) to subject/mapping/disclosures for labels + CSV. */
export async function getTopicMeta(
  ids: string[],
): Promise<Record<string, { subject: string; griMapping: string; disclosures: string }>> {
  if (ids.length === 0) return {};
  const rows = await db().gRIMaterialityMatrixRow.findMany({
    where: { id: { in: ids } },
    select: { id: true, subject: true, griMapping: true, disclosures: true },
  });
  const map: Record<string, { subject: string; griMapping: string; disclosures: string }> = {};
  for (const r of rows) {
    map[r.id] = { subject: r.subject ?? '', griMapping: r.griMapping ?? '', disclosures: r.disclosures ?? '' };
  }
  return map;
}
