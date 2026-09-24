/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function getLocalAutofillNoContextMessage(lang: 'tr' | 'en'): string {
  return lang === 'tr'
    ? 'Bilgi bankası ve firma profilinde bu soruya doğrudan yanıt veren bir kayıt bulunamadı; bu nedenle yanıt üretilememiştir.'
    : 'No record in the knowledge base or customer profile directly answers this question; no answer can be provided.';
}

export function isLegalOwnershipQuestion(question: {
  baslik?: string;
  soru?: string;
  aciklama?: string;
}): boolean {
  const text = [question.baslik, question.soru, question.aciklama]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return /halka açık|halka acik|publicly listed|public company|listing status|borsa|kotasyon|sahipli|ownership|hukuki şekil|hukuki sekil|legal form|anonim şirket|limited liability|özel şirket|private company|ortaklık yapısı|shareholder|unvan|legal seat|tüzel kişilik/.test(
    text,
  );
}

function buildLegalOwnershipRules(lang: 'tr' | 'en', customerName: string): string {
  if (lang === 'tr') {
    return `
HUKUKİ ŞEKİL / SAHİPLİK / Halka AÇIKLIK (bu soru için kritik):
- "${customerName}" için hukuki şekil, sahiplik yapısı veya halka açıklık durumunu YALNIZCA kaynak metninde AÇIKÇA yazıyorsa belirt.
- "halka açık", "borsada işlem gören", "kotasyon" vb. ifadeleri KULLANMA — kaynakta "${customerName}" için birebir bu nitelendirme yoksa.
- Sürdürülebilirlik raporu, ESG raporu veya "AKKIM RAPOR" gibi belge adları halka açıklık veya hukuki şekil kanıtı DEĞİLDİR.
- Ana holding (ör. Akkök Holding) veya grup hakkındaki bilgiler, "${customerName}"nin hukuki statüsünü göstermez; holding halka açık olsa bile firma halka açık olmayabilir.
- Kaynaklarda açık bilgi yoksa tahmin etme; yalnızca no-context mesajını yaz ve bitir.
- Firma profilinde hukuki şekil / halka açıklık alanı yoksa bu konuda varsayım yapma.`;
  }

  return `
LEGAL FORM / OWNERSHIP / LISTING (critical for this question):
- State legal form, ownership, or listing status for "${customerName}" ONLY when explicitly written in a source chunk or profile field.
- Do NOT use "publicly listed", "public company", "listed on exchange", etc. unless the source literally characterizes "${customerName}" that way.
- Sustainability/ESG report titles (e.g. "AKKIM RAPOR") are NOT evidence of legal form or listing status.
- Parent/holding (e.g. Akkök Holding) or group facts do not prove "${customerName}"'s legal status.
- If sources lack explicit facts, do not guess; output only the no-context message and stop.
- If the customer profile has no legal-form or listing field, do not assume listing status.`;
}

export function buildLocalAutofillStrictRules(
  lang: 'tr' | 'en',
  customerName: string,
  question: { baslik?: string; soru?: string; aciklama?: string },
): string {
  const noContext = getLocalAutofillNoContextMessage(lang);
  const legalBlock = isLegalOwnershipQuestion(question)
    ? buildLegalOwnershipRules(lang, customerName)
    : '';

  if (lang === 'tr') {
    return `KURALLAR (kesin — ihlal etme):
- Yalnızca TEK bir tutarlı yanıt yaz; iki farklı veya çelişkili paragraf YAZMA.
- Yalnızca MÜŞTERİ PROFİLİ ve AŞAĞIDAKİ KAYNAK PARÇALARINDA açıkça yazan bilgileri kullan; genel bilgi, sektör varsayımı veya tahmin YASAK.
- Her iddia kaynakta okunabilir olmalı; kaynakta yoksa o iddiayı YAZMA.
- Bilgiler yalnızca firma "${customerName}" ile ilgili olmalı; üst holding veya grup şirketleri bu firmanın statüsünü otomatik olarak tanımlamaz.
- Kaynak parçalarında sorunun yanıtı yoksa yanıtın TAMAMI şu tek cümle olmalı ve başka hiçbir şey ekleme: "${noContext}"
- No-context cümlesini kullandığında sonrasına ek bilgi, özet veya ikinci paragraf EKLEME.
- Genel merkez adresi kaynakta açıkça "${customerName}" için yazıyorsa doğrudan belirt.
- Düz metin; Markdown, başlık veya madde listesi kullanma (soru açıkça madde istemiyorsa).
- Yapay zeka dipnotu veya KAYNAKLAR bölümü EKLEME.${legalBlock}`;
  }

  return `RULES (strict — do not violate):
- Write exactly ONE coherent answer; never two different or contradictory paragraphs.
- Use ONLY facts explicitly stated in CUSTOMER PROFILE and SOURCE CHUNKS below; general knowledge, industry assumptions, and guesses are FORBIDDEN.
- Every claim must be readable in a source; if not in sources, do not write it.
- Facts must apply to CUSTOMER "${customerName}"; parent holding or group companies do not automatically define this customer's status.
- If source chunks do not contain the answer, the ENTIRE response must be only this sentence with nothing after it: "${noContext}"
- When using the no-context sentence, do not add summaries, second paragraphs, or any factual claims after it.
- If a headquarters address for "${customerName}" is explicit in sources, state it directly.
- Plain text only; no Markdown, headings, or bullet lists (unless the question explicitly requires bullets).
- Do NOT add an AI disclaimer or SOURCES section.${legalBlock}`;
}

export function taskLocalAutofillLanguageInstruction(lang: 'tr' | 'en'): string {
  return lang === 'tr'
    ? 'Tüm yanıt Türkçe (Türkçe) olmalı. İngilizce yalnızca özel adlar veya standart kısaltmalar için.'
    : 'Write the entire answer in English. Use Turkish only when quoting source text.';
}

export function buildLocalAutofillUserPrompt(opts: {
  customerName: string;
  projectName: string;
  questionCode: string;
  questionTitle: string;
  questionText: string;
  questionGuidanceBlock: string;
  exampleAnswerBlock: string;
  customerProfileBlock: string;
  sourceChunksBlock: string;
  lang: 'tr' | 'en';
  question: { baslik?: string; soru?: string; aciklama?: string };
}): string {
  const {
    customerName,
    projectName,
    questionCode,
    questionTitle,
    questionText,
    questionGuidanceBlock,
    exampleAnswerBlock,
    customerProfileBlock,
    sourceChunksBlock,
    lang,
    question,
  } = opts;

  const intro =
    lang === 'tr'
      ? 'Sürdürülebilirlik ve kurumsal yönetim raporu için anket yanıtı hazırlıyorsun. Tahmin yasak; yalnızca verilen kaynaklar.'
      : 'You draft a survey response for sustainability and governance reporting. No guessing — sources only.';

  return `${intro}

MÜŞTERİ / CUSTOMER: ${customerName}
PROJE / PROJECT: ${projectName}
SORU KODU / QUESTION CODE: ${questionCode}
SORU BAŞLIĞI / QUESTION TITLE: ${questionTitle}
SORU METNİ / QUESTION TEXT:
${questionText}${questionGuidanceBlock}${exampleAnswerBlock}${customerProfileBlock}${sourceChunksBlock}
YANIT DİLİ / RESPONSE LANGUAGE (mandatory): ${taskLocalAutofillLanguageInstruction(lang)}

${buildLocalAutofillStrictRules(lang, customerName, question)}

KAYNAK PARÇALARI / SOURCE CHUNKS:
${sourceChunksBlock.trim() ? sourceChunksBlock : lang === 'tr' ? '(Kaynak parçası yok — no-context kuralını uygula.)' : '(No source chunks — apply no-context rule.)'}`;
}
