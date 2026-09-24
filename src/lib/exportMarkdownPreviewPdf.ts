/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const MARGIN_MM = 12;
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;
const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2;
/** 96 dpi — matches typical screen CSS px for A4 content area width. */
const MM_TO_PX = 96 / 25.4;
const EXPORT_WIDTH_PX = Math.round(CONTENT_WIDTH_MM * MM_TO_PX);

/** html2canvas cannot parse Tailwind v4 oklch/oklab — use hex/rgb only. */
const MODERN_COLOR_RE = /oklch|oklab|color\(|lch\(|lab\(/i;

/** PDF-only styles sized for A4 print (no modern color functions). */
const SAFE_PDF_CSS = `
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
  }
  [data-pdf-export-root] {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    padding: 0;
    color: #334155;
    background: #ffffff;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 11pt;
    line-height: 1.55;
  }
  [data-pdf-export-root] * { box-sizing: border-box; max-width: 100%; }
  [data-pdf-export-root] h1 {
    font-size: 20pt;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 10pt;
    line-height: 1.25;
  }
  [data-pdf-export-root] h2 {
    font-size: 16pt;
    font-weight: 700;
    color: #0f172a;
    margin: 18pt 0 8pt;
    line-height: 1.3;
  }
  [data-pdf-export-root] h3 {
    font-size: 13pt;
    font-weight: 700;
    color: #0f172a;
    margin: 14pt 0 6pt;
    line-height: 1.35;
  }
  [data-pdf-export-root] p { margin: 0 0 10pt; }
  [data-pdf-export-root] strong { font-weight: 600; color: #0f172a; }
  [data-pdf-export-root] a { color: #2563eb; text-decoration: underline; }
  [data-pdf-export-root] ul,
  [data-pdf-export-root] ol {
    margin: 6pt 0 12pt;
    padding-left: 24pt;
  }
  [data-pdf-export-root] ul { list-style-type: disc; }
  [data-pdf-export-root] ol { list-style-type: decimal; }
  [data-pdf-export-root] li { margin: 4pt 0; display: list-item; }
  [data-pdf-export-root] blockquote {
    margin: 12pt 0;
    padding: 10pt 14pt;
    border-left: 4px solid #3b82f6;
    background: #f8fafc;
    color: #475569;
  }
  [data-pdf-export-root] hr {
    margin: 14pt 0;
    border: 0;
    border-top: 1px solid #e2e8f0;
  }
  [data-pdf-export-root] code {
    font-size: 10pt;
    background: #f1f5f9;
    padding: 1pt 4pt;
    border-radius: 3px;
  }
  [data-pdf-export-root] pre {
    margin: 10pt 0;
    padding: 10pt;
    background: #0f172a;
    color: #f1f5f9;
    border-radius: 6px;
    overflow-x: auto;
    font-size: 9pt;
    line-height: 1.45;
    white-space: pre-wrap;
    word-break: break-word;
  }
  [data-pdf-export-root] pre code {
    background: transparent;
    padding: 0;
    color: inherit;
  }
  [data-pdf-export-root] .markdown-table-wrap {
    margin: 10pt 0;
    overflow: visible;
  }
  [data-pdf-export-root] table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
  }
  [data-pdf-export-root] th,
  [data-pdf-export-root] td {
    border: 1px solid #e2e8f0;
    padding: 6pt 8pt;
    text-align: left;
    vertical-align: top;
  }
  [data-pdf-export-root] th {
    background: #f8fafc;
    font-weight: 600;
    color: #0f172a;
  }
  [data-pdf-export-root] tr:nth-child(even) td { background: #f8fafc; }
  [data-pdf-export-root] .help-mermaid {
    margin: 12pt 0;
    padding: 10pt;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #ffffff;
    text-align: center;
  }
  [data-pdf-export-root] .help-mermaid svg {
    max-width: 100%;
    height: auto;
  }
`;

function scrubElementAttrs(node: Element): void {
  node.removeAttribute('class');

  const style = node.getAttribute('style');
  if (style && MODERN_COLOR_RE.test(style)) {
    node.removeAttribute('style');
  }

  for (const attr of ['fill', 'stroke', 'stop-color', 'color']) {
    const v = node.getAttribute(attr);
    if (v && MODERN_COLOR_RE.test(v)) {
      node.removeAttribute(attr);
    }
  }
}

function scrubTree(root: Element): void {
  scrubElementAttrs(root);
  root.querySelectorAll('*').forEach((node) => scrubElementAttrs(node));
}

function createIsolatedIframe(widthPx: number): { iframe: HTMLIFrameElement; doc: Document } {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-12000px';
  iframe.style.top = '0';
  iframe.style.width = `${widthPx}px`;
  iframe.style.height = '1px';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error('Could not create PDF export frame');
  }

  doc.open();
  doc.write('<!DOCTYPE html><html><head></head><body style="margin:0;padding:0;background:#fff"></body></html>');
  doc.close();

  const style = doc.createElement('style');
  style.textContent = SAFE_PDF_CSS;
  doc.head.appendChild(style);

  return { iframe, doc };
}

function addCanvasPagesToPdf(canvas: HTMLCanvasElement, pdf: jsPDF): void {
  const pageInnerWidthMm = CONTENT_WIDTH_MM;
  const pageInnerHeightMm = CONTENT_HEIGHT_MM;
  const pxPerMm = canvas.width / pageInnerWidthMm;
  const pageHeightPx = Math.ceil(pageInnerHeightMm * pxPerMm);

  let offsetPx = 0;
  let pageIndex = 0;

  while (offsetPx < canvas.height) {
    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - offsetPx);
    const sliceHeightMm = sliceHeightPx / pxPerMm;

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    const ctx = pageCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not create PDF page canvas');
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      offsetPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx,
    );

    const sliceData = pageCanvas.toDataURL('image/jpeg', 0.92);

    if (pageIndex > 0) {
      pdf.addPage();
    }
    pdf.addImage(sliceData, 'JPEG', MARGIN_MM, MARGIN_MM, pageInnerWidthMm, sliceHeightMm);

    offsetPx += sliceHeightPx;
    pageIndex += 1;
  }
}

function sanitizeFilename(filename: string): string {
  const safeName = filename.replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_') || 'markdown-preview';
  return safeName.endsWith('.pdf') ? safeName : `${safeName}.pdf`;
}

/**
 * Renders markdown preview HTML to a multi-page A4 PDF at full readable width.
 */
export async function exportMarkdownPreviewToPdf(
  previewRoot: HTMLElement,
  filename: string,
): Promise<void> {
  const { iframe, doc } = createIsolatedIframe(EXPORT_WIDTH_PX);

  try {
    const iframeRoot = doc.createElement('div');
    iframeRoot.setAttribute('data-pdf-export-root', '');
    iframeRoot.style.width = `${EXPORT_WIDTH_PX}px`;
    iframeRoot.style.maxWidth = `${EXPORT_WIDTH_PX}px`;
    iframeRoot.style.background = '#ffffff';
    iframeRoot.innerHTML = previewRoot.innerHTML;
    doc.body.appendChild(iframeRoot);

    scrubTree(iframeRoot);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const contentH = Math.max(iframeRoot.scrollHeight, 1);
    iframe.style.height = `${contentH + 40}px`;

    const canvas = await html2canvas(iframeRoot, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: EXPORT_WIDTH_PX,
      height: contentH,
      windowWidth: EXPORT_WIDTH_PX,
      windowHeight: contentH,
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => node.remove());
        const style = clonedDoc.createElement('style');
        style.textContent = SAFE_PDF_CSS;
        clonedDoc.head.appendChild(style);
        const root = clonedDoc.querySelector('[data-pdf-export-root]') as HTMLElement | null;
        if (root) {
          root.style.width = `${EXPORT_WIDTH_PX}px`;
          root.style.maxWidth = `${EXPORT_WIDTH_PX}px`;
          scrubTree(root);
        }
      },
    });

    if (canvas.width < 1 || canvas.height < 1) {
      throw new Error('Preview has no content to export');
    }

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    addCanvasPagesToPdf(canvas, pdf);
    pdf.save(sanitizeFilename(filename));
  } finally {
    document.body.removeChild(iframe);
  }
}
