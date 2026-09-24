/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  ExternalLink,
  BookOpen,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { knowledgeBases } from '../../../services/db';
import * as Types from '../../../types';
import {
  inferKnowledgeBaseSpecification,
  knowledgeBaseDomainIds,
  type KnowledgeBase,
  type KnowledgeBaseSpecification,
  type KnowledgeBaseWritePayload,
} from '../../../types';
import { useTranslation } from '../../../hooks/useTranslation';
import { useSettings } from '../../../lib/SettingsContext';
import { useAuth } from '../../../lib/AuthContext';
import Modal from '../../../components/ui/Modal';
import { ApiClientError } from '../../../lib/apiClient';
import { Link } from 'react-router-dom';
import {
  PageHelpFullModal,
  PageHelpHeaderButton,
} from '../../../components/admin/PageHelpGuidance';
import {
  useKnowledgeBaseInvalidate,
  useKnowledgeBaseListPageData,
} from '../hooks/useKnowledgeBaseListPageData';

function formatKbSaveError(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as { error?: string };
      if (parsed?.error && typeof parsed.error === 'string') return parsed.error;
    } catch {
      /* plain message */
    }
    return error.message;
  }
  return String(error);
}

export default function KnowledgeBasePage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { settings } = useSettings();
  const listQuery = useKnowledgeBaseListPageData();
  const { invalidateList } = useKnowledgeBaseInvalidate();
  const kbList = listQuery.data?.kbList ?? [];
  const domainList = listQuery.data?.domainList ?? [];
  const customerList = listQuery.data?.customerList ?? [];
  const projectList = listQuery.data?.projectList ?? [];
  const loading = listQuery.isLoading;
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'general' | 'restricted'>('all');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** Domain picks when specification is domain (empty = all domains). */
  const [modalDomainIds, setModalDomainIds] = useState<string[]>([]);
  const [modalSpecification, setModalSpecification] =
    useState<KnowledgeBaseSpecification>('customer');

  useEffect(() => {
    if (!isModalOpen) return;
    setModalSpecification(
      editingKb ? inferKnowledgeBaseSpecification(editingKb) : 'customer',
    );
    setModalDomainIds(editingKb ? knowledgeBaseDomainIds(editingKb) : []);
  }, [isModalOpen, editingKb]);

  const toggleModalDomain = useCallback((domainId: string) => {
    setModalDomainIds((prev) =>
      prev.includes(domainId) ? prev.filter((id) => id !== domainId) : [...prev, domainId],
    );
  }, []);

  const refreshList = () => invalidateList();

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveError(null);
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const projectId = String(formData.get('projectId') ?? '').trim();
    const customerId = String(formData.get('customerId') ?? '').trim();

    if (modalSpecification === 'customer' && !customerId) {
      setSaveError(t.knowledgeBase.modalValidationCustomer);
      return;
    }
    if (modalSpecification === 'project' && !projectId) {
      setSaveError(t.knowledgeBase.modalValidationProject);
      return;
    }

    const data: KnowledgeBaseWritePayload = {
      name,
      description,
      domainIds: modalSpecification === 'domain' ? modalDomainIds : [],
      domainId: null,
      customerId: modalSpecification === 'customer' ? customerId : null,
      projectId: modalSpecification === 'project' ? projectId : null,
    };

    try {
      if (editingKb) {
        await knowledgeBases.update(editingKb.id, data);
      } else {
        await knowledgeBases.create(data);
      }

      setIsModalOpen(false);
      setEditingKb(null);
      setSaveError(null);
      await refreshList();
    } catch (err) {
      console.error(err);
      setSaveError(formatKbSaveError(err));
    }
  };

  const handleDelete = async () => {
    if (isDeleting) {
      await knowledgeBases.delete(isDeleting);
      setIsDeleting(null);
      refreshList();
    }
  };

  const filteredKbs = kbList.filter((kb) => {
    const matchesSearch =
      kb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kb.description.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    const hasScope = Boolean(kb.customerId || kb.projectId);
    if (scopeFilter === 'general') return !hasScope;
    if (scopeFilter === 'restricted') return hasScope;
    return true;
  });

  return (
    <div className="p-8 w-full max-w-none space-y-8">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start">
        <div>
          <div className="mb-2 flex items-center gap-4">
            <Database className="text-blue-600" size={36} strokeWidth={2.5} />
            <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900">
              {t.knowledgeBase.title}
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-lg font-light text-slate-500">{t.knowledgeBase.subtitle}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-start gap-3">
          {(settings.helpKnowledgeBaseUrl || settings.helpKnowledgeBaseMd) && (
            <PageHelpHeaderButton
              helpUrl={settings.helpKnowledgeBaseUrl || ''}
              helpMd={settings.helpKnowledgeBaseMd || ''}
              isHelpModalOpen={isHelpModalOpen}
              setIsHelpModalOpen={setIsHelpModalOpen}
              title={t.knowledgeBase.helpGuidance}
            />
          )}
        </div>
      </header>

      <div className="flex w-full flex-col items-stretch gap-4 md:flex-row md:items-center">
        <div className="group relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder={t.knowledgeBase.searchPlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all focus:ring-1 focus:ring-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="group relative md:min-w-[260px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as 'all' | 'general' | 'restricted')}
            className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm outline-none transition-all focus:ring-1 focus:ring-slate-900"
          >
            <option value="all">{t.knowledgeBase.filterAll}</option>
            <option value="general">{t.knowledgeBase.filterGeneral}</option>
            <option value="restricted">{t.knowledgeBase.filterRestricted}</option>
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-slate-900">
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 animate-pulse md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-3xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <>
            {filteredKbs.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-white py-20 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                  <BookOpen size={32} strokeWidth={2} aria-hidden />
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {kbList.length === 0 ? t.knowledgeBase.emptyListTitle : t.knowledgeBase.emptyFilterTitle}
                </h3>
                <p className="mx-auto mt-2 max-w-md px-4 text-sm text-slate-500">
                  {kbList.length === 0 ? t.knowledgeBase.emptyListBody : t.knowledgeBase.emptyFilterHint}
                </p>
                {kbList.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingKb(null);
                      setSaveError(null);
                      setIsModalOpen(true);
                    }}
                    className="minimal-button-outline mt-8"
                  >
                    {t.knowledgeBase.emptyListCta}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredKbs.map((kb) => (
                  <div
                    key={kb.id}
                    className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/50"
                  >
                    <div className="relative z-10 mb-4 flex items-start justify-between">
                      <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                        <BookOpen size={24} />
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingKb(kb);
                            setSaveError(null);
                            setIsModalOpen(true);
                          }}
                          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDeleting(kb.id)}
                          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="relative z-10 flex-grow space-y-3">
                      <Link to={`/knowledge-base/${kb.id}`} className="block">
                        <h3 className="font-display line-clamp-1 text-xl font-bold text-slate-900 transition-colors group-hover:text-blue-600">
                          {kb.name}
                        </h3>
                      </Link>
                      <p className="line-clamp-3 text-sm leading-relaxed text-slate-500">
                        {kb.description || t.knowledgeBase.noDescription}
                      </p>
                    </div>

                    <div className="relative z-10 mt-6 space-y-3 border-t border-slate-50 pt-6">
                      <div className="flex flex-wrap gap-2">
                        {knowledgeBaseDomainIds(kb).map((did) => (
                          <span
                            key={did}
                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600"
                          >
                            {domainList.find((d) => d.id === did)?.name || 'Domain'}
                          </span>
                        ))}
                        {kb.customerId && (
                          <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                            {customerList.find((c) => c.id === kb.customerId)?.name || 'Customer'}
                          </span>
                        )}
                        {kb.projectId && (
                          <span className="rounded-lg bg-green-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-600">
                            {projectList.find((p) => p.id === kb.projectId)?.name || 'Project'}
                          </span>
                        )}
                        {knowledgeBaseDomainIds(kb).length === 0 && !kb.customerId && !kb.projectId && (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {t.knowledgeBase.generalKnowledgeBadge}
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/knowledge-base/${kb.id}`}
                        className="flex w-full transform items-center justify-center gap-2 rounded-2xl bg-slate-50 py-3 text-sm font-bold text-slate-900 shadow-sm transition-all hover:bg-slate-900 hover:text-white active:scale-95"
                      >
                        {t.knowledgeBase.manageDocuments}
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setEditingKb(null);
                  setSaveError(null);
                  setIsModalOpen(true);
                }}
                className="group relative flex w-full cursor-pointer items-center overflow-hidden rounded-2xl border border-blue-100/80 bg-blue-50 px-6 py-5 text-left shadow-sm transition-all hover:border-blue-200 hover:bg-blue-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <BookOpen
                  size={100}
                  strokeWidth={2.5}
                  className="pointer-events-none absolute -bottom-4 -right-4 -rotate-12 text-blue-200/90 opacity-40 transition-transform duration-500 group-hover:rotate-0"
                  aria-hidden
                />
                <span className="relative z-10 flex min-w-0 flex-1 items-center gap-2.5 pr-4 text-sm font-semibold leading-relaxed tracking-tight text-blue-950">
                  <Plus size={20} strokeWidth={2.5} className="shrink-0 text-blue-600" aria-hidden />
                  <span className="min-w-0">{t.knowledgeBase.create}</span>
                </span>
                <ChevronRight
                  size={22}
                  className="relative z-10 shrink-0 text-blue-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600"
                  aria-hidden
                />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSaveError(null);
        }}
        title={editingKb ? t.knowledgeBase.editTitle : t.knowledgeBase.newTitle}
        showFooterClose={false}
        size="xl"
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                {t.knowledgeBase.modalNameLabel}
              </label>
              <input
                name="name"
                required
                defaultValue={editingKb?.name}
                placeholder={t.knowledgeBase.modalNamePlaceholder}
                className="minimal-input"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                {t.knowledgeBase.modalDescriptionLabel}
              </label>
              <textarea
                name="description"
                rows={3}
                defaultValue={editingKb?.description}
                placeholder={t.knowledgeBase.modalDescriptionPlaceholder}
                className="minimal-input"
              />
            </div>

            <div className="border-t border-slate-100 pt-6 mt-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  {t.knowledgeBase.modalSpecificationLabel}
                </label>
                <p className="text-xs text-slate-500 mb-3 ml-1">{t.knowledgeBase.modalSpecificationHint}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'customer' as const, label: t.knowledgeBase.modalCustomerSpecific },
                      { id: 'domain' as const, label: t.knowledgeBase.modalDomainSpecific },
                      { id: 'project' as const, label: t.knowledgeBase.modalProjectSpecific },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition-colors ${
                        modalSpecification === opt.id
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="kbSpecification"
                        value={opt.id}
                        checked={modalSpecification === opt.id}
                        onChange={() => setModalSpecification(opt.id)}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {modalSpecification === 'domain' && (
                <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                  {t.knowledgeBase.modalDomainSpecific}
                </label>
                <p className="text-xs text-slate-500 mb-2 ml-1">
                  {t.knowledgeBase.modalDomainSpecificHint}
                </p>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                  {domainList.length === 0 ? (
                    <p className="text-sm text-slate-500 px-1">{t.knowledgeBase.modalNoDomains}</p>
                  ) : (
                    domainList.map((d) => (
                      <label
                        key={d.id}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={modalDomainIds.includes(d.id)}
                          onChange={() => toggleModalDomain(d.id)}
                        />
                        <span className="text-sm font-medium text-slate-800">{d.name}</span>
                      </label>
                    ))
                  )}
                </div>
                </div>
              )}

              {modalSpecification === 'customer' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    {t.knowledgeBase.modalCustomerSpecific}
                  </label>
                  <select
                    name="customerId"
                    required
                    key={`customer-${editingKb?.id ?? 'new'}`}
                    defaultValue={editingKb?.customerId ?? ''}
                    className="minimal-input"
                  >
                    <option value="">{t.knowledgeBase.modalCustomerPlaceholder}</option>
                    {customerList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modalSpecification === 'project' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    {t.knowledgeBase.modalProjectSpecific}
                  </label>
                  <select
                    name="projectId"
                    required
                    key={`project-${editingKb?.id ?? 'new'}`}
                    defaultValue={editingKb?.projectId ?? ''}
                    className="minimal-input"
                  >
                    <option value="">{t.knowledgeBase.modalProjectPlaceholder}</option>
                    {projectList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({customerList.find((c) => c.id === p.customerId)?.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {saveError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
              {saveError}
            </p>
          ) : null}

          <div className="flex gap-3 pt-6 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => {
                setIsModalOpen(false);
                setSaveError(null);
              }}
              className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all flex-1"
            >
              {t.knowledgeBase.modalCancel}
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-blue-600 transition-all flex-1"
            >
              {editingKb ? t.knowledgeBase.modalSaveChanges : t.knowledgeBase.modalCreateKb}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!isDeleting}
        onClose={() => setIsDeleting(null)}
        title="Delete Knowledge Base"
        confirmLabel="Delete Everything"
        onConfirm={handleDelete}
        type="danger"
      >
        <p className="text-slate-500 text-center leading-relaxed">
          Are you sure you want to delete this knowledge base? This will also remove all indexed documents. This action cannot be undone.
        </p>
      </Modal>

      <PageHelpFullModal
        helpUrl={settings.helpKnowledgeBaseUrl || ''}
        helpMd={settings.helpKnowledgeBaseMd || ''}
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        labels={{
          guidance: t.knowledgeBase.helpGuidance,
          dontShowOnFirstOpen: t.dashboard.dontShowOnFirstOpen,
          interactiveTutorial: t.dashboard.interactiveTutorial,
          noVideo: t.dashboard.noVideo,
        }}
      />
    </div>
  );
}
