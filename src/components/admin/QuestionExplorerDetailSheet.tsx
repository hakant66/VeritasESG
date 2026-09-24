import { Save, X } from "lucide-react";
import type { Question } from "../../types";
import { cn } from "../../lib/utils";

export type QuestionExplorerDetailFields = {
  bolum: string;
  kod: string;
  baslik: string;
  soru: string;
  firmaYaniti: string;
  firmaYanitiYil1: string;
  firmaYanitiYil2: string;
  firmaYanitiYil3: string;
  firmaNot: string;
  ilgiliBirum: string;
  veriDogrulugu: string;
  aciklama: string;
  ornekYanit: string;
  dayanak: string;
  onay: string;
  raporYeri: string;
  reportingItr: string;
  tsrs1: string;
  tsrs2: string;
  sasbRtCh: string;
  gri: string;
  msci: string;
  esrs: string;
};

export interface QuestionExplorerDetailSheetProps {
  open: boolean;
  question: Question | null;
  templatePages: Array<{ id: string; title?: string }>;
  getFields: (question: Question) => QuestionExplorerDetailFields;
  onPatch: (question: Question, patch: Partial<QuestionExplorerDetailFields>) => void;
  onPageIdChange: (question: Question, pageId: string) => void;
  onSave: (questionId: string) => void;
  onClose: () => void;
  isDirty: (question: Question) => boolean;
  isSaving?: boolean;
}

export function QuestionExplorerDetailSheet({
  open,
  question,
  templatePages,
  getFields,
  onPatch,
  onPageIdChange,
  onSave,
  onClose,
  isDirty,
  isSaving = false,
}: QuestionExplorerDetailSheetProps) {
  if (!open || !question) return null;

  const fields = getFields(question);
  const dirty = isDirty(question);
  const assignedPageTitle =
    templatePages.find((p) => p.id === question.pageId)?.title?.trim() || "";

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-[min(420px,38vw)] shrink-0 flex-col border-l border-slate-200 bg-white shadow-[-8px_0_24px_-12px_rgba(15,23,42,0.18)]",
        "animate-in slide-in-from-right duration-200",
      )}
      aria-label="Soru detay paneli"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Soru Detayı
          </p>
          <p className="truncate text-sm font-semibold text-slate-900">
            {fields.kod || "—"} · {fields.baslik || "Başlıksız"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label="Detay panelini kapat"
        >
          <X size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
          <section className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-800">
              Temel Bilgiler
            </h3>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Kod
              </span>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:ring-2 focus:ring-slate-900"
                value={fields.kod}
                onChange={(e) => onPatch(question, { kod: e.target.value })}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Başlık
              </span>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900"
                value={fields.baslik}
                onChange={(e) => onPatch(question, { baslik: e.target.value })}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Soru
              </span>
              <textarea
                rows={5}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 focus:ring-2 focus:ring-slate-900"
                value={fields.soru}
                onChange={(e) => onPatch(question, { soru: e.target.value })}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Firma Yanıtı
              </span>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900"
                value={fields.firmaYaniti}
                onChange={(e) => onPatch(question, { firmaYaniti: e.target.value })}
              />
            </label>
          </section>

          <section className="grid grid-cols-1 gap-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              İkincil Bilgiler
            </h3>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                İlgili Birim
              </span>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-slate-900"
                value={fields.ilgiliBirum}
                onChange={(e) => onPatch(question, { ilgiliBirum: e.target.value })}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Bölüm
              </span>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-slate-900"
                value={fields.bolum}
                onChange={(e) => onPatch(question, { bolum: e.target.value })}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Atanan Sayfa
              </span>
              <select
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-slate-900"
                value={question.pageId || ""}
                onChange={(e) => onPageIdChange(question, e.target.value)}
              >
                <option value="">— Atanmadı —</option>
                {templatePages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title || page.id}
                  </option>
                ))}
              </select>
              {assignedPageTitle ? (
                <p className="text-xs text-slate-500">Mevcut: {assignedPageTitle}</p>
              ) : null}
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Örnek Yanıt
              </span>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-slate-900"
                value={fields.ornekYanit}
                onChange={(e) => onPatch(question, { ornekYanit: e.target.value })}
              />
            </label>
          </section>

          <section className="grid grid-cols-1 gap-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Ek Bilgiler
            </h3>
            {(
              [
                ["firmaYanitiYil1", "Firma Yanıtı Yıl 1 (Cari Yıl)"],
                ["firmaYanitiYil2", "Firma Yanıtı Yıl 2 (Geçen Yıl)"],
                ["firmaYanitiYil3", "Firma Yanıtı Yıl 3 (Önceki Yıl)"],
                ["firmaNot", "Firma Not"],
                ["veriDogrulugu", "Veri Doğruluğu"],
                ["aciklama", "Açıklama"],
                ["dayanak", "Dayanak"],
                ["onay", "Onay"],
                ["raporYeri", "Rapor Yeri"],
                ["reportingItr", "Reporting ITR"],
                ["tsrs1", "TSRS 1"],
                ["tsrs2", "TSRS 2"],
                ["sasbRtCh", "SASB RT-CH"],
                ["gri", "GRI"],
                ["msci", "MSCI"],
                ["esrs", "ESRS"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {label}
                </span>
                <textarea
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-slate-900"
                  value={fields[key]}
                  onChange={(e) => onPatch(question, { [key]: e.target.value })}
                />
              </label>
            ))}
          </section>
        </div>
      </div>

      {dirty ? (
        <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void onSave(question.id)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
          >
            <Save size={16} />
            Kaydet
          </button>
        </div>
      ) : null}
    </aside>
  );
}
