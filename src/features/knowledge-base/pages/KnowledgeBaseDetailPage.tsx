/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  FileText, 
  Plus, 
  Trash2, 
  Search, 
  FileUp, 
  Loader2, 
  Database,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Info,
  AlertCircle,
} from 'lucide-react';
import { knowledgeBases } from '../../../services/db';
import * as Types from '../../../types';
import { useTranslation } from '../../../hooks/useTranslation';
import Modal from '../../../components/ui/Modal';
import { extractTextFromContent } from '../../../services/gemini';
import { extractTextFromPdfFile, isPdfFile } from '../../../lib/extractPdfText';
import {
  formatKbIngestErrorMessage,
  KB_INGEST_GEMINI_QUOTA_CODE,
} from '../../../../lib/kbIngestErrors.ts';
import {
  getKbDocumentIndexStatus,
  indexKbDocument,
  purgeKbDocumentIndex,
  waitForKbDocumentIndexed,
} from '../api/kbRag';
import { ApiClientError } from '../../../lib/apiClient';
import { useKnowledgeBaseDetail } from '../hooks/useKnowledgeBaseDetail';

export default function KnowledgeBaseDetailPage() {
  const { kbId } = useParams();
  const { t, lang } = useTranslation();
  const detail = t.knowledgeBase.detailPage;
  const dateLocale = lang === 'tr' ? 'tr-TR' : undefined;

  const ingestErrorMessages = {
    geminiQuota: detail.indexGeminiQuota,
    fallback: detail.indexFailed,
  };

  const detailQuery = useKnowledgeBaseDetail(kbId, ingestErrorMessages);
  const kb = detailQuery.data?.kb ?? null;
  const documents = detailQuery.data?.documents ?? [];
  const docIngestFailures = detailQuery.data?.ingestFailures ?? {};
  const loading = detailQuery.isLoading;

  const refreshDetail = () => {
    if (kbId) void detailQuery.refetch();
  };
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isReindexingAll, setIsReindexingAll] = useState(false);
  const [reindexAllProgress, setReindexAllProgress] = useState({ done: 0, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    content: '',
    fileUrl: '',
    sourceMimeType: 'text/plain' as string,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolveIndexErrorMessage = (error: unknown): string => {
    if (error instanceof ApiClientError && error.code === KB_INGEST_GEMINI_QUOTA_CODE) {
      return detail.indexGeminiQuota;
    }
    const code =
      error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'string'
        ? (error as { code: string }).code
        : undefined;
    if (code === KB_INGEST_GEMINI_QUOTA_CODE) return detail.indexGeminiQuota;

    const raw = error instanceof Error ? error.message : detail.indexFailed;
    if (raw.includes('queued but not starting')) return detail.indexQueuedStuck;
    if (raw.includes('timed out')) return detail.indexTimeout;

    return formatKbIngestErrorMessage(raw, ingestErrorMessages);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      if (isPdfFile(file)) {
        const text = await extractTextFromPdfFile(file);
        if (!text.trim()) {
          alert(detail.pdfNoTextLayer);
          setUploadForm((prev) => ({
            ...prev,
            name: prev.name || file.name,
            content: '',
            sourceMimeType: 'application/pdf',
          }));
          return;
        }
        setUploadForm((prev) => ({
          ...prev,
          name: prev.name || file.name,
          content: text,
          sourceMimeType: 'application/pdf',
        }));
        return;
      }

      const text = await file.text();
      setUploadForm((prev) => ({
        ...prev,
        name: prev.name || file.name,
        content: text,
        sourceMimeType: file.type?.trim() ? file.type : 'text/plain',
      }));
    } catch (error) {
      console.error("File read error", error);
      alert(detail.fileReadError);
    } finally {
      setIsUploading(false);
    }
  };

  const triggerDocumentIndexing = async (docId: string) => {
    setIsProcessing(docId);
    try {
      await indexKbDocument(docId);
      await waitForKbDocumentIndexed(docId);
      await refreshDetail();
    } catch (error) {
      console.error(error);
      alert(resolveIndexErrorMessage(error));
      await refreshDetail();
    } finally {
      setIsProcessing(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbId) return;
    setIsUploading(true);
    try {
      const cleanedContent = await extractTextFromContent(uploadForm.name, uploadForm.content);

      const created = await knowledgeBases.addDocument(kbId, {
        name: uploadForm.name,
        fileUrl: uploadForm.fileUrl || 'internal://' + Date.now(),
        fileType: uploadForm.sourceMimeType,
        size: cleanedContent.length,
        text: cleanedContent,
        processed: false,
      });

      if (!created?.id) {
        throw new Error(detail.indexFailed);
      }

      setIsUploadModalOpen(false);
      setUploadForm({ name: '', content: '', fileUrl: '', sourceMimeType: 'text/plain' });
      await refreshDetail();
      await triggerDocumentIndexing(created.id);
    } catch (error) {
      console.error(error);
      alert(resolveIndexErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcessDocument = async (doc: Types.KBDocument) => {
    if (!kbId || !doc.text?.trim() || isReindexingAll) return;
    await triggerDocumentIndexing(doc.id);
  };

  const reindexableDocuments = documents.filter((doc) => doc.text?.trim());

  const handleReindexAll = async () => {
    if (!kbId || isReindexingAll || isProcessing) return;
    if (reindexableDocuments.length === 0) {
      alert(detail.reindexAllNone);
      return;
    }
    const confirmMessage = detail.reindexAllConfirm.replace(
      '{count}',
      String(reindexableDocuments.length),
    );
    if (!confirm(confirmMessage)) return;

    setIsReindexingAll(true);
    setReindexAllProgress({ done: 0, total: reindexableDocuments.length });

    let failed = 0;
    for (let i = 0; i < reindexableDocuments.length; i++) {
      const doc = reindexableDocuments[i];
      try {
        await triggerDocumentIndexing(doc.id);
      } catch {
        failed += 1;
      } finally {
        setReindexAllProgress({ done: i + 1, total: reindexableDocuments.length });
      }
    }

    setIsReindexingAll(false);
    setReindexAllProgress({ done: 0, total: 0 });
    await refreshDetail();

    if (failed > 0) {
      alert(detail.reindexAllPartialFail.replace('{failed}', String(failed)));
    }
  };

  const handleDelete = async (docId: string) => {
    if (!kbId) return;
    if (confirm(detail.deleteConfirm)) {
      try {
        await purgeKbDocumentIndex(docId);
      } catch (error) {
        console.error('KB RAG purge failed', error);
      }
      await knowledgeBases.deleteDocument(kbId, docId);
      refreshDetail();
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-blue-600 mb-4" size={40} />{detail.loading}</div>;
  if (!kb) return <div className="p-10 text-center">{detail.notFound}</div>;

  return (
    <div className="p-6 md:p-10 w-full max-w-none space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <Link to="/knowledge-base" className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors mb-2">
            <ChevronLeft size={16} />
            {detail.backToDirectory}
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
               <Database size={24} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-display">{kb.name}</h1>
          </div>
          <p className="text-slate-500 max-w-2xl">{kb.description}</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleReindexAll}
            disabled={
              isReindexingAll ||
              isProcessing !== null ||
              reindexableDocuments.length === 0
            }
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isReindexingAll ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <RefreshCw size={18} strokeWidth={2.5} />
            )}
            {isReindexingAll
              ? detail.reindexAllProgress
                  .replace('{done}', String(reindexAllProgress.done))
                  .replace('{total}', String(reindexAllProgress.total))
              : detail.reindexAll}
          </button>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="minimal-button-primary shadow-lg shadow-blue-200/50 flex items-center gap-2"
          >
            <Plus size={18} strokeWidth={2.5} />
            {detail.addDocument}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder={detail.searchPlaceholder}
                  className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-slate-900 font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4 text-left">{detail.colDocumentName}</th>
                    <th className="px-6 py-4 text-left">{detail.colStatus}</th>
                    <th className="px-6 py-4 text-left">{detail.colSize}</th>
                    <th className="px-6 py-4 text-left">{detail.colDateAdded}</th>
                    <th className="px-6 py-4 text-right">{detail.colActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="max-w-xs mx-auto">
                          <FileText size={40} className="text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-500 text-sm font-medium">{detail.emptyDocuments}</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc) => (
                      <tr key={doc.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:text-blue-600 transition-colors">
                              <FileText size={18} />
                            </div>
                            <span className="font-semibold text-slate-900">{doc.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isProcessing === doc.id ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                              <Loader2 size={12} className="animate-spin" />
                              {detail.statusIndexing}
                            </span>
                          ) : docIngestFailures[doc.id] ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full max-w-[220px]"
                              title={docIngestFailures[doc.id]}
                            >
                              <AlertCircle size={12} className="shrink-0" />
                              <span className="truncate">{detail.statusFailed}</span>
                            </span>
                          ) : doc.processed ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full">
                              <CheckCircle2 size={12} />
                              {detail.statusIndexed}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-full">
                              <Clock size={12} />
                              {detail.statusPending}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                          {(doc.size / 1024).toFixed(1)} KB
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                          {new Date(doc.createdAt).toLocaleDateString(dateLocale)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {doc.text?.trim() && (
                              <button 
                                type="button"
                                onClick={() => handleProcessDocument(doc)}
                                disabled={isProcessing === doc.id || isReindexingAll}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                title={doc.processed ? detail.titleReindex : detail.titleProcessIndex}
                              >
                                {isProcessing === doc.id ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                              </button>
                            )}
                            <button 
                              onClick={() => handleDelete(doc.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={detail.titleDelete}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl shadow-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Sparkles size={20} className="text-blue-400" />
              </div>
              <h3 className="font-bold text-lg font-display">{detail.ragTitle}</h3>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              {detail.ragDescription}
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{detail.totalDocuments}</span>
                <span className="font-bold">{documents.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{detail.indexedItems}</span>
                <span className="font-bold border-b-2 border-blue-500">{documents.filter((doc) => doc.processed).length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{detail.totalStorage}</span>
                <span className="font-bold">{(documents.reduce((acc, doc) => acc + doc.size, 0) / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Info size={18} className="text-blue-600" />
              {detail.guidelinesTitle}
            </h3>
            <ul className="space-y-3 text-sm text-slate-500 font-medium">
              <li className="flex gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                {detail.guidelinePdf}
              </li>
              <li className="flex gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                {detail.guidelineNames}
              </li>
              <li className="flex gap-2">
                <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                {detail.guidelineDomains}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title={detail.addDocModalTitle}
        size="xl"
        showFooterClose={false}
      >
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Document Name</label>
                <input 
                  value={uploadForm.name}
                  onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))}
                  required
                  placeholder={`e.g. CSRD Reporting Guide ${new Date().getFullYear()}`}
                  className="minimal-input"
                />
              </div>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  onChange={handleFileChange}
                  accept=".txt,.md,.json,.csv,.xml,.pdf,application/pdf"
                />
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <FileUp size={32} />
                </div>
                <h4 className="font-bold text-slate-900 mb-1">{detail.uploadClickTitle}</h4>
                <p className="text-slate-500 text-sm">{detail.uploadFormats}</p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4">
                 <div className="p-2 bg-blue-600 text-white rounded-xl h-fit">
                   <Sparkles size={20} />
                 </div>
                 <div>
                   <h4 className="font-bold text-blue-900 text-sm mb-1">{detail.aiParsingTitle}</h4>
                   <p className="text-blue-700/70 text-xs leading-relaxed">
                     {detail.aiParsingBody}
                   </p>
                 </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{detail.contentPreviewLabel}</label>
              <textarea 
                rows={16}
                value={uploadForm.content}
                onChange={e => setUploadForm(p => ({ ...p, content: e.target.value }))}
                required
                placeholder={detail.contentPreviewPlaceholder}
                className="minimal-input font-mono text-xs leading-relaxed"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-slate-100">
            <button 
              type="submit"
              disabled={isUploading}
              className="px-6 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-blue-600 disabled:bg-slate-300 transition-all w-full flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
            >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {isUploading ? detail.submitProcessing : detail.submitAdd}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
