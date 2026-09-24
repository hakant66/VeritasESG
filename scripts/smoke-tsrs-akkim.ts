/**
 * Rebuild Akkim TSRS project questions from Kimya template, seed sample answers,
 * and run TSRS 1/2 compliance validation smoke test.
 *
 * Usage: npx tsx scripts/smoke-tsrs-akkim.ts
 */

import dotenv from 'dotenv';
import { getPrisma } from '../server/data/prismaClient.ts';
import { cloneTemplateQuestionsToProject } from '../server/lib/cloneTemplateQuestionsToProject.ts';
import { seedTsrsFrameworkRequirements } from '../server/lib/tsrsRequirementSeed.ts';
import { CompletenessService } from '../server/services/compliance/CompletenessService.ts';
import { FrameworkRegistry } from '../server/services/compliance/FrameworkRegistry.ts';

dotenv.config();

const AKKIM_PROJECT_ID = '6a24cf11ad08116a60f8782c';
const KIMYA_TEMPLATE_ID = '6a24ab1eacddbe2a2dc2cee0';
const AKKIM_CUSTOMER_ID = '6a213df07ae56bf26fd1a7bb';

const SAMPLE_ANSWERS: { tsrs1?: string; tsrs2?: string; text: string }[] = [
  {
    tsrs1: 'Par.20',
    text: 'Akkim Kimya Sanayi ve Ticaret A.Ş. — raporlayan işletme tanımı (smoke test).',
  },
  {
    tsrs1: 'Par.26',
    text: 'Yönetim kurulu sürdürülebilirlik ve iklim risklerini üç ayda bir değerlendirmektedir.',
  },
  {
    tsrs1: 'Par.45',
    text: '2025 döneminde enerji tüketimi ve emisyon metrikleri raporlanmıştır.',
  },
  {
    tsrs2: 'Par.10',
    text: 'İklim stratejisi ve dayanıklılık analizi tamamlanmıştır.',
  },
  {
    tsrs2: 'Par.29a-i1',
    text: '12.450 tCO2e Kapsam 1 emisyonu (2025).',
  },
  {
    tsrs2: 'Par.29a-i2',
    text: '8.200 tCO2e Kapsam 2 emisyonu (2025).',
  },
];

async function waitForComplianceRun(
  projectId: string,
  frameworkId: string,
  timeoutMs = 8000,
): Promise<Record<string, unknown> | null> {
  const prisma = getPrisma();
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const run = await prisma.complianceRun.findFirst({
      where: { projectId, frameworkId },
      orderBy: { createdAt: 'desc' },
    });
    if (run) return run as unknown as Record<string, unknown>;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return null;
}

async function main() {
  const prisma = getPrisma();

  console.log('1) Seeding TSRS framework requirements…');
  await seedTsrsFrameworkRequirements();

  console.log('2) Rebuilding project questions from Kimya template…');
  const { count } = await cloneTemplateQuestionsToProject(AKKIM_PROJECT_ID, KIMYA_TEMPLATE_ID, {
    deleteExisting: true,
    customerId: AKKIM_CUSTOMER_ID,
  });
  console.log(`   Cloned ${count} project questions`);

  const tsrs1Count = await prisma.projectQuestion.count({
    where: { projectId: AKKIM_PROJECT_ID, tsrs1: { not: '' } },
  });
  const tsrs2Count = await prisma.projectQuestion.count({
    where: { projectId: AKKIM_PROJECT_ID, tsrs2: { not: '' } },
  });
  console.log(`   TSRS mappings: tsrs1=${tsrs1Count}, tsrs2=${tsrs2Count}`);

  if (tsrs1Count === 0 && tsrs2Count === 0) {
    console.error('FAIL: No TSRS fields on project questions after clone.');
    process.exit(1);
  }

  console.log('3) Seeding sample answers for TSRS smoke test…');
  await prisma.answer.deleteMany({ where: { projectId: AKKIM_PROJECT_ID } });

  let seeded = 0;
  for (const sample of SAMPLE_ANSWERS) {
    const where =
      sample.tsrs1 != null
        ? { projectId: AKKIM_PROJECT_ID, tsrs1: sample.tsrs1 }
        : { projectId: AKKIM_PROJECT_ID, tsrs2: sample.tsrs2! };

    const question = await prisma.projectQuestion.findFirst({ where });
    if (!question) {
      console.warn(`   Skip: no question for ${sample.tsrs1 ?? sample.tsrs2}`);
      continue;
    }

    await prisma.answer.create({
      data: {
        projectId: AKKIM_PROJECT_ID,
        questionId: question.id,
        assignmentId: 'smoke-assignment',
        contactId: 'smoke-contact',
        latestAnswer: sample.text,
        submittedAt: new Date(),
      },
    });
    seeded += 1;
    console.log(`   ✓ ${sample.tsrs1 ?? sample.tsrs2} → #${question.kod}`);
  }
  console.log(`   Seeded ${seeded} answers`);

  console.log('4) Running TSRS compliance validation…');
  const service = new CompletenessService(new FrameworkRegistry());
  await service.validateCompleteness(AKKIM_PROJECT_ID, ['tsrs_1', 'tsrs_2'], 'smoke-script');

  for (const frameworkId of ['tsrs_1', 'tsrs_2'] as const) {
    const run = await waitForComplianceRun(AKKIM_PROJECT_ID, frameworkId);
    if (!run) {
      console.error(`FAIL: No compliance run for ${frameworkId}`);
      process.exit(1);
    }
    const gaps = Array.isArray(run.gaps) ? run.gaps : [];
    console.log(
      `\n${frameworkId.toUpperCase()}:`,
      `${run.answeredRequirements}/${run.totalRequirements} answered`,
      `(${Number(run.completionPercentage).toFixed(1)}%)`,
      `— ${gaps.length} gaps`,
    );
    if (Number(run.answeredRequirements) < 1) {
      console.error(`FAIL: ${frameworkId} reported zero answered requirements`);
      process.exit(1);
    }
  }

  console.log('\nPASS: Akkim TSRS smoke test completed.');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
