/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { applyAiAnswerDisclaimer } from '../../../lib/aiAnswerDisclaimer.ts';
import {
  isLlmProviderId,
  LLM_PROVIDER_LABELS,
} from '../../../lib/llmSettings.ts';
import { describeLocalRagRetrieval } from '../../../lib/ragSearchConfig.ts';
import { formatTaskAutofillSourcesSection } from '../../../lib/taskAutofillSources.ts';
import {
  applyTaskGeneralAutofillPromptTemplate,
  buildExampleAnswerBlock,
  buildQuestionGuidanceBlock,
  getDefaultTaskGeneralAutofillPrompt,
  taskGeneralAutofillLanguageInstruction,
} from '../../../lib/taskGeneralAutofillPrompt.ts';
import { buildLocalAutofillUserPrompt } from '../../../lib/taskLocalAutofillPrompt.ts';
import { findProjectAndCustomer } from '../../data/projectLibDataAccess.ts';
import { findQuestionForProject } from '../findProjectQuestion.ts';
import { loadLlmSettings, resolveLlmRuntimeConfig } from '../llm/llmConfig.ts';
import { generateTextFromPrompt } from '../llm/llmService.ts';
import { buildCustomerProfileBlock } from './taskCustomerProfileContext.ts';
import { searchKbHitsForTaskQuestion } from './taskQuestionKbSearch.ts';
import type { CustomerKbSearchHit } from './searchCustomerKb.ts';

export type TaskQuestionAutofillMode = 'local' | 'general';

export type TaskQuestionAutofillResult = {
  answer: string;
  projectId: string;
  questionId: string;
  chunkCount: number;
  mode: TaskQuestionAutofillMode;
  sources: Array<{
    documentName: string;
    chunkIndex: number;
    score: number;
    textPreview: string;
  }>;
};

type QuestionDoc = {
  kod?: string;
  baslik?: string;
  soru?: string;
  aciklama?: string;
  ornekYanit?: string;
  ilgiliBirim?: string;
  ilgiliBirun?: string;
};

function buildContextBlock(hits: CustomerKbSearchHit[]) {
  return hits
    .map(
      (hit, idx) =>
        `[Chunk ${idx + 1} | ${hit.documentName} #${hit.chunkIndex} | score ${hit.score.toFixed(3)}]\n${hit.text}`,
    )
    .join('\n\n---\n\n');
}

function buildSourceChunksBlock(hits: CustomerKbSearchHit[], lang: 'tr' | 'en'): string {
  if (hits.length === 0) return '';
  const header =
    lang === 'tr' ? 'BİLGİ BANKASI PARÇALARI (referans):' : 'KNOWLEDGE BASE CHUNKS (reference):';
  return `\n${header}\n${buildContextBlock(hits)}`;
}

function buildLocalAutofillPrompt(
  opts: {
    customerName: string;
    projectName: string;
    question: QuestionDoc;
    lang: 'tr' | 'en';
    hits: CustomerKbSearchHit[];
    customerProfileBlock?: string;
  },
) {
  const { customerName, projectName, question, lang, hits, customerProfileBlock } = opts;

  return buildLocalAutofillUserPrompt({
    customerName,
    projectName,
    questionCode: String(question.kod ?? '').trim(),
    questionTitle: String(question.baslik ?? '').trim(),
    questionText: String(question.soru ?? '').trim(),
    questionGuidanceBlock: buildQuestionGuidanceBlock(question.aciklama),
    exampleAnswerBlock: buildExampleAnswerBlock(question.ornekYanit, lang),
    customerProfileBlock: customerProfileBlock?.trim() ? customerProfileBlock : '',
    sourceChunksBlock:
      hits.length > 0
        ? `\n${lang === 'tr' ? 'KAYNAK PARÇALARI:' : 'SOURCE CHUNKS:'}\n${buildContextBlock(hits)}`
        : '',
    lang,
    question,
  });
}

async function loadTaskQuestionContext(projectId: string, questionId: string) {
  const [loaded, questionResult] = await Promise.all([
    findProjectAndCustomer(projectId),
    findQuestionForProject(projectId, questionId),
  ]);

  if (!loaded?.project) {
    throw new Error('Project not found');
  }
  if (!questionResult) {
    throw new Error('Question not found');
  }

  const customerId = String(loaded.project.customerId || '').trim();
  if (!customerId) {
    throw new Error('Project has no customer');
  }

  const customer = loaded.customer;
  const customerName = String(customer?.name ?? '').trim() || 'Customer';
  const projectName = String(loaded.project.name ?? '').trim() || 'Project';
  const question = questionResult.doc as QuestionDoc;

  return { project: loaded.project, customerId, customerName, projectName, question, customer };
}

function buildGeneralAutofillPrompt(
  opts: {
    customerName: string;
    projectName: string;
    question: QuestionDoc;
    lang: 'tr' | 'en';
    promptTemplate: string;
    customer: Record<string, unknown> | null | undefined;
    hits: CustomerKbSearchHit[];
  },
) {
  const { customerName, projectName, question, lang, promptTemplate, customer, hits } = opts;
  const template = promptTemplate.trim() || getDefaultTaskGeneralAutofillPrompt(lang);

  const { block: customerProfileBlock, fields: profileFields } = buildCustomerProfileBlock(
    customer as Parameters<typeof buildCustomerProfileBlock>[0],
    lang,
  );
  const sourceChunksBlock = buildSourceChunksBlock(hits, lang);

  let prompt = applyTaskGeneralAutofillPromptTemplate(template, {
    customerName,
    projectName,
    questionCode: String(question.kod ?? '').trim(),
    questionTitle: String(question.baslik ?? '').trim(),
    questionText: String(question.soru ?? '').trim(),
    questionGuidanceBlock: buildQuestionGuidanceBlock(question.aciklama),
    exampleAnswerBlock: buildExampleAnswerBlock(question.ornekYanit, lang),
    customerProfileBlock,
    sourceChunksBlock,
    languageInstruction: taskGeneralAutofillLanguageInstruction(lang),
  });

  if (!template.includes('{{customerProfileBlock}}') && customerProfileBlock) {
    prompt += customerProfileBlock;
  }
  if (!template.includes('{{sourceChunksBlock}}') && sourceChunksBlock) {
    prompt += sourceChunksBlock;
  }

  return { prompt, profileFields };
}

async function resolveGeneralAutofillPromptTemplate(lang: 'tr' | 'en'): Promise<string> {
  const settings = await loadLlmSettings();
  const stored =
    lang === 'tr'
      ? settings.taskGeneralAutofillPrompt.tr
      : settings.taskGeneralAutofillPrompt.en;
  return stored.trim() || getDefaultTaskGeneralAutofillPrompt(lang);
}

async function resolveGeneralLlmSourceLabel(lang: 'tr' | 'en') {
  const runtime = await resolveLlmRuntimeConfig();
  const provider = runtime.textProvider;
  const providerLabel = isLlmProviderId(provider)
    ? LLM_PROVIDER_LABELS[provider][lang]
    : provider;
  const model = runtime.text.textModel?.trim() || undefined;
  return { providerLabel, model };
}

async function searchKbHitsForQuestion(
  customerId: string,
  question: QuestionDoc,
  customerName: string,
) {
  return searchKbHitsForTaskQuestion(customerId, question, customerName);
}

export async function autofillTaskQuestionAnswer(options: {
  projectId: string;
  questionId: string;
  lang?: 'tr' | 'en';
  mode?: TaskQuestionAutofillMode;
}): Promise<TaskQuestionAutofillResult> {
  const projectId = String(options.projectId || '').trim();
  const questionId = String(options.questionId || '').trim();
  const lang = options.lang === 'tr' ? 'tr' : 'en';
  const mode: TaskQuestionAutofillMode =
    options.mode === 'general' ? 'general' : 'local';

  const { customerId, customerName, projectName, question, customer } =
    await loadTaskQuestionContext(projectId, questionId);

  if (mode === 'general') {
    const { hits, chunkCount } = await searchKbHitsForQuestion(customerId, question, customerName);
    const promptTemplate = await resolveGeneralAutofillPromptTemplate(lang);
    const { prompt, profileFields } = buildGeneralAutofillPrompt({
      customerName,
      projectName,
      question,
      lang,
      promptTemplate,
      customer,
      hits,
    });

    const rawAnswer = (await generateTextFromPrompt(prompt)).trim();
    const llmSource = await resolveGeneralLlmSourceLabel(lang);
    const sourcesSection = formatTaskAutofillSourcesSection(lang, {
      profileFields: profileFields.map((f) => ({ label: f.label })),
      kbHits: hits.map((hit) => ({
        documentName: hit.documentName,
        chunkIndex: hit.chunkIndex,
      })),
      llm: llmSource,
    });

    const answer = applyAiAnswerDisclaimer(rawAnswer, lang) + sourcesSection;

    return {
      answer,
      projectId,
      questionId,
      chunkCount,
      mode: 'general',
      sources: hits.map((hit) => ({
        documentName: hit.documentName,
        chunkIndex: hit.chunkIndex,
        score: hit.score,
        textPreview: hit.text.slice(0, 320),
      })),
    };
  }

  const { hits, chunkCount } = await searchKbHitsForQuestion(customerId, question, customerName);
  if (chunkCount === 0) {
    throw new Error('No indexed knowledge-base documents for this customer');
  }

  const { block: customerProfileBlock, fields: profileFields } = buildCustomerProfileBlock(
    customer as Parameters<typeof buildCustomerProfileBlock>[0],
    lang,
  );

  const prompt = buildLocalAutofillPrompt({
    customerName,
    projectName,
    question,
    lang,
    hits,
    customerProfileBlock,
  });

  const rawAnswer = (await generateTextFromPrompt(prompt)).trim();
  const sourcesSection = formatTaskAutofillSourcesSection(lang, {
    profileFields: profileFields.map((f) => ({ label: f.label })),
    kbHits: hits.map((hit) => ({
      documentName: hit.documentName,
      chunkIndex: hit.chunkIndex,
    })),
    localAi: { retrievalLabel: describeLocalRagRetrieval(lang) },
  });
  const answer = applyAiAnswerDisclaimer(rawAnswer, lang) + sourcesSection;

  return {
    answer,
    projectId,
    questionId,
    chunkCount,
    mode: 'local',
    sources: hits.map((hit) => ({
      documentName: hit.documentName,
      chunkIndex: hit.chunkIndex,
      score: hit.score,
      textPreview: hit.text.slice(0, 320),
    })),
  };
}
