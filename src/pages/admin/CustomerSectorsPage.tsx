/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  Plus,
  Map as MapIcon,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Loader2,
  Search,
  FileSpreadsheet,
  MoreVertical,
  Edit2,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import * as DB from '../../services/db';
import { logActivity } from '../../services/db';
import { Segment, Template } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { getSectorIcon } from '../../lib/sectorIcons';
import { useAuth } from '../../lib/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import { CloneTemplateModal } from '../../components/admin/CloneTemplateModal';
import { cloneTemplate } from '../../lib/cloneTemplate';

type OverviewTemplateRow = Template & {
  pageCount: number;
  questionCount: number;
  sectorName: string;
};

export default function CustomerSectorsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [sectors, setSectors] = useState<Segment[]>([]);
  const [templateCounts, setTemplateCounts] = useState<Record<string, number>>({});
  const [selectedSector, setSelectedSector] = useState<Segment | null>(null);
  const [templates, setTemplates] = useState<(Template & { pageCount: number; questionCount: number })[]>([]);
  const [overviewTemplates, setOverviewTemplates] = useState<OverviewTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newSectorName, setNewSectorName] = useState('');
  const [editSectorName, setEditSectorName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddSector, setShowAddSector] = useState(false);
  const [showEditSector, setShowEditSector] = useState<Segment | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showDeleteSectorConfirm, setShowDeleteSectorConfirm] = useState<Segment | null>(null);
  const [showDeleteTemplateConfirm, setShowDeleteTemplateConfirm] = useState<Template | null>(null);
  const [showCloneTemplate, setShowCloneTemplate] = useState<Template | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    loadSectors();
  }, []);

  useEffect(() => {
    if (selectedSector) {
      void loadTemplates(selectedSector.id);
    }
  }, [selectedSector]);

  async function fetchSectorsTemplateIndex(): Promise<{
    filtered: Segment[];
    counts: Record<string, number>;
    overview: OverviewTemplateRow[];
  }> {
    const [sectorData, allTemplatesSnap, allPagesSnap, allQuestionsSnap] =
      await Promise.all([
        DB.segments.list(),
        DB.getDocs(DB.query(DB.getCol('templates'), DB.limit(5000))),
        DB.getDocs(DB.query(DB.getCol('templatePages'), DB.limit(5000))),
        DB.getDocs(DB.query(DB.getCol('questions'), DB.limit(5000))),
      ]);

    const filtered = (sectorData || []).filter(
      (s) => s.type === 'Customer Sector',
    );
    const sectorIds = new Set(filtered.map((s) => s.id));
    const idToName = Object.fromEntries(filtered.map((s) => [s.id, s.name]));

    const counts = (allTemplatesSnap.docs || []).reduce(
      (acc, doc) => {
        const data = doc.data();
        if (data?.sectorId) {
          acc[data.sectorId] = (acc[data.sectorId] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const pagesByTemplate = (allPagesSnap.docs || []).reduce(
      (acc, doc) => {
        const data = doc.data();
        if (data?.templateId) {
          if (!acc[data.templateId]) acc[data.templateId] = 0;
          acc[data.templateId]++;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const questionsByTemplate = (allQuestionsSnap.docs || []).reduce(
      (acc, doc) => {
        const data = doc.data();
        if (data?.templateId) {
          if (!acc[data.templateId]) acc[data.templateId] = 0;
          acc[data.templateId]++;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const overview: OverviewTemplateRow[] = (allTemplatesSnap.docs || [])
      .map((doc) => {
        const data = doc.data();
        if (!data?.sectorId || !sectorIds.has(data.sectorId)) return null;
        const name = (data.name as string) || '';
        const createdAt = (data.createdAt as number) || 0;
        const tpl: Template = {
          id: doc.id,
          name,
          sectorId: data.sectorId,
          createdAt,
        };
        return {
          ...tpl,
          pageCount: pagesByTemplate[tpl.id] || 0,
          questionCount: questionsByTemplate[tpl.id] || 0,
          sectorName: idToName[data.sectorId] ?? t.sectors.unknownSector,
        };
      })
      .filter((x): x is OverviewTemplateRow => x !== null)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return { filtered, counts, overview };
  }

  async function loadSectors() {
    setLoading(true);
    try {
      const { filtered, counts, overview } = await fetchSectorsTemplateIndex();
      setSectors(filtered);
      setTemplateCounts(counts);
      setOverviewTemplates(overview);

      if (selectedSector && filtered) {
        const updated = filtered.find((s) => s.id === selectedSector.id);
        if (updated) setSelectedSector(updated);
      }
    } catch (error) {
      console.error('Failed to load customer sectors:', error);
      setSectors([]);
      setTemplateCounts({});
      setOverviewTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  async function refreshSectorsTemplateIndex() {
    const { filtered, counts, overview } = await fetchSectorsTemplateIndex();
    setSectors(filtered);
    setTemplateCounts(counts);
    setOverviewTemplates(overview);
    setSelectedSector((prev) => {
      if (!prev) return prev;
      const updated = filtered.find((s) => s.id === prev.id);
      return updated ?? prev;
    });
  }

  async function loadTemplates(sectorId: string) {
    setTemplatesLoading(true);
    try {
      const [tList, allPagesSnap, allQuestionsSnap] = await Promise.all([
        DB.templates.listBySector(sectorId, true),
        DB.getDocs(DB.query(DB.getCol('templatePages'), DB.limit(5000))),
        DB.getDocs(DB.query(DB.getCol('questions'), DB.limit(5000))),
      ]);

      const pagesByTemplate = (allPagesSnap.docs || []).reduce(
        (acc, doc) => {
          const data = doc.data();
          if (data?.templateId) {
            if (!acc[data.templateId]) acc[data.templateId] = 0;
            acc[data.templateId]++;
          }
          return acc;
        },
        {} as Record<string, number>,
      );

      const questionsByTemplate = (allQuestionsSnap.docs || []).reduce(
        (acc, doc) => {
          const data = doc.data();
          if (data?.templateId) {
            if (!acc[data.templateId]) acc[data.templateId] = 0;
            acc[data.templateId]++;
          }
          return acc;
        },
        {} as Record<string, number>,
      );

      const enrichedTemplates = (tList || []).map((tmpl) => ({
        ...tmpl,
        pageCount: pagesByTemplate[tmpl.id] || 0,
        questionCount: questionsByTemplate[tmpl.id] || 0,
      }));

      setTemplates(enrichedTemplates);
      setTemplateCounts((prev) => ({
        ...prev,
        [sectorId]: enrichedTemplates.length,
      }));
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  }

  async function handleCreateSector(e: React.FormEvent) {
    e.preventDefault();
    if (!newSectorName.trim()) return;
    setIsCreating(true);
    try {
      const res = await DB.segments.create(newSectorName);
      if (user) {
        await logActivity(user, 'create', 'segments', res.id, `Created new Customer Sector: ${newSectorName}`);
      }
      setNewSectorName('');
      setShowAddSector(false);
      await loadSectors();
      // Auto select the new sector
      const newSector: Segment = { id: res.id, name: newSectorName, type: 'Customer Sector', createdAt: Date.now() };
      setSelectedSector(newSector);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateSector(e: React.FormEvent) {
    e.preventDefault();
    if (!showEditSector || !editSectorName.trim()) return;
    setIsSubmitting(true);
    try {
      await DB.segments.update(showEditSector.id, editSectorName);
      if (user) {
        await logActivity(user, 'update', 'segments', showEditSector.id, `Updated Customer Sector name to: ${editSectorName}`);
      }
      setShowEditSector(null);
      await loadSectors();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteSectorAction() {
    if (!showDeleteSectorConfirm) return;
    const { id, name } = showDeleteSectorConfirm;
    
    setIsDeleting(true);
    try {
      await DB.segments.delete(id);
      if (user) {
        await logActivity(user, 'delete', 'segments', id, `Deleted Customer Sector: ${name}`);
      }
      if (selectedSector?.id === id) setSelectedSector(null);
      setShowDeleteSectorConfirm(null);
      await loadSectors();
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDeleteTemplateAction() {
    if (!showDeleteTemplateConfirm) return;
    const tmpl = showDeleteTemplateConfirm;
    const templateSectorId = tmpl.sectorId;

    setIsSubmitting(true);
    try {
      const tId = tmpl.id;

      const pagesSnap = await DB.getDocs(
        DB.query(
          DB.getCol('templatePages'),
          DB.where('templateId', '==', tId),
        ),
      );
      const questionsSnap = await DB.getDocs(
        DB.query(
          DB.getCol('questions'),
          DB.where('templateId', '==', tId),
        ),
      );

      const batchSize = 450;
      const allDocs = [...pagesSnap.docs, ...questionsSnap.docs];

      for (let i = 0; i < allDocs.length; i += batchSize) {
        const batch = DB.writeBatch(DB.db);
        allDocs.slice(i, i + batchSize).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      await DB.deleteDoc(DB.doc(DB.db, 'templates', tId));

      if (user) {
        await logActivity(
          user,
          'delete',
          'templates',
          tId,
          `Deleted report template: ${tmpl.name}`,
        );
      }

      setShowDeleteTemplateConfirm(null);
      await refreshSectorsTemplateIndex();
      if (selectedSector?.id === templateSectorId) {
        await loadTemplates(templateSectorId);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert(t.sectors.templateDeleteFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCloneTemplateAction(name: string, sectorId: string) {
    if (!showCloneTemplate) return;

    setIsSubmitting(true);
    try {
      const source = showCloneTemplate;
      const created = await cloneTemplate({
        sourceTemplateId: source.id,
        name,
        sectorId,
      });
      if (user) {
        await logActivity(
          user,
          'create',
          'templates',
          created.id,
          `Cloned report template "${source.name}" to "${name}"`,
        );
      }
      setShowCloneTemplate(null);
      await refreshSectorsTemplateIndex();
      if (selectedSector?.id === sectorId) {
        await loadTemplates(sectorId);
      }
    } catch (error) {
      console.error('Failed to clone template:', error);
      alert(t.sectors.templateCloneFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string)?.trim();
    const sectorId = formData.get('sectorId') as string;
    if (!name || !sectorId) return;

    const sectorMeta = sectors.find((s) => s.id === sectorId);
    if (!sectorMeta) return;

    setIsSubmitting(true);
    try {
      const res = await DB.templates.create({ name, sectorId });
      if (user) {
        await logActivity(
          user,
          'create',
          'templates',
          res.id,
          `Created new report template: "${name}" for sector ${sectorMeta.name}`,
        );
      }
      setShowNewTemplate(false);
      await refreshSectorsTemplateIndex();
      if (selectedSector?.id === sectorId) {
        await loadTemplates(sectorId);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSectors = sectors.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-4">
        <Loader2 className="animate-spin text-slate-900" size={32} />
        <p className="text-sm font-medium animate-pulse">{t.sectors.loading}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 w-full max-w-none space-y-8">
      <header className="border-b border-slate-100 pb-8">
        <div className="flex items-center gap-4 mb-2">
          <MapIcon className="text-blue-600" size={36} strokeWidth={2.5} />
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t.sectors.title}</h1>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-slate-500 font-light text-lg">{t.sectors.subtitle}</p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 relative">
        {/* Sidebar: Sector List */}
        <motion.div 
          initial={false}
          animate={{ 
            width: isSidebarCollapsed ? 48 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? '100%' : '33.333333%'),
            marginRight: isSidebarCollapsed ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? 0 : 32)
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={cn(
            "space-y-4 relative shrink-0 lg:overflow-hidden w-full lg:w-1/3",
            isSidebarCollapsed ? "bg-slate-50/50 rounded-lg" : "bg-transparent"
          )}
        >
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center pt-4">
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-1.5 bg-white border border-slate-200 rounded-md shadow-sm text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50"
                title={t.sectors.title}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <div className="space-y-4 w-full min-w-[300px]">
              <div className="justify-between items-center border-b border-slate-100 pb-2 flex">
                <div className="flex items-center gap-4">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">{t.sectors.title}</h2>
                  <button 
                    onClick={() => setShowAddSector(true)}
                    className="px-2 py-1 bg-slate-900 text-[9px] font-bold text-white uppercase tracking-widest rounded hover:bg-slate-800 transition-all shadow-sm flex items-center gap-1"
                  >
                    <Plus size={10} />
                    {t.common.new}
                  </button>
                </div>
                {sectors.length > 0 && (
                  <button
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-1.5 bg-white border border-slate-100 rounded-md shadow-sm text-slate-400 hover:text-slate-900 transition-all"
                    title={t.sectors.hideSidebar}
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
              </div>

              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text"
                  placeholder={t.sectors.searchPlaceholder}
                  className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedSector(null)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 rounded-xl transition-all border text-left group',
                    selectedSector === null
                      ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900'
                      : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200',
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        selectedSector === null
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200',
                      )}
                    >
                      <MapIcon size={18} />
                    </div>
                    <div>
                      <span
                        className={cn(
                          'block font-bold text-sm',
                          selectedSector === null
                            ? 'text-slate-900'
                            : 'text-slate-700',
                        )}
                      >
                        {t.sectors.allSectorsTitle}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold tracking-widest">
                        {t.sectors.allSectorsTemplateCount.replace(
                          '{count}',
                          String(overviewTemplates.length),
                        )}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className={cn(
                      'shrink-0',
                      selectedSector === null
                        ? 'text-slate-900'
                        : 'text-slate-300',
                    )}
                  />
                </button>
                {filteredSectors.map((sector) => (
                  <button
                    key={sector.id}
                    onClick={() => setSelectedSector(sector)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl transition-all border text-left group",
                      selectedSector?.id === sector.id 
                        ? "bg-white border-slate-900 shadow-sm ring-1 ring-slate-900" 
                        : "bg-transparent border-transparent hover:bg-white hover:border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        selectedSector?.id === sector.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                      )}>
                        {(() => {
                          const Icon = getSectorIcon(sector.name);
                          return <Icon size={18} />;
                        })()}
                      </div>
                      <div>
                        <span className={cn("block font-bold text-sm", selectedSector?.id === sector.id ? "text-slate-900" : "text-slate-700")}>
                          {sector.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold tracking-widest">
                          {t.sectors.sidebarTemplateCount.replace(
                            '{count}',
                            String(templateCounts[sector.id] || 0),
                          )}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className={cn("shrink-0", selectedSector?.id === sector.id ? "text-slate-900" : "text-slate-300")} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Main Content: Right Panel */}
        <div className="flex-1 min-w-0 transition-all duration-300 relative">
          <AnimatePresence mode="wait">
            {!selectedSector ? (
              <motion.div
                key="all-sectors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="minimal-card p-8 flex items-start gap-6 bg-white shadow-sm border-slate-100">
                  <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                    <MapIcon size={32} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                      {t.sectors.allSectorsTitle}
                    </h2>
                    <p className="text-slate-500 font-light text-sm mt-2 max-w-2xl">
                      {t.sectors.allSectorsSubtitle}
                    </p>
                    <p className="text-slate-400 uppercase text-[10px] tracking-[0.2em] font-bold mt-3">
                      {t.sectors.allSectorsTemplateCount.replace(
                        '{count}',
                        String(overviewTemplates.length),
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      {t.sectors.datasetTemplatesSection}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowNewTemplate(true)}
                      disabled={sectors.length === 0}
                      className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest disabled:opacity-40"
                    >
                      <Plus size={14} /> {t.templates.newTemplate}
                    </button>
                  </div>

                  {overviewTemplates.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm bg-white border border-slate-100 rounded-lg border-dashed flex flex-col items-center gap-4">
                      <FileSpreadsheet size={32} className="text-slate-100" />
                      <p>{t.sectors.allTemplatesEmpty}</p>
                      {sectors.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowNewTemplate(true)}
                          className="minimal-button-secondary text-[10px]"
                        >
                          {t.sectors.initializeTemplate}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {t.sectors.tableTemplateName}
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                              {t.sectors.tablePages}
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                              {t.sectors.tableQuestions}
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">
                              {t.common.actions}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {overviewTemplates.map((tmpl) => (
                            <tr
                              key={tmpl.id}
                              className="hover:bg-slate-50/50 transition-colors group"
                            >
                              <td className="px-6 py-4 align-top">
                                <div className="flex flex-col gap-1.5">
                                  <span className="block font-bold text-slate-900 text-sm">
                                    {tmpl.name}
                                  </span>
                                  <span className="inline-flex w-fit items-center rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-blue-800">
                                    {tmpl.sectorName}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center align-top">
                                <span className="inline-flex items-center justify-center px-2 py-1 bg-slate-100 text-slate-900 text-[10px] font-bold rounded-md min-w-[24px]">
                                  {tmpl.pageCount}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center align-top">
                                <span className="inline-flex items-center justify-center px-2 py-1 bg-slate-100 text-slate-900 text-[10px] font-bold rounded-md min-w-[24px]">
                                  {tmpl.questionCount}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right align-top">
                                <div className="flex items-center justify-end gap-2 relative">
                                  <Link
                                    to={`/templates/${tmpl.sectorId}?templateId=${tmpl.id}`}
                                    className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                                    title={t.sectors.editTemplateTitle}
                                  >
                                    <Edit2 size={16} />
                                  </Link>
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveMenuId(
                                          activeMenuId === tmpl.id
                                            ? null
                                            : tmpl.id,
                                        )
                                      }
                                      className={cn(
                                        'p-2 rounded-lg transition-colors',
                                        activeMenuId === tmpl.id
                                          ? 'bg-slate-100 text-slate-900'
                                          : 'text-slate-300 hover:text-slate-900 hover:bg-slate-50',
                                      )}
                                    >
                                      <MoreVertical size={14} />
                                    </button>

                                    <AnimatePresence>
                                      {activeMenuId === tmpl.id && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setActiveMenuId(null)}
                                          />
                                          <motion.div
                                            initial={{
                                              opacity: 0,
                                              scale: 0.95,
                                              y: 5,
                                            }}
                                            animate={{
                                              opacity: 1,
                                              scale: 1,
                                              y: 0,
                                            }}
                                            exit={{
                                              opacity: 0,
                                              scale: 0.95,
                                              y: 5,
                                            }}
                                            className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setShowCloneTemplate(tmpl);
                                                setActiveMenuId(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                            >
                                              <Copy size={14} />{' '}
                                              {t.sectors.cloneTemplateMenu}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setShowDeleteTemplateConfirm(
                                                  tmpl,
                                                );
                                                setActiveMenuId(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"
                                            >
                                              <Trash2 size={14} />{' '}
                                              {t.sectors.deleteTemplateMenu}
                                            </button>
                                          </motion.div>
                                        </>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key={selectedSector.id}
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Sector Header */}
                <div className="minimal-card p-8 flex justify-between items-start bg-white shadow-sm border-slate-100">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                      {(() => {
                        const Icon = getSectorIcon(selectedSector.name);
                        return <Icon size={32} />;
                      })()}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight text-slate-900">{selectedSector.name}</h2>
                      <p className="text-slate-500 font-light uppercase text-[10px] tracking-[0.2em] font-bold mt-1">
                        {t.sectors.headerTemplateCount.replace(
                          '{count}',
                          String(templateCounts[selectedSector.id] || 0),
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditSectorName(selectedSector.name); setShowEditSector(selectedSector); }}
                      className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                      title={t.sectors.editSectorTitle}
                    >
                       <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => setShowDeleteSectorConfirm(selectedSector)}
                      disabled={templateCounts[selectedSector.id] > 0 || isDeleting}
                      className={cn(
                        "p-2 text-slate-300 transition-all rounded-lg",
                        (templateCounts[selectedSector.id] > 0)
                          ? "text-slate-200 cursor-not-allowed bg-slate-50"
                          : "hover:text-red-600 hover:bg-red-50"
                      )}
                      title={
                        templateCounts[selectedSector.id] > 0
                          ? t.sectors.deleteSectorDisabledTooltip
                          : t.sectors.deleteSectorTitle
                      }
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>

                {/* Templates Section */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      {t.sectors.datasetTemplatesSection}
                    </h3>
                    <button
                      onClick={() => setShowNewTemplate(true)}
                      className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                    >
                      <Plus size={14} /> {t.templates.newTemplate}
                    </button>
                  </div>

                  {templatesLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="animate-spin text-slate-400" />
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm bg-white border border-slate-100 rounded-lg border-dashed flex flex-col items-center gap-4">
                      <FileSpreadsheet size={32} className="text-slate-100" />
                      <p>{t.sectors.sectorNoTemplates}</p>
                      <button
                        onClick={() => setShowNewTemplate(true)}
                        className="minimal-button-secondary text-[10px]"
                      >
                        {t.sectors.initializeTemplate}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.sectors.tableTemplateName}</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">{t.sectors.tablePages}</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">{t.sectors.tableQuestions}</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">{t.common.actions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {templates.map((tmpl) => (
                            <tr key={tmpl.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="block font-bold text-slate-900 text-sm">{tmpl.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center justify-center px-2 py-1 bg-slate-100 text-slate-900 text-[10px] font-bold rounded-md min-w-[24px]">
                                  {tmpl.pageCount}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center justify-center px-2 py-1 bg-slate-100 text-slate-900 text-[10px] font-bold rounded-md min-w-[24px]">
                                  {tmpl.questionCount}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2 relative">
                                  <Link
                                    to={`/templates/${selectedSector.id}?templateId=${tmpl.id}`}
                                    className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                                    title={t.sectors.editTemplateTitle}
                                  >
                                    <Edit2 size={16} />
                                  </Link>
                                  <div className="relative">
                                    <button 
                                      onClick={() => setActiveMenuId(activeMenuId === tmpl.id ? null : tmpl.id)}
                                      className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        activeMenuId === tmpl.id ? "bg-slate-100 text-slate-900" : "text-slate-300 hover:text-slate-900 hover:bg-slate-50"
                                      )}
                                    >
                                      <MoreVertical size={14} />
                                    </button>
                                    
                                    <AnimatePresence>
                                      {activeMenuId === tmpl.id && (
                                        <>
                                          <div 
                                            className="fixed inset-0 z-10" 
                                            onClick={() => setActiveMenuId(null)}
                                          />
                                          <motion.div 
                                            initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                            className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setShowCloneTemplate(tmpl);
                                                setActiveMenuId(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                            >
                                              <Copy size={14} />{' '}
                                              {t.sectors.cloneTemplateMenu}
                                            </button>
                                            <button 
                                              onClick={() => {
                                                setShowDeleteTemplateConfirm(tmpl);
                                                setActiveMenuId(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"
                                            >
                                              <Trash2 size={14} />{' '}
                                              {t.sectors.deleteTemplateMenu}
                                            </button>
                                          </motion.div>
                                        </>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* New Sector Modal */}
        {showAddSector && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-6 underline decoration-slate-100 underline-offset-8">
                {t.sectors.addSectorModalTitle}
              </h2>
              <form onSubmit={handleCreateSector} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    {t.sectors.addSectorNameLabel}
                  </label>
                  <input
                    autoFocus
                    type="text"
                    required
                    className="minimal-input"
                    placeholder={t.sectors.addSectorNamePlaceholder}
                    value={newSectorName}
                    onChange={(e) => setNewSectorName(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddSector(false)}
                    className="minimal-button-secondary flex-1"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !newSectorName.trim()}
                    className="minimal-button-primary flex-1"
                  >
                    {isCreating ? (
                      <Loader2 className="animate-spin h-3 w-3 mx-auto" />
                    ) : (
                      t.sectors.addSectorSubmit
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Sector Modal */}
        {showEditSector && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-6 underline decoration-slate-100 underline-offset-8">
                {t.sectors.editSectorModalTitle}
              </h2>
              <form onSubmit={handleUpdateSector} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    {t.sectors.editSectorLabel}
                  </label>
                  <input
                    autoFocus
                    type="text"
                    required
                    className="minimal-input"
                    value={editSectorName}
                    onChange={(e) => setEditSectorName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditSector(null)}
                    className="minimal-button-secondary flex-1"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !editSectorName.trim()}
                    className="minimal-button-primary flex-1"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin h-3 w-3 mx-auto" />
                    ) : (
                      t.common.saveChanges
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showCloneTemplate && (
          <CloneTemplateModal
            template={showCloneTemplate}
            segments={sectors}
            defaultSectorId={selectedSector?.id ?? showCloneTemplate.sectorId}
            labels={{
              title: t.sectors.cloneTemplateModalTitle,
              segmentLabel: t.sectors.newTemplateSectorLabel,
              selectSegmentPlaceholder: t.sectors.selectSectorPlaceholder,
              templateNameLabel: t.sectors.templateNameLabel,
              submit: t.sectors.cloneTemplateSubmit,
              cancel: t.common.cancel,
            }}
            isSubmitting={isSubmitting}
            onClose={() => setShowCloneTemplate(null)}
            onConfirm={handleCloneTemplateAction}
          />
        )}

        {/* New Template Modal */}
        {showNewTemplate && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="mb-6">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  {t.sectors.newReportTemplateModalTitle}
                </h2>
              </div>
              <form onSubmit={handleCreateTemplate} className="space-y-5">
                <div>
                  <label
                    htmlFor="new-template-sector"
                    className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5"
                  >
                    {t.sectors.newTemplateSectorLabel}
                  </label>
                  <select
                    id="new-template-sector"
                    name="sectorId"
                    required
                    defaultValue={selectedSector?.id ?? ''}
                    className="minimal-input w-full"
                  >
                    <option value="" disabled>
                      {t.sectors.selectSectorPlaceholder}
                    </option>
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    {t.sectors.templateNameLabel}
                  </label>
                  <input
                    autoFocus
                    name="name"
                    type="text"
                    required
                    className="minimal-input"
                    placeholder={t.sectors.templateNamePlaceholder}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewTemplate(false)}
                    className="minimal-button-secondary flex-1"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || sectors.length === 0}
                    className="minimal-button-primary flex-1"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin h-3 w-3 mx-auto" />
                    ) : (
                      t.sectors.createTemplate
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Delete Sector Confirmation Modal */}
        {showDeleteSectorConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {t.sectors.deleteSectorModalTitle}
                  </h2>
                  <p className="text-slate-500 text-sm">{t.sectors.deleteSectorIrreversible}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t.sectors.deleteSectorConfirmBody.replace(
                    '{name}',
                    showDeleteSectorConfirm.name,
                  )}
                </p>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowDeleteSectorConfirm(null)}
                    className="minimal-button-secondary flex-1"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleDeleteSectorAction}
                    disabled={isDeleting}
                    className="minimal-button-primary bg-red-600 hover:bg-red-700 flex-1 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      t.sectors.deleteSectorConfirmButton
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Template Confirmation Modal */}
        {showDeleteTemplateConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {t.sectors.deleteTemplateModalTitle}
                  </h2>
                  <p className="text-slate-500 text-sm">{t.sectors.deleteTemplateIrreversible}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {t.sectors.deleteTemplateConfirmLead.replace(
                    '{name}',
                    showDeleteTemplateConfirm.name,
                  )}{' '}
                  <span className="font-bold text-red-600 uppercase">
                    {t.sectors.deleteTemplateConfirmEmphasis}
                  </span>
                  .
                </p>

                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100/50 flex items-start gap-3 text-red-600">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p className="text-[11px] leading-tight font-medium">
                    {t.sectors.deleteTemplateWarning}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowDeleteTemplateConfirm(null)}
                    className="minimal-button-secondary flex-1"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleDeleteTemplateAction}
                    disabled={isSubmitting}
                    className="minimal-button-primary bg-red-600 hover:bg-red-700 flex-1 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      t.sectors.deleteTemplateConfirmButton
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
