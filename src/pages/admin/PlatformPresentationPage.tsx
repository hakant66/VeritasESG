/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Platform Sunumu — VeritasESG ürün sunumu (PDF gömülü görünüm).
 * Route: #/platform-sunumu
 */

import { Download, ExternalLink, Presentation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

/** Bump when replacing files under public/presentations/ so browsers/iframes skip stale cache. */
const DECK_VERSION = '20260724b';
const PDF_URL = `/presentations/VeritasESG_Sunumu.pdf?v=${DECK_VERSION}`;
const PPTX_URL = `/presentations/VeritasESG_Sunumu.pptx?v=${DECK_VERSION}`;

export default function PlatformPresentationPage() {
  const { t, lang } = useTranslation();
  const isTr = lang === 'tr';

  return (
    <div className="flex h-[calc(100vh-2rem)] min-h-[32rem] flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-slate-900">
            <Presentation className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
            <h1 className="text-xl font-bold tracking-tight">{t.nav.platformPresentation}</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {isTr
              ? 'VeritasESG ürün sunumu. PDF’i burada görüntüleyebilir veya indirerek paylaşabilirsiniz.'
              : 'VeritasESG product deck. View the PDF here or download to share.'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            <Link to="/platform" className="font-medium text-slate-700 underline-offset-2 hover:underline">
              {t.nav.platformGuide}
            </Link>
            {isTr ? ' — adım adım etkileşimli rehber' : ' — interactive step-by-step guide'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {isTr ? 'Yeni sekmede aç' : 'Open in new tab'}
          </a>
          <a
            href={PDF_URL}
            download="VeritasESG_Sunumu.pdf"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            PDF
          </a>
          <a
            href={PPTX_URL}
            download="VeritasESG_Sunumu.pptx"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
          >
            <Download className="h-4 w-4" aria-hidden />
            PowerPoint
          </a>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
        <iframe
          title={t.nav.platformPresentation}
          src={`${PDF_URL}#view=FitH`}
          className="h-full w-full border-0 bg-white"
        />
      </div>
    </div>
  );
}
