import type { Question } from '../types';
import { readQuestionIlgiliBirim } from './questionIlgiliBirim';

/** Grid / column settings — Excel-only fields, not shown in UI. */
export const UI_HIDDEN_QUESTION_COLUMNS = new Set(['atananSayfa', 'kayit']);

export const QUESTION_KAYIT_FIELD_LABELS: Record<string, string> = {
  bolum: 'Bölüm',
  kod: 'Kod',
  baslik: 'Başlık',
  soru: 'Soru',
  firmaYaniti: 'Firma Yanıtı',
  firmaYanitiYil1: 'Firma Yanıtı Yıl 1',
  firmaYanitiYil2: 'Firma Yanıtı Yıl 2',
  firmaYanitiYil3: 'Firma Yanıtı Yıl 3',
  firmaNot: 'Firma Not',
  ilgiliBirum: 'İlgili Birim',
  veriDogrulugu: 'Veri Doğruluğu',
  aciklama: 'Açıklama',
  ornekYanit: 'Örnek Yanıt',
  dayanak: 'Dayanak',
  onay: 'Onay',
  raporYeri: 'Rapor Yeri',
  reportingItr: 'Reporting ITR',
  tsrs1: 'TSRS 1',
  tsrs2: 'TSRS 2',
  sasbRtCh: 'SASB RT-CH',
  gri: 'GRI',
  msci: 'MSCI',
  esrs: 'ESRS',
  pageId: 'Atanan Sayfa',
};

const MAX_KAYIT_CHARS = 30_000;

export type QuestionKayitActor = {
  email?: string;
  name?: string;
};

export type QuestionKayitSnapshot = Record<string, string>;

export function formatKayitTimestamp(ms: number): string {
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(ms));
}

export function summarizeKayitValue(value: string | undefined, max = 100): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '(boş)';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function pageTitleForKayit(
  pageId: string | undefined,
  pages: Array<{ id: string; title?: string }>,
): string {
  if (!pageId?.trim()) return '';
  const page = pages.find((p) => p.id === pageId);
  return page?.title?.trim() || pageId;
}

export function buildQuestionKayitSnapshot(
  question: Pick<
    Question,
    | 'bolum'
    | 'kod'
    | 'baslik'
    | 'soru'
    | 'firmaYaniti'
    | 'firmaYanitiYil1'
    | 'firmaYanitiYil2'
    | 'firmaYanitiYil3'
    | 'firmaNot'
    | 'veriDogrulugu'
    | 'aciklama'
    | 'ornekYanit'
    | 'dayanak'
    | 'onay'
    | 'raporYeri'
    | 'reportingItr'
    | 'tsrs1'
    | 'tsrs2'
    | 'sasbRtCh'
    | 'gri'
    | 'msci'
    | 'esrs'
    | 'pageId'
  > & { ilgiliBirum?: string; ilgiliBirim?: string },
  pages: Array<{ id: string; title?: string }> = [],
): QuestionKayitSnapshot {
  return {
    bolum: question.bolum ?? '',
    kod: question.kod ?? '',
    baslik: question.baslik ?? '',
    soru: question.soru ?? '',
    firmaYaniti: question.firmaYaniti ?? '',
    firmaYanitiYil1: question.firmaYanitiYil1 ?? '',
    firmaYanitiYil2: question.firmaYanitiYil2 ?? '',
    firmaYanitiYil3: question.firmaYanitiYil3 ?? '',
    firmaNot: question.firmaNot ?? '',
    ilgiliBirum: readQuestionIlgiliBirim(question),
    veriDogrulugu: question.veriDogrulugu ?? '',
    aciklama: question.aciklama ?? '',
    ornekYanit: question.ornekYanit ?? '',
    dayanak: question.dayanak ?? '',
    onay: question.onay ?? '',
    raporYeri: question.raporYeri ?? '',
    reportingItr: question.reportingItr ?? '',
    tsrs1: question.tsrs1 ?? '',
    tsrs2: question.tsrs2 ?? '',
    sasbRtCh: question.sasbRtCh ?? '',
    gri: question.gri ?? '',
    msci: question.msci ?? '',
    esrs: question.esrs ?? '',
    pageId: pageTitleForKayit(question.pageId, pages),
  };
}

export function diffQuestionKayitSnapshots(
  before: QuestionKayitSnapshot,
  after: QuestionKayitSnapshot,
): string[] {
  const changes: string[] = [];
  for (const [key, label] of Object.entries(QUESTION_KAYIT_FIELD_LABELS)) {
    const prev = (before[key] ?? '').trim();
    const next = (after[key] ?? '').trim();
    if (prev !== next) {
      changes.push(
        `${label}: ${summarizeKayitValue(prev)} → ${summarizeKayitValue(next)}`,
      );
    }
  }
  return changes;
}

export function formatQuestionKayitLine(options: {
  timestamp: number;
  actor?: QuestionKayitActor;
  changes: string[];
  fallbackAction?: string;
}): string {
  const who =
    [options.actor?.email?.trim(), options.actor?.name?.trim()]
      .filter(Boolean)
      .join(' | ') || 'sistem';
  const when = formatKayitTimestamp(options.timestamp);
  const detail = options.changes.length
    ? options.changes.join('; ')
    : options.fallbackAction || 'güncellendi';
  return `[${when}] ${who} — ${detail}`;
}

export function appendQuestionKayitLine(
  previousKayit: string | undefined,
  line: string,
): string {
  const next = previousKayit?.trim() ? `${previousKayit.trim()}\n${line}` : line;
  if (next.length <= MAX_KAYIT_CHARS) return next;

  const lines = next.split('\n');
  while (lines.join('\n').length > MAX_KAYIT_CHARS && lines.length > 1) {
    lines.shift();
  }
  return lines.join('\n');
}

export function buildAppendedQuestionKayit(options: {
  previousKayit?: string;
  timestamp: number;
  actor?: QuestionKayitActor;
  before: QuestionKayitSnapshot;
  after: QuestionKayitSnapshot;
  fallbackAction?: string;
}): string | undefined {
  const changes = diffQuestionKayitSnapshots(options.before, options.after);
  if (!changes.length && !options.fallbackAction) return options.previousKayit;

  const line = formatQuestionKayitLine({
    timestamp: options.timestamp,
    actor: options.actor,
    changes,
    fallbackAction: options.fallbackAction,
  });
  return appendQuestionKayitLine(options.previousKayit, line);
}
