/**
 * TSRS completeness validation against the SQL (Prisma) compliance seam.
 *
 * Ported from the former Mongo-backed `tests/server/lib/tsrsCompleteness.test.ts`.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { inject } from 'vitest';
import { seedTsrsFrameworkRequirements } from '../../../server/lib/tsrsRequirementSeed.ts';
import { CompletenessService } from '../../../server/services/compliance/CompletenessService.ts';
import { FrameworkRegistry } from '../../../server/services/compliance/FrameworkRegistry.ts';
import { getPrisma } from '../../../server/data/prismaClient.ts';
import {
  clearSqlTables,
  createSqlAnswer,
  createSqlCustomer,
  createSqlProject,
} from '../helpers/sqlTestHarness.ts';

const statePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../.vitest-sql-state.json',
);
const sqlState = existsSync(statePath)
  ? (JSON.parse(readFileSync(statePath, 'utf8')) as { skipped?: boolean })
  : { skipped: false };

const describeSql = describe.skipIf(Boolean(sqlState.skipped));

describeSql('TSRS completeness validation (SQL)', () => {
  beforeEach(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
    await seedTsrsFrameworkRequirements();
  });

  afterAll(async () => {
    if (inject('sqlTestsSkipped') === '1') return;
    await clearSqlTables();
  });

  it('marks TSRS 1 disclosures answered when mapped project questions have answers', async () => {
    const customer = await createSqlCustomer({ name: 'TSRS Customer' });
    const project = await createSqlProject({
      name: 'TSRS Test Project',
      customerId: customer.id,
    });
    const projectId = project.id;

    const governanceQuestion = await getPrisma().projectQuestion.create({
      data: {
        projectId,
        sourceQuestionId: 'src-1',
        sourceTemplateId: 'tpl-1',
        sectorId: 'sec-1',
        kod: 'GRI 3-3',
        baslik: 'Yönetişim',
        soru: 'Yönetişim açıklaması',
        ilgiliBirim: 'YK',
        aciklama: '',
        ornekYanit: '',
        raporYeri: '',
        thematicGroup: 'governance',
        isMandatory: true,
        order: 1,
        tsrs1: 'Par.26',
      },
    });

    await createSqlAnswer({
      projectId,
      assignmentId: 'asg-1',
      questionId: governanceQuestion.id,
      contactId: 'contact-1',
      latestAnswer: 'İklim riskleri yönetim kurulunda izlenmektedir.',
    });

    const service = new CompletenessService(new FrameworkRegistry());
    await (service as unknown as {
      runValidation: (p: string, f: string[], u: string) => Promise<void>;
    }).runValidation(projectId, ['tsrs_1'], 'test-user');

    const run = await getPrisma().complianceRun.findFirst({
      where: { projectId, frameworkId: 'tsrs_1' },
      orderBy: { createdAt: 'desc' },
    });

    expect(run).not.toBeNull();
    expect(run?.totalRequirements).toBe(14);
    expect(run?.answeredRequirements ?? 0).toBeGreaterThanOrEqual(1);
    const gaps = (Array.isArray(run?.gaps) ? run?.gaps : []) as Array<{ disclosureId?: string }>;
    expect(gaps.some((gap) => gap.disclosureId === 'tsrs_1_par_26')).toBe(false);
  });
});
