import JSZip from 'jszip';
import type { Answer, ProjectPage, Question } from '../types';

export function sanitizeExportToken(value: string, maxLen = 40): string {
  return (value || 'unknown')
    .trim()
    .replace(/[^\w\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLen) || 'unknown';
}

export function questionBelongsToProjectPage(q: Question, page: ProjectPage): boolean {
  if (!q.pageId) return false;
  const templateId = page.sourceTemplatePageId || '';
  return q.pageId === page.id || (!!templateId && q.pageId === templateId);
}

export function resolvePageTitleForQuestion(
  question: Question | undefined,
  projectPages: ProjectPage[],
  fallbackTitle: string,
): string {
  if (!question) return fallbackTitle;
  for (const page of projectPages) {
    if (questionBelongsToProjectPage(question, page)) {
      return page.title || fallbackTitle;
    }
  }
  return fallbackTitle;
}

export function buildAttachmentZipEntryName(
  pageTitle: string,
  questionKod: string | undefined,
  originalFilename: string,
): string {
  const pagePart = sanitizeExportToken(pageTitle, 32);
  const kodPart = sanitizeExportToken(questionKod?.trim() || 'no_kod', 24);
  const baseName = originalFilename.trim() || 'attachment';
  const extMatch = baseName.match(/(\.[^.]+)$/);
  const ext = extMatch?.[1] ?? '';
  const stem = ext ? baseName.slice(0, -ext.length) : baseName;
  const filePart = sanitizeExportToken(stem, 48) + ext.toLowerCase();
  return `${pagePart}_${kodPart}_${filePart}`;
}

export async function fetchAttachmentBlob(fileUrl: string): Promise<Blob | null> {
  const url = fileUrl?.trim();
  if (!url) return null;

  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    if (!match) return null;
    const mime = match[1] || 'application/octet-stream';
    const payload = match[3];
    if (match[2]) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: mime });
    }
    return new Blob([decodeURIComponent(payload)], { type: mime });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

function uniqueZipPath(basePath: string, used: Set<string>): string {
  if (!used.has(basePath)) {
    used.add(basePath);
    return basePath;
  }
  const extMatch = basePath.match(/(\.[^./]+)$/);
  const ext = extMatch?.[1] ?? '';
  const stem = ext ? basePath.slice(0, -ext.length) : basePath;
  let n = 2;
  while (used.has(`${stem}_${n}${ext}`)) n += 1;
  const unique = `${stem}_${n}${ext}`;
  used.add(unique);
  return unique;
}

export type SubmissionAttachmentExportItem = {
  answer: Answer;
  question?: Question;
  pageTitle: string;
};

export async function downloadSubmissionsZipArchive(options: {
  excelBuffer: ArrayBuffer;
  excelFileName: string;
  zipFileName: string;
  attachments: SubmissionAttachmentExportItem[];
}): Promise<{ addedFiles: number; skippedFiles: number }> {
  const zip = new JSZip();
  zip.file(options.excelFileName, options.excelBuffer);

  const usedPaths = new Set<string>([options.excelFileName]);
  let addedFiles = 0;
  let skippedFiles = 0;

  for (const item of options.attachments) {
    const fileUrl = item.answer.latestFileUrl?.trim();
    if (!fileUrl) continue;

    const blob = await fetchAttachmentBlob(fileUrl);
    if (!blob) {
      skippedFiles += 1;
      continue;
    }

    const originalName =
      item.answer.evidenceName?.trim() ||
      fileUrl.split('/').pop()?.split('?')[0] ||
      'attachment';

    const entryBase = buildAttachmentZipEntryName(
      item.pageTitle,
      item.question?.kod,
      originalName,
    );
    const zipPath = uniqueZipPath(entryBase, usedPaths);
    zip.file(zipPath, blob);
    addedFiles += 1;
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.zipFileName;
  link.click();
  URL.revokeObjectURL(url);

  return { addedFiles, skippedFiles };
}

export function triggerBrowserDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
