/**
 * Generates a frozen demo snapshot from the CURRENT Postgres data.
 *
 * Captures: segments, sectorCategories, templates, templatePages, questions,
 * customers, branches, contacts, platformUsers, projects.
 *
 * Output: server/data/demo-snapshot.json
 *
 * Usage:
 *   npm run demo:snapshot
 *
 * Requires DATABASE_URL.
 */

import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPrisma } from '../server/data/prismaClient.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', 'server', 'data', 'demo-snapshot.json');

async function main() {
  const prisma = getPrisma();

  const [
    segments,
    sectorCategories,
    templates,
    allTemplatePages,
    allQuestions,
    customers,
    allBranches,
    allContacts,
    platformUsers,
    projects,
  ] = await Promise.all([
    prisma.segment.findMany(),
    prisma.sectorCategory.findMany(),
    prisma.template.findMany(),
    prisma.templatePage.findMany(),
    prisma.question.findMany(),
    prisma.customer.findMany(),
    prisma.branch.findMany(),
    prisma.contact.findMany(),
    prisma.platformUser.findMany(),
    prisma.project.findMany(),
  ]);

  const templateIds = new Set(templates.map((t) => t.id));
  const templatePages = allTemplatePages.filter((p) => templateIds.has(String(p.templateId)));
  const questions = allQuestions.filter((q) => templateIds.has(String(q.templateId)));

  const customerIds = new Set(customers.map((c) => c.id));
  const branches = allBranches.filter((b) => customerIds.has(String(b.customerId)));
  const contacts = allContacts.filter((c) => customerIds.has(String(c.customerId)));

  const orphanPages = allTemplatePages.length - templatePages.length;
  const orphanQuestions = allQuestions.length - questions.length;
  const orphanBranches = allBranches.length - branches.length;
  const orphanContacts = allContacts.length - contacts.length;
  if (orphanPages || orphanQuestions || orphanBranches || orphanContacts) {
    console.log(
      `Excluded orphans: ${orphanPages} pages, ${orphanQuestions} questions, ` +
        `${orphanBranches} branches, ${orphanContacts} contacts.`,
    );
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    sourceDatabase: 'postgres',
    counts: {
      segments: segments.length,
      sectorCategories: sectorCategories.length,
      templates: templates.length,
      templatePages: templatePages.length,
      questions: questions.length,
      customers: customers.length,
      branches: branches.length,
      contacts: contacts.length,
      platformUsers: platformUsers.length,
      projects: projects.length,
    },
    segments,
    sectorCategories,
    templates,
    templatePages,
    questions,
    customers,
    branches,
    contacts,
    platformUsers,
    projects,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2), 'utf8');

  console.log(`Demo snapshot written to ${OUTPUT_PATH}`);
  console.table(snapshot.counts);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
