/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfjsWorker;

function textFromPageItems(items: { str?: string }[]): string {
  return items.map((item) => (typeof item.str === 'string' ? item.str : '')).join('');
}

/**
 * Extracts plain text from a PDF file (text layer only; scanned PDFs may return empty or sparse text).
 */
export async function extractTextFromPdfFile(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;
  const parts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textFromPageItems(textContent.items as { str?: string }[]);
    if (pageText.trim()) {
      parts.push(pageText.trim());
    }
  }

  return parts.join('\n\n');
}

export function isPdfFile(file: File): boolean {
  const name = file.name?.toLowerCase() ?? '';
  return file.type === 'application/pdf' || name.endsWith('.pdf');
}
