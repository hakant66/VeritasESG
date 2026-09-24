/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BranchRef = { id: string; name: string };

export type ProjectQuestionCloneFields = {
  kod: string;
  baslik: string;
  soru: string;
  aciklama: string;
  soruCogaltma: 'yok' | 'sube_bazinda';
  order: number;
  [key: string]: unknown;
};

/** `#2-1-1 - Şube Adı` */
export function formatKodForBranch(kod: string, branchName: string): string {
  const base = kod.trim() || 'N/A';
  const withHash = base.startsWith('#') ? base : `#${base}`;
  return `${withHash} - ${branchName.trim()}`;
}

const BRANCH_INSTRUCTION_RE = /bu soruyu .+ adina cevaplayiniz/i;

/** Prepends branch-specific blockquote (soru metni / kılavuz). */
export function prependBranchInstruction(text: string, branchName: string): string {
  const trimmed = text.trim();
  if (BRANCH_INSTRUCTION_RE.test(trimmed)) return text;
  const line = `> bu soruyu ${branchName.trim()} adina cevaplayiniz`;
  if (!trimmed) return line;
  return `${line}\n\n${trimmed}`;
}

/** @deprecated Use prependBranchInstruction */
export function prependBranchAciklamaInstruction(
  aciklama: string,
  branchName: string,
): string {
  return prependBranchInstruction(aciklama, branchName);
}

/** Branch suffix on kod from expand: `#2-1-1 - Mülheim HQ` */
export function extractBranchNameFromKod(kod: string): string | null {
  const trimmed = kod.trim();
  const dash = trimmed.lastIndexOf(' - ');
  if (dash < 0) return null;
  const name = trimmed.slice(dash + 3).trim();
  return name || null;
}

function orderForBranchClone(baseOrder: number, index: number, total: number): number {
  if (total <= 1) return baseOrder;
  return baseOrder + (index / total) * 0.99;
}

/**
 * Expands template rows with `soruCogaltma: sube_bazinda` into one row per branch.
 * Other rows are returned unchanged (soruCogaltma forced to `yok` on output).
 */
export function expandProjectQuestionsByBranch<T extends ProjectQuestionCloneFields>(
  rows: T[],
  branches: BranchRef[],
): T[] {
  const out: T[] = [];

  for (const row of rows) {
    if (row.soruCogaltma !== 'sube_bazinda' || branches.length === 0) {
      out.push({ ...row, soruCogaltma: 'yok' });
      continue;
    }

    branches.forEach((branch, index) => {
      out.push({
        ...row,
        soruCogaltma: 'yok',
        kod: formatKodForBranch(row.kod, branch.name),
        soru: prependBranchInstruction(row.soru, branch.name),
        aciklama: prependBranchInstruction(row.aciklama, branch.name),
        order: orderForBranchClone(row.order, index, branches.length),
      });
    });
  }

  return out;
}
