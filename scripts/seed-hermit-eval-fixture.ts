/**
 * One-off, idempotent seed for the Hermit evaluation-fixture project.
 *
 * Creates a dedicated, clearly-internal Customer/Project/PlatformUser
 * (service account) + one real Question/Assignment pair so
 * hermit/pipelines/questionnaire_autofill/pipeline.py has something real
 * to call via POST /api/kb-rag/tasks/autofill-answer. This is synthetic
 * data only — never a real customer's project.
 *
 * Also mints a JWT for the service account (same shape as a normal login
 * token — see server.ts:signAuthToken) and prints it, for use as
 * HERMIT_SERVICE_TOKEN. The service account has no password (passwordHash
 * left null); it is never meant to log in via the UI.
 *
 * Run: npx tsx scripts/seed-hermit-eval-fixture.ts
 */

import jwt from 'jsonwebtoken';
import { getPrisma } from '../server/data/prismaClient.ts';

const FIXTURE_CUSTOMER_NAME = 'Hermit Değerlendirme Sabiti (Dahili — Sentetik Veri)';
const FIXTURE_PROJECT_NAME = 'Hermit Eval Fixture — Questionnaire Autofill';
const SERVICE_ACCOUNT_EMAIL = 'hermit-eval@internal.veritasesg.local';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-platform-key-dev-only';

async function main() {
  const prisma = getPrisma();

  const customer = await prisma.customer.upsert({
    where: { id: 'hermit-eval-fixture-customer' },
    update: {},
    create: {
      id: 'hermit-eval-fixture-customer',
      name: FIXTURE_CUSTOMER_NAME,
      description: 'Internal-only fixture for Hermit AI-quality evaluation. Not a real customer.',
    },
  });

  const project = await prisma.project.upsert({
    where: { id: 'hermit-eval-fixture-project' },
    update: {},
    create: {
      id: 'hermit-eval-fixture-project',
      customerId: customer.id,
      name: FIXTURE_PROJECT_NAME,
      category: 'Project',
      status: 'active',
    },
  });

  const serviceUser = await prisma.platformUser.upsert({
    where: { email: SERVICE_ACCOUNT_EMAIL },
    update: {},
    create: {
      id: 'hermit-eval-service-account',
      name: 'Hermit Evaluation Service Account',
      email: SERVICE_ACCOUNT_EMAIL,
      passwordHash: null,
      role: 'consultant',
      department: 'AI Quality (internal)',
      isConfirmed: true,
    },
  });

  // One ProjectQuestion mirroring the shape of a real questionnaire item,
  // with its evidence intentionally absent -> matches dataset case VE-001's
  // expected_behaviour: "insufficient_evidence" (no KB docs indexed for
  // this fixture project yet).
  const question = await prisma.projectQuestion.upsert({
    where: { id: 'hermit-eval-fixture-question-1' },
    update: {},
    create: {
      id: 'hermit-eval-fixture-question-1',
      projectId: project.id,
      sourceQuestionId: 'hermit-eval-fixture-question-1',
      sourceTemplateId: 'hermit-eval-fixture',
      sectorId: 'hermit-eval-fixture',
      bolum: 'ÇEVRESEL STANDARTLAR',
      kod: 'GRI 305',
      baslik: 'Scope 2 Emisyonları',
      soru: "What evidence supports the company's Scope 2 emissions figure?",
      thematicGroup: 'Hermit_Eval_Fixture',
      answerFormat: 'textarea',
      numara: 1,
      order: 0,
    },
  });

  const assignment = await prisma.assignment.upsert({
    where: { id: 'hermit-eval-fixture-assignment-1' },
    update: {},
    create: {
      id: 'hermit-eval-fixture-assignment-1',
      projectId: project.id,
      recipientId: serviceUser.id,
      recipientType: 'user',
      questionIds: [question.id],
      status: 'pending',
      assignedByName: 'seed-hermit-eval-fixture.ts',
    },
  });

  const token = jwt.sign(
    { uid: serviceUser.id, sub: serviceUser.id, email: serviceUser.email, role: serviceUser.role },
    JWT_SECRET,
    { expiresIn: '1d' },
  );

  console.log('Fixture ready:');
  console.log('  customerId   =', customer.id);
  console.log('  projectId    =', project.id);
  console.log('  questionId   =', question.id);
  console.log('  assignmentId =', assignment.id);
  console.log('  serviceUserId=', serviceUser.id);
  console.log('');
  console.log('HERMIT_SERVICE_TOKEN (expires in 1d, re-run this script to mint a fresh one):');
  console.log(token);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
