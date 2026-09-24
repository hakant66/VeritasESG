/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CSV export/import for DMA materiality scoring tabs (GRI / ESRS / ISSB).
 */

export type MaterialityScoreCsvRow = {
  id: string;
  subject: string;
  griMapping?: string;
  disclosures?: string;
  notes?: string;
  financialImpact: number;
  impactSeverity: number;
  probability: number;
  stakeholderConcern: number;
  isMaterial?: boolean;
};

const BOM = '\uFEFF';
const SEP = ';';

const HEADERS = [
  'id',
  'subject',
  'griMapping',
  'disclosures',
  'financialImpact',
  'impactSeverity',
  'probability',
  'stakeholderConcern',
  'isMaterial',
  'notes',
] as const;

const HEADER_ALIASES: Record<string, (typeof HEADERS)[number]> = {
  id: 'id',
  rowid: 'id',
  'satır id': 'id',
  'satir id': 'id',
  subject: 'subject',
  konu: 'subject',
  'esg konusu': 'subject',
  'materiality konusu': 'subject',
  grimapping: 'griMapping',
  'gri mapping': 'griMapping',
  'ana gri eşleşmesi': 'griMapping',
  'ana gri eslesmesi': 'griMapping',
  disclosures: 'disclosures',
  'ilgili gri disclosure / clause': 'disclosures',
  'ilgili gri disclosure': 'disclosures',
  financialimpact: 'financialImpact',
  'finansal etki': 'financialImpact',
  impactseverity: 'impactSeverity',
  'etki şiddeti': 'impactSeverity',
  'etki siddeti': 'impactSeverity',
  probability: 'probability',
  olasılık: 'probability',
  olasilik: 'probability',
  stakeholderconcern: 'stakeholderConcern',
  'paydaş endişesi': 'stakeholderConcern',
  'paydas endisesi': 'stakeholderConcern',
  ismaterial: 'isMaterial',
  önemli: 'isMaterial',
  onemli: 'isMaterial',
  durum: 'isMaterial',
  notes: 'notes',
  not: 'notes',
};

function q(v: string | number | boolean | undefined): string {
  const s = String(v ?? '');
  return s.includes(SEP) || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function clampScore(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

function normalizeHeader(raw: string): string {
  return String(raw || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase();
}

function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function detectSeparator(headerLine: string): string {
  const semis = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  return semis >= commas ? ';' : ',';
}

function parseBoolMaterial(value: string): boolean | undefined {
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  if (['1', 'true', 'yes', 'y', 'evet', 'önemli', 'onemli', 'material'].includes(v)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'hayır', 'hayir', 'değil', 'degil', 'not material'].includes(v)) {
    return false;
  }
  return undefined;
}

export function exportMaterialityScoresCsv(
  rows: MaterialityScoreCsvRow[],
  filename: string,
): void {
  const header = HEADERS.join(SEP);
  const lines = rows.map((r) =>
    [
      q(r.id),
      q(r.subject),
      q(r.griMapping || ''),
      q(r.disclosures || ''),
      q(r.financialImpact ?? 0),
      q(r.impactSeverity ?? 0),
      q(r.probability ?? 0),
      q(r.stakeholderConcern ?? 0),
      q(r.isMaterial ? '1' : '0'),
      q(r.notes || ''),
    ].join(SEP),
  );
  const csv = BOM + [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export type ParsedMaterialityCsvRow = {
  id?: string;
  subject?: string;
  griMapping?: string;
  disclosures?: string;
  notes?: string;
  financialImpact: number;
  impactSeverity: number;
  probability: number;
  stakeholderConcern: number;
  isMaterial?: boolean;
};

export function parseMaterialityScoresCsv(text: string): ParsedMaterialityCsvRow[] {
  const normalized = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]);
  const rawHeaders = parseCsvLine(lines[0], sep);
  const mapped = rawHeaders.map((h) => HEADER_ALIASES[normalizeHeader(h)] || null);
  if (!mapped.some((h) => h === 'id' || h === 'subject')) {
    throw new Error(
      'CSV başlıkları geçersiz. En az "id" veya "subject" (konu) sütunu gerekli.',
    );
  }

  const rows: ParsedMaterialityCsvRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i], sep);
    const get = (key: (typeof HEADERS)[number]) => {
      const idx = mapped.indexOf(key);
      return idx >= 0 ? cols[idx] ?? '' : '';
    };
    const id = get('id').trim();
    const subject = get('subject').trim();
    if (!id && !subject) continue;
    rows.push({
      id: id || undefined,
      subject: subject || undefined,
      griMapping: get('griMapping') || undefined,
      disclosures: get('disclosures') || undefined,
      notes: get('notes') || undefined,
      financialImpact: clampScore(get('financialImpact')),
      impactSeverity: clampScore(get('impactSeverity')),
      probability: clampScore(get('probability')),
      stakeholderConcern: clampScore(get('stakeholderConcern')),
      isMaterial: parseBoolMaterial(get('isMaterial')),
    });
  }
  return rows;
}

function computeIsMaterial(row: {
  financialImpact: number;
  impactSeverity: number;
  probability: number;
  stakeholderConcern: number;
}): boolean {
  return (
    row.financialImpact >= 4 ||
    row.impactSeverity >= 4 ||
    row.stakeholderConcern >= 4 ||
    row.financialImpact * row.probability >= 12 ||
    row.impactSeverity * row.probability >= 12
  );
}

export function applyMaterialityCsvImport<T extends MaterialityScoreCsvRow>(
  existing: T[],
  imported: ParsedMaterialityCsvRow[],
): { rows: T[]; matched: number; unmatched: number } {
  const byId = new Map(existing.map((r) => [r.id, r]));
  const bySubject = new Map(
    existing.map((r) => [r.subject.trim().toLowerCase(), r]),
  );

  let matched = 0;
  let unmatched = 0;
  const updates = new Map<string, ParsedMaterialityCsvRow>();

  for (const row of imported) {
    const hit =
      (row.id && byId.get(row.id)) ||
      (row.subject ? bySubject.get(row.subject.trim().toLowerCase()) : undefined);
    if (!hit) {
      unmatched += 1;
      continue;
    }
    matched += 1;
    updates.set(hit.id, row);
  }

  const rows = existing.map((r) => {
    const patch = updates.get(r.id);
    if (!patch) return r;
    const next = {
      ...r,
      financialImpact: patch.financialImpact,
      impactSeverity: patch.impactSeverity,
      probability: patch.probability,
      stakeholderConcern: patch.stakeholderConcern,
      ...(patch.notes != null ? { notes: patch.notes } : {}),
    };
    const isMaterial =
      patch.isMaterial != null ? patch.isMaterial : computeIsMaterial(next);
    return { ...next, isMaterial, hasScore: true } as T;
  });

  return { rows, matched, unmatched };
}

export async function readFileAsText(file: File): Promise<string> {
  return file.text();
}
