/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const TASK_GENERAL_AUTOFILL_PROMPT_PLACEHOLDERS = [
  '{{customerName}}',
  '{{projectName}}',
  '{{questionCode}}',
  '{{questionTitle}}',
  '{{questionText}}',
  '{{questionGuidanceBlock}}',
  '{{exampleAnswerBlock}}',
  '{{customerProfileBlock}}',
  '{{sourceChunksBlock}}',
  '{{languageInstruction}}',
] as const;

export type TaskGeneralAutofillPromptVars = {
  customerName: string;
  projectName: string;
  questionCode: string;
  questionTitle: string;
  questionText: string;
  questionGuidanceBlock: string;
  exampleAnswerBlock: string;
  customerProfileBlock: string;
  sourceChunksBlock: string;
  languageInstruction: string;
};

export const DEFAULT_TASK_GENERAL_AUTOFILL_PROMPT_EN = `You are an expert sustainability and corporate governance consultant drafting a survey response. Write like a high-quality ChatGPT answer: clear, substantive, professionally worded, and suitable for an official disclosure form.

CUSTOMER: {{customerName}}
PROJECT: {{projectName}}
QUESTION CODE: {{questionCode}}
QUESTION TITLE: {{questionTitle}}
QUESTION TEXT:
{{questionText}}{{questionGuidanceBlock}}{{exampleAnswerBlock}}{{customerProfileBlock}}{{sourceChunksBlock}}
RESPONSE LANGUAGE (mandatory): {{languageInstruction}}

RULES:
- Answer the question directly with 1–3 well-structured paragraphs (ownership, legal form, listed vs private status, etc. when relevant).
- Use CUSTOMER PROFILE and KNOWLEDGE BASE CHUNKS when they contain relevant facts; combine with your expertise in GRI, ESRS/CSRD, TCFD and governance reporting.
- For well-known listed/public companies, you may use accurate publicly available information when you are confident (e.g. listing status, ownership structure patterns).
- If specific facts are uncertain, describe typical industry practice and note that the consultant must verify with the client.
- Plain text only (no Markdown, no headings, no bullet lists unless essential).
- Do NOT include a sources/references section — sources are appended automatically after your answer.
- Do NOT include a disclaimer about AI — that will be added separately.`;

export const DEFAULT_TASK_GENERAL_AUTOFILL_PROMPT_TR = `Sürdürülebilirlik ve kurumsal yönetim konusunda uzman bir danışman olarak anket yanıtı hazırlıyorsun. ChatGPT kalitesinde, açık, kapsamlı ve resmi beyan formuna uygun yaz.

MÜŞTERİ: {{customerName}}
PROJE: {{projectName}}
SORU KODU: {{questionCode}}
SORU BAŞLIĞI: {{questionTitle}}
SORU METNİ:
{{questionText}}{{questionGuidanceBlock}}{{exampleAnswerBlock}}{{customerProfileBlock}}{{sourceChunksBlock}}
YANIT DİLİ (zorunlu): {{languageInstruction}}

KURALLAR:
- Soruyu doğrudan yanıtla; sahiplik yapısı, hukuki şekil, halka açık/özel statü gibi konularda 1–3 iyi yapılandırılmış paragraf kullan.
- MÜŞTERİ PROFİLİ ve BİLGİ BANKASI PARÇALARINDAKİ ilgili bilgileri kullan; GRI, ESRS/CSRD, TCFD ve kurumsal yönetim uzmanlığınla birleştir.
- İyi bilinen halka açık şirketler için emin olduğun kamuya açık bilgileri kullanabilirsin (ör. borsa kotasyonu, ortaklık yapısı).
- Kesin bilgi emin değilsen sektörde yaygın uygulamaları açıkla ve danışmanın firmayla doğrulaması gerektiğini belirt.
- Yalnızca düz metin (Markdown, başlık veya gereksiz madde işaretleri kullanma).
- Kaynaklar/referanslar bölümü EKLEME — kaynaklar yanıtın sonuna otomatik eklenir.
- Yapay zeka dipnotu EKLEME — bu ayrıca eklenecek.`;

export function getDefaultTaskGeneralAutofillPrompt(lang: 'tr' | 'en'): string {
  return lang === 'tr'
    ? DEFAULT_TASK_GENERAL_AUTOFILL_PROMPT_TR
    : DEFAULT_TASK_GENERAL_AUTOFILL_PROMPT_EN;
}

export function applyTaskGeneralAutofillPromptTemplate(
  template: string,
  vars: TaskGeneralAutofillPromptVars,
): string {
  return template
    .replace(/\{\{customerName\}\}/g, vars.customerName)
    .replace(/\{\{projectName\}\}/g, vars.projectName)
    .replace(/\{\{questionCode\}\}/g, vars.questionCode)
    .replace(/\{\{questionTitle\}\}/g, vars.questionTitle)
    .replace(/\{\{questionText\}\}/g, vars.questionText)
    .replace(/\{\{questionGuidanceBlock\}\}/g, vars.questionGuidanceBlock)
    .replace(/\{\{exampleAnswerBlock\}\}/g, vars.exampleAnswerBlock)
    .replace(/\{\{customerProfileBlock\}\}/g, vars.customerProfileBlock)
    .replace(/\{\{sourceChunksBlock\}\}/g, vars.sourceChunksBlock)
    .replace(/\{\{languageInstruction\}\}/g, vars.languageInstruction);
}

export function buildQuestionGuidanceBlock(aciklama: string | undefined): string {
  const text = String(aciklama ?? '').trim();
  if (!text) return '';
  return `\nGUIDANCE:\n${text}`;
}

export function buildExampleAnswerBlock(ornekYanit: string | undefined, lang: 'tr' | 'en'): string {
  const text = String(ornekYanit ?? '').trim();
  if (!text) return '';
  const label =
    lang === 'tr'
      ? 'ÖRNEK YANIT STİLİ (uygun olduğunda ton ve yapıyı eşleştir):'
      : 'EXAMPLE ANSWER STYLE (match tone and structure where appropriate):';
  return `\n${label}\n${text}`;
}

export function taskGeneralAutofillLanguageInstruction(lang: 'tr' | 'en'): string {
  return lang === 'tr'
    ? 'You MUST write the entire answer in Turkish (Türkçe). Use English only for proper nouns or standard abbreviations.'
    : 'You MUST write the entire answer in English. Use Turkish only when quoting source text.';
}
