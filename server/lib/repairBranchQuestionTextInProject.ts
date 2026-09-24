/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  extractBranchNameFromKod,
  prependBranchInstruction,
} from './expandProjectQuestionsByBranch.ts';
import {
  findBranchKodProjectQuestions,
  updateProjectQuestionText,
} from '../data/projectLibDataAccess.ts';

/** Ensures branch-expanded rows have the blockquote in soru and aciklama. */
export async function repairBranchQuestionTextInProject(
  projectId: string,
): Promise<{ repaired: number }> {
  const rows = await findBranchKodProjectQuestions(projectId);

  let repaired = 0;

  for (const row of rows) {
    const kod = String((row as { kod?: string }).kod || '');
    const branchName = extractBranchNameFromKod(kod);
    if (!branchName) continue;

    const soru = String((row as { soru?: string }).soru || '');
    const aciklama = String((row as { aciklama?: string }).aciklama || '');

    const nextSoru = prependBranchInstruction(soru, branchName);
    const nextAciklama = prependBranchInstruction(aciklama, branchName);

    if (nextSoru === soru && nextAciklama === aciklama) continue;

    await updateProjectQuestionText(String(row.id || row._id), nextSoru, nextAciklama);
    repaired += 1;
  }

  return { repaired };
}
