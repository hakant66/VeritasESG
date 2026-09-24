/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { knowledgeBases, domains, customers, projects } from '../../../services/db.ts';
import type { Customer, Domain, KBDocument, KnowledgeBase, Project } from '../../../types';
import { formatKbIngestErrorMessage } from '../../../../lib/kbIngestErrors.ts';
import { getKbDocumentIndexStatus } from './kbRag.ts';

export type KnowledgeBaseListBootstrap = {
  kbList: KnowledgeBase[];
  domainList: Domain[];
  customerList: Customer[];
  projectList: Project[];
};

export type KnowledgeBaseDetailData = {
  kb: KnowledgeBase | null;
  documents: KBDocument[];
  ingestFailures: Record<string, string>;
};

export type KbIngestErrorMessages = {
  geminiQuota: string;
  fallback: string;
};

export async function fetchKnowledgeBaseListBootstrap(): Promise<KnowledgeBaseListBootstrap> {
  const [kbList, domainList, customerList, projectList] = await Promise.all([
    knowledgeBases.list(),
    domains.list(),
    customers.list(),
    projects.list(),
  ]);
  return { kbList, domainList, customerList, projectList };
}

export async function fetchKnowledgeBaseDetail(
  kbId: string,
  ingestErrorMessages: KbIngestErrorMessages,
): Promise<KnowledgeBaseDetailData> {
  const [kb, documents] = await Promise.all([
    knowledgeBases.get(kbId),
    knowledgeBases.listDocuments(kbId),
  ]);

  const ingestFailures: Record<string, string> = {};
  const pending = documents.filter((doc) => !doc.processed && doc.text?.trim());
  await Promise.all(
    pending.map(async (doc) => {
      try {
        const status = await getKbDocumentIndexStatus(doc.id);
        if (status.job?.status === 'failed') {
          ingestFailures[doc.id] = formatKbIngestErrorMessage(
            status.job.errorCode || status.job.error,
            ingestErrorMessages,
          );
        }
      } catch {
        /* ignore per-document status errors */
      }
    }),
  );

  return { kb, documents, ingestFailures };
}
