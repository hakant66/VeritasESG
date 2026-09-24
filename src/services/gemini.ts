/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import type { Language } from "../lib/i18n";
import { Question, Answer, Domain } from "../types";

let ai: GoogleGenAI | null = null;

function getGeminiApiKey() {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const nodeEnv = typeof process !== 'undefined' ? process.env : undefined;
  return viteEnv?.VITE_GEMINI_API_KEY || viteEnv?.GEMINI_API_KEY || nodeEnv?.GEMINI_API_KEY;
}

/** Default when unset or when env points to a retired model id. */
const GEMINI_TEXT_MODEL_DEFAULT = 'gemini-2.5-flash';

/**
 * Maps retired / invalid Gemini Developer API model ids (v1beta) to a supported id.
 * @see https://ai.google.dev/gemini-api/docs/models/gemini
 */
function normalizeGeminiTextModel(raw: string): string {
  const m = raw.trim().replace(/^models\//i, '');
  if (!m) return GEMINI_TEXT_MODEL_DEFAULT;
  const key = m.toLowerCase();
  // Retired on Gemini Developer API (v1beta) — use current Flash.
  if (/^gemini-1\.5/i.test(key)) return GEMINI_TEXT_MODEL_DEFAULT;
  if (key === 'gemini-pro' || key === 'gemini-pro-vision') return GEMINI_TEXT_MODEL_DEFAULT;
  return m;
}

/** Text model for generateContent; `VITE_GEMINI_MODEL` or `GEMINI_MODEL` in `.env` (see `vite.config` define). */
function getGeminiTextModel() {
  const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const nodeEnv = typeof process !== 'undefined' ? process.env : undefined;
  const fromEnv =
    viteEnv?.VITE_GEMINI_MODEL?.trim() ||
    (typeof nodeEnv?.GEMINI_MODEL === 'string' ? nodeEnv.GEMINI_MODEL.trim() : '');
  if (!fromEnv) return GEMINI_TEXT_MODEL_DEFAULT;
  return normalizeGeminiTextModel(fromEnv);
}

function getAi() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Set VITE_GEMINI_API_KEY for browser AI features.');
  }

  if (!ai) {
    ai = new GoogleGenAI({ apiKey });
  }

  return ai;
}

export async function mapDomainClauseAndEnhance(
  question: Question,
  domainNames: string[]
) {
  const model = getGeminiTextModel();
  const needsDescription = !question.aciklama || question.aciklama.trim() === "";
  const needsExample = !question.ornekYanit || question.ornekYanit.trim() === "";

  const prompt = `
You are an expert in Governance and Sustainability Frameworks (like ESG, GRI, ISO).
Given the following question details and mapped domains, suggest the most accurate CLAUSE CODE or SECTION REFERENCE from those domains.

QUESTION DETAILS:
Code: ${question.kod || "N/A"}
Label: ${question.baslik || "N/A"}
Text: ${question.soru}
${question.thematicGroup ? `Context (Sheet): ${question.thematicGroup}` : ""}
${question.ilgiliBirim ? `Existing Clause/Mapping: ${question.ilgiliBirim}` : ""}
${!needsDescription ? `Existing Description: ${question.aciklama}` : ""}
${!needsExample ? `Existing Example: ${question.ornekYanit}` : ""}

TARGET DOMAINS: ${domainNames.join(', ')}

${needsDescription || needsExample ? `Additionally, since the question is missing a ${needsDescription ? "description" : ""} ${needsDescription && needsExample ? "and " : ""}${needsExample ? "example" : ""}, please generate these based on the question text, its code, its thematic context, and the target domains.
Even if a field is not missing, you can use its values to ensure consistency across the generated fields.` : ""}

Return the result as a raw JSON object with the following keys:
- clause: The Clause Code or Reference ID (e.g. "GRI 302-1"). Replace spaces with hyphens (-) and use 'p' instead of 'paragraph'.
${needsDescription ? "- description: A clear, professional description of what is being asked for governance/sustainability reporting purposes. Use the thematic context and question text to make it specific." : ""}
${needsExample ? "- example: A sample professional response or data point that would satisfy this question based on the question's intent." : ""}

Return ONLY the JSON object.
`;

  try {
    const response = await getAi().models.generateContent({
      model,
      contents: prompt,
    });
    
    const text = response.text.trim();
    // Clean markdown if present
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(jsonStr);
    
    if (result.clause) {
      result.clause = result.clause.replace(/paragraph/gi, "p").replace(/\s+/g, "-");
    }
    
    return result;
  } catch (error) {
    console.error("Gemini Domain Mapping/Enhancement Failed:", error);
    return null;
  }
}

export async function generatePageDraft(
  pageTitle: string,
  brief: string,
  questions: Question[],
  answers: Answer[],
  responseLanguage: Language = 'en',
) {
  const model = getGeminiTextModel();

  const languageInstruction =
    responseLanguage === 'tr'
      ? 'You MUST write the entire summary in Turkish (Türkçe). Use English only for proper nouns, standard abbreviations (e.g. GRI, IFRS, ISSB), policy codes, or verbatim quotes from client answers.'
      : 'You MUST write the entire summary in English. Use Turkish only when quoting text from client answers verbatim.';

  const missingAnswerLabel =
    responseLanguage === 'tr' ? 'YANIT VERILMEDI' : 'NO ANSWER PROVIDED';

  // Construct the context prompt
  const context = questions.map(q => {
    const ans = answers.find(a => a.questionId === q.id);
    return `
Question Code: ${q.kod}
Question Text: ${q.soru}
Guidance: ${q.aciklama}
Example: ${q.ornekYanit}
Client Answer: ${ans?.latestAnswer || missingAnswerLabel}
-------------------`;
  }).join('\n');

  const prompt = `
You are a Lead Governance & Reporting Consultant. Draft a professional, corporate aligned report section.

RESPONSE LANGUAGE (mandatory): ${languageInstruction}

SECTION TITLE: ${pageTitle}
PAGE BRIEF / LAYOUT INSTRUCTIONS: ${brief}

DATA COLLECTED FROM CLIENT:
${context}

INSTRUCTIONS:
1. Follow the RESPONSE LANGUAGE rule for every sentence.
2. Use the data provided to write a high-quality narrative.
3. Maintain a professional, corporate tone suitable for a sustainability report.
4. If data is missing for a critical disclosure (marked with '${missingAnswerLabel}'), state that data collection is ongoing for that point.
5. Output valid Markdown only (no HTML, no code fences around the whole document).

MARKDOWN STRUCTURE (required for readability):
- Start with one short introductory paragraph (2–4 sentences).
- Use ## for each main theme/section (not plain bold lines).
- Use ### for subsections when needed.
- Use bullet lists (- item) for principles, policies, or enumerations — never run them together in one paragraph.
- Put a blank line between every block (paragraph, heading, list).
- Keep paragraphs short (max 3–4 sentences).
- Do not use # (h1); the UI already shows the page title.
6. Ensure the structure follows the briefing instructions if provided.
`;

  try {
    const response = await getAi().models.generateContent({
      model,
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Gemini Draft Generation Failed:", error);
    throw error;
  }
}

export async function extractTextFromContent(
  name: string,
  content: string
) {
  const model = getGeminiTextModel();
  const prompt = `
    Extract and clean the text content from this document snippet. 
    Remove junk characters and format it as readable paragraphs.
    Document Name: ${name}
    Content:
    ${content}
  `;

  try {
    const response = await getAi().models.generateContent({
      model,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Extraction failed", error);
    return content;
  }
}

export async function answerKnowledgeBaseQuery(
  query: string,
  contextDocuments: { name: string; text: string }[],
  userContext: { projectName?: string; customerName?: string; domains?: string[] },
  responseLanguage: Language = 'en',
) {
  const model = getGeminiTextModel();

  const languageInstruction =
    responseLanguage === 'tr'
      ? 'You MUST write your entire answer in Turkish (Türkçe). Use English only for proper nouns, standard abbreviations (e.g. IFRS, ISSB), or verbatim quotes from the sources.'
      : 'You MUST write your entire answer in English. Use Turkish only when quoting text from the knowledge base context.';

  const noContextFallback =
    responseLanguage === 'tr'
      ? 'Bilgi tabanında bu konuya dair özel bir bilgi bulamadım; ancak genel standartlara dayanarak'
      : "I don't have specific information on that in the knowledge base, but based on general standards";

  const contextText = contextDocuments.length > 0 
    ? contextDocuments.map(d => `SOURCE [${d.name}]:\n${d.text}`).join('\n\n')
    : responseLanguage === 'tr'
      ? 'Bilgi tabanında ilgili belge bulunamadı.'
      : 'No relevant documents found in the knowledge base.';

  const prompt = `
    You are an expert AI assistant specializing in corporate governance, sustainability, and domain-specific knowledge.
    Your goal is to answer the user's question accurately using the provided knowledge base context and user context.

    RESPONSE LANGUAGE (mandatory): ${languageInstruction}
    
    USER CONTEXT:
    Project: ${userContext.projectName || "N/A"}
    Customer: ${userContext.customerName || "N/A"}
    Related Domains: ${userContext.domains?.join(', ') || "Global"}
    
    KNOWLEDGE BASE CONTEXT:
    ${contextText}
    
    USER QUESTION: 
    ${query}
    
    INSTRUCTIONS:
    1. Follow the RESPONSE LANGUAGE rule above for every sentence.
    2. Answer the question specifically using the knowledge base context provided.
    3. If the context doesn't contain the answer, begin with "${noContextFallback}..." and provide a helpful response (still in the required response language).
    4. Keep the tone professional, concise, and helpful.
    5. Use Markdown for formatting.
    6. Mention source names in your answer if relevant.
  `;

  try {
    const response = await getAi().models.generateContent({
      model,
      contents: prompt,
    });
    const text = response.text;
    if (text === undefined || text === null || String(text).trim() === '') {
      throw new Error('Gemini returned an empty text response.');
    }
    return text;
  } catch (error) {
    console.error("Gemini RAG Query Failed:", error);
    throw error;
  }
}

export type ChatSampleQuestionsContext = {
  scope: 'all' | 'single';
  knowledgeBaseNames: string[];
  knowledgeBaseDescriptions: string[];
  documentNames: string[];
  projectName?: string;
};

function parseJsonStringArray(raw: string): string[] | null {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed.map((q) => q.trim()).filter(Boolean);
    }
  } catch {
    /* try fenced block below */
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed.match(/\[[\s\S]*\]/)?.[0];
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed.map((q) => q.trim()).filter(Boolean);
    }
  } catch {
    return null;
  }
  return null;
}

export async function generateChatSampleQuestions(
  context: ChatSampleQuestionsContext,
  responseLanguage: Language = 'en',
): Promise<string[]> {
  if (!getGeminiApiKey()) {
    throw new Error('Gemini API key is not configured.');
  }

  const model = getGeminiTextModel();
  const languageInstruction =
    responseLanguage === 'tr'
      ? 'Write all four questions in Turkish (Türkçe) only. Use English only for proper nouns or standard abbreviations (e.g. GRI, CSRD).'
      : 'Write all four questions in English only.';

  const scopeLabel =
    context.scope === 'all'
      ? `All accessible knowledge bases (${context.knowledgeBaseNames.length}): ${context.knowledgeBaseNames.join(', ') || 'none'}`
      : `Single knowledge base: ${context.knowledgeBaseNames[0] || 'unknown'}`;

  const descriptions =
    context.knowledgeBaseDescriptions.filter(Boolean).join(' | ') || 'No descriptions provided.';
  const documents =
    context.documentNames.length > 0
      ? context.documentNames.join(', ')
      : responseLanguage === 'tr'
        ? 'Belge adı yok'
        : 'No document names available';

  const prompt = `
You suggest example questions for a corporate governance / sustainability knowledge-base chat.

${languageInstruction}

CONTEXT SCOPE: ${scopeLabel}
Knowledge base descriptions: ${descriptions}
Sample document titles: ${documents}
User project: ${context.projectName || 'N/A'}

Return ONLY a JSON array of exactly 4 strings. Each string is one short, natural example question a user might click (max 140 characters).
Questions must be specific to the knowledge bases and document titles above—not generic chat prompts.
Do not number the questions. No markdown, no explanation—JSON array only.
`;

  const response = await getAi().models.generateContent({
    model,
    contents: prompt,
  });

  const text = response.text;
  if (text === undefined || text === null || String(text).trim() === '') {
    throw new Error('Gemini returned an empty sample-questions response.');
  }

  const parsed = parseJsonStringArray(String(text));
  if (!parsed || parsed.length === 0) {
    throw new Error('Could not parse sample questions from Gemini response.');
  }

  while (parsed.length < 4) {
    parsed.push(parsed[parsed.length - 1] ?? '');
  }
  return parsed.slice(0, 4);
}
