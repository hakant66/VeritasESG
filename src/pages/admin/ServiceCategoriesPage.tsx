/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Loader2,
  Search,
  FileSpreadsheet,
  MoreVertical,
  Edit2,
  AlertCircle,
  Shapes,
  Copy,
  Upload,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import * as DB from '../../services/db';
import { logActivity } from '../../services/db';
import { Segment, Template, SectorCategory, SectorCategoryType } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import { CloneTemplateModal } from '../../components/admin/CloneTemplateModal';
import { cloneTemplate } from '../../lib/cloneTemplate';
import Modal from '../../components/ui/Modal';
import {
  SECTOR_CATEGORY_EXCEL_HEADERS,
  autoMapSectorCategoryHeaders,
  SECTOR_CATEGORY_IMPORT_FIELD_DEFS,
  SECTOR_CATEGORY_TYPE_FIELDS,
  SectorCategoryExcelMapping,
  sheetToRowArrays,
} from '../../services/excel';

type OverviewTemplateRow = Template & {
  pageCount: number;
  questionCount: number;
  categoryName: string;
};

export default function ServiceCategoriesPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'categories'>('templates');

  // Service Categories (Segments) state
  const [categories, setCategories] = useState<Segment[]>([]);
  const [templateCounts, setTemplateCounts] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<Segment | null>(null);
  const [templates, setTemplates] = useState<(Template & { pageCount: number; questionCount: number })[]>([]);
  const [overviewTemplates, setOverviewTemplates] = useState<OverviewTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState<Segment | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState<Segment | null>(null);
  const [showDeleteTemplateConfirm, setShowDeleteTemplateConfirm] = useState<Template | null>(null);
  const [showCloneTemplate, setShowCloneTemplate] = useState<Template | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // SectorCategories import state
  const [sectorCategories, setSectorCategories] = useState<SectorCategory[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMapping, setImportMapping] = useState<SectorCategoryExcelMapping | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importData, setImportData] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [sectorCategoriesLoading, setSectorCategoriesLoading] = useState(false);
  const [selectedQuestionSetType, setSelectedQuestionSetType] = useState<SectorCategoryType>('sozel');
  const [metadataMapping, setMetadataMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCategories();
    loadSectorCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      void loadTemplates(selectedCategory.id);
    }
  }, [selectedCategory]);

  async function loadSectorCategories() {
    setSectorCategoriesLoading(true);
    try {
      const data = await DB.sectorCategories.list(true);
      setSectorCategories(data || []);
    } catch (error) {
      console.error('Failed to load sector categories:', error);
    } finally {
      setSectorCategoriesLoading(false);
    }
  }

  async function fetchCategoriesTemplateIndex(): Promise<{
    filtered: Segment[];
    counts: Record<string, number>;
    overview: OverviewTemplateRow[];
  }> {
    const [segmentData, allTemplatesSnap, allPagesSnap, allQuestionsSnap] =
      await Promise.all([
        DB.segments.list(),
        DB.getDocs(DB.getCol('templates')),
        DB.getDocs(DB.getCol('templatePages')),
        DB.getDocs(DB.getCol('questions')),
      ]);

    const filtered = (segmentData || []).filter(
      (s) => s.type === 'Service Category',
    );
    const categoryIds = new Set(filtered.map((s) => s.id));
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
        if (!data?.sectorId || !categoryIds.has(data.sectorId)) return null;
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
          categoryName: idToName[data.sectorId] ?? t.categories.unknownCategory,
        };
      })
      .filter((x): x is OverviewTemplateRow => x !== null)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return { filtered, counts, overview };
  }

  async function loadCategories() {
    setLoading(true);
    try {
      const { filtered, counts, overview } =
        await fetchCategoriesTemplateIndex();
      setCategories(filtered);
      setTemplateCounts(counts);
      setOverviewTemplates(overview);

      if (selectedCategory && filtered) {
        const updated = filtered.find((s) => s.id === selectedCategory.id);
        if (updated) setSelectedCategory(updated);
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshCategoriesTemplateIndex() {
    const { filtered, counts, overview } =
      await fetchCategoriesTemplateIndex();
    setCategories(filtered);
    setTemplateCounts(counts);
    setOverviewTemplates(overview);
    setSelectedCategory((prev) => {
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
        DB.getDocs(DB.getCol('templatePages')),
        DB.getDocs(DB.getCol('questions')),
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

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setIsCreating(true);
    try {
      const res = await DB.segments.create(newCategoryName, 'Service Category');
      if (user) {
        await logActivity(user, 'create', 'segments', res.id, `Created new Service Category: ${newCategoryName}`);
      }
      setNewCategoryName('');
      setShowAddCategory(false);
      await loadCategories();
      // Auto select the new category
      const newCategory: Segment = { id: res.id, name: newCategoryName, type: 'Service Category', createdAt: Date.now() };
      setSelectedCategory(newCategory);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!showEditCategory || !editCategoryName.trim()) return;
    setIsSubmitting(true);
    try {
      await DB.segments.update(showEditCategory.id, editCategoryName);
      if (user) {
        await logActivity(user, 'update', 'segments', showEditCategory.id, `Updated Service Category name to: ${editCategoryName}`);
      }
      setShowEditCategory(null);
      await loadCategories();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteCategoryAction() {
    if (!showDeleteCategoryConfirm) return;
    const { id, name } = showDeleteCategoryConfirm;
    
    setIsDeleting(true);
    try {
      await DB.segments.delete(id);
      if (user) {
        await logActivity(user, 'delete', 'segments', id, `Deleted Service Category: ${name}`);
      }
      if (selectedCategory?.id === id) setSelectedCategory(null);
      setShowDeleteCategoryConfirm(null);
      await loadCategories();
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDeleteTemplateAction() {
    if (!showDeleteTemplateConfirm) return;
    const tmpl = showDeleteTemplateConfirm;
    const templateCategoryId = tmpl.sectorId;

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
      await refreshCategoriesTemplateIndex();
      if (selectedCategory?.id === templateCategoryId) {
        await loadTemplates(templateCategoryId);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
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
      await refreshCategoriesTemplateIndex();
      if (selectedCategory?.id === sectorId) {
        await loadTemplates(sectorId);
      }
    } catch (error) {
      console.error('Failed to clone template:', error);
      alert(t.categories.templateCloneFailed);
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

    const cat = categories.find((c) => c.id === sectorId);
    if (!cat) return;

    setIsSubmitting(true);
    try {
      const res = await DB.templates.create({ name, sectorId });
      if (user) {
        await logActivity(
          user,
          'create',
          'templates',
          res.id,
          `Created new report template: "${name}" for category ${cat.name}`,
        );
      }
      setShowNewTemplate(false);
      await refreshCategoriesTemplateIndex();
      if (selectedCategory?.id === sectorId) {
        await loadTemplates(sectorId);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = sheetToRowArrays(worksheet) as any[];

        if (jsonData.length < 2) {
          setImportError('Excel file must contain headers and at least one data row');
          return;
        }

        const headers = (jsonData[0] as any[]).map(h => String(h));
        const rows = jsonData.slice(1);

        setImportHeaders(headers);
        setImportData(rows);
        const mapping = autoMapSectorCategoryHeaders(headers);
        setImportMapping(mapping);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Failed to read Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportSectorCategories = async () => {
    if (!importMapping || !importData.length) {
      setImportError('No data to import');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const items: any[] = [];
      let order = 0;

      for (const row of importData) {
        if (!Array.isArray(row)) continue;

        const getValue = (fieldKey: keyof SectorCategoryExcelMapping) => {
          const colName = importMapping[fieldKey];
          if (!colName || typeof colName !== 'string') return '';
          const colIndex = importHeaders.indexOf(colName);
          return colIndex >= 0 ? (row[colIndex] || '') : '';
        };

        const getMetadataValue = (metaKey: string) => {
          const colName = metadataMapping[metaKey];
          if (!colName) return '';
          const colIndex = importHeaders.indexOf(colName);
          return colIndex >= 0 ? (row[colIndex] || '') : '';
        };

        const numara = getValue('numaraField');
        const bolum = getValue('bolumField');
        const kod = getValue('kodField');

        if (!kod) continue;

        // Build metadata based on question set type
        const metadata: Record<string, any> = {};

        if (selectedQuestionSetType === 'sozel') {
          metadata.ilgiliKonu = getMetadataValue('ilgiliKonu') || bolum;
          metadata.departman = getMetadataValue('departman');
          metadata.not = getMetadataValue('not');
          const maxLen = getMetadataValue('maxLength');
          if (maxLen) metadata.maxLength = parseInt(maxLen);
        } else if (selectedQuestionSetType === 'sayisal') {
          metadata.unit = getMetadataValue('unit');
          const minVal = getMetadataValue('minValue');
          if (minVal) metadata.minValue = parseFloat(minVal);
          const maxVal = getMetadataValue('maxValue');
          if (maxVal) metadata.maxValue = parseFloat(maxVal);
          metadata.formula = getMetadataValue('formula');
          metadata.department = getMetadataValue('department');
        }

        const item: SectorCategory = {
          id: '',
          questionSetType: selectedQuestionSetType,
          numara: numara ? parseInt(numara) : undefined,
          bolum: String(bolum),
          kod: String(kod),
          baslik: String(getValue('baslikField')),
          soru: String(getValue('soruField')),
          firmaYaniti: String(getValue('firmaYanitiField')),
          ilgiliBirim: String(getValue('birimField')),
          veriDogrulugu: String(getValue('veriDogruluguField')),
          soruAciklama: String(getValue('aciklamaField')),
          ornekYanit: String(getValue('ornekField')),
          dayanak: String(getValue('dayanakField')),
          onay: String(getValue('onayField')),
          tesisBazinda: String(getValue('tesisBazindaField')),
          ekZorunlu: String(getValue('ekZorunluField')),
          raporYeri: String(getValue('raporField')),
          reportingItr: String(getValue('reportingItrField')),
          atananSayfa: getValue('atananSayfaField') ? String(getValue('atananSayfaField')) : undefined,
          kayit: String(getValue('kayitField')),
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          order: order++,
        };

        items.push(item);
      }

      if (items.length === 0) {
        setImportError('No valid rows found in Excel file');
        return;
      }

      const created = await DB.sectorCategories.bulkCreate(items);
      if (user) {
        await logActivity(user, 'create', 'sectorCategories', '', `Imported ${created.length} ${selectedQuestionSetType} sector categories from Excel`);
      }

      setShowImportModal(false);
      setImportFile(null);
      setImportData([]);
      setImportMapping(null);
      setMetadataMapping({});
      setSelectedQuestionSetType('sozel');
      await loadSectorCategories();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-4">
        <Loader2 className="animate-spin text-slate-900" size={32} />
        <p className="text-sm font-medium animate-pulse">Loading Service Category Landscape...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 w-full max-w-none space-y-8">
      <header className="border-b border-slate-100 pb-8">
        <div className="flex items-center gap-4 mb-2">
          <Shapes className="text-blue-600" size={36} strokeWidth={2.5} />
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t.categories.title}</h1>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-slate-500 font-light text-lg">{t.categories.subtitle}</p>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 mb-8">
        <button
          onClick={() => setActiveTab('templates')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-all',
            activeTab === 'templates'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          )}
        >
          Service Categories
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-2',
            activeTab === 'categories'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          )}
        >
          Sector Categories {sectorCategories.length > 0 && `(${sectorCategories.length})`}
        </button>
      </div>

      {activeTab === 'templates' ? (
      <div className="flex flex-col lg:flex-row gap-8 relative">
        {/* Sidebar: Category List */}
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
                title={t.categories.title}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <div className="space-y-4 w-full min-w-[300px]">
              <div className="justify-between items-center border-b border-slate-100 pb-2 flex">
                <div className="flex items-center gap-4">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">{t.categories.title}</h2>
                  <button 
                    onClick={() => setShowAddCategory(true)}
                    className="px-2 py-1 bg-slate-900 text-[9px] font-bold text-white uppercase tracking-widest rounded hover:bg-slate-800 transition-all shadow-sm flex items-center gap-1"
                  >
                    <Plus size={10} />
                    {t.common.new}
                  </button>
                </div>
                {categories.length > 0 && (
                  <button
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-1.5 bg-white border border-slate-100 rounded-md shadow-sm text-slate-400 hover:text-slate-900 transition-all"
                    title="Hide Sidebar"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
              </div>

              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text"
                  placeholder={t.categories.searchPlaceholder}
                  className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 rounded-xl transition-all border text-left group',
                    selectedCategory === null
                      ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900'
                      : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200',
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        selectedCategory === null
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200',
                      )}
                    >
                      <Shapes size={18} />
                    </div>
                    <div>
                      <span
                        className={cn(
                          'block font-bold text-sm',
                          selectedCategory === null
                            ? 'text-slate-900'
                            : 'text-slate-700',
                        )}
                      >
                        {t.categories.allCategoriesTitle}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold tracking-widest">
                        {t.categories.allCategoriesTemplateCount.replace(
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
                      selectedCategory === null
                        ? 'text-slate-900'
                        : 'text-slate-300',
                    )}
                  />
                </button>
                {filteredCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl transition-all border text-left group",
                      selectedCategory?.id === category.id 
                        ? "bg-white border-slate-900 shadow-sm ring-1 ring-slate-900" 
                        : "bg-transparent border-transparent hover:bg-white hover:border-slate-200"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        selectedCategory?.id === category.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                      )}>
                        <Shapes size={18} />
                      </div>
                      <div>
                        <span className={cn("block font-bold text-sm", selectedCategory?.id === category.id ? "text-slate-900" : "text-slate-700")}>
                          {category.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold tracking-widest">
                          {t.categories.sidebarTemplateCount.replace(
                            '{count}',
                            String(templateCounts[category.id] || 0),
                          )}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className={cn("shrink-0", selectedCategory?.id === category.id ? "text-slate-900" : "text-slate-300")} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Main Content: Right Panel */}
        <div className="flex-1 min-w-0 transition-all duration-300 relative">
          <AnimatePresence mode="wait">
            {!selectedCategory ? (
              <motion.div
                key="all-categories"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="minimal-card p-8 flex items-start gap-6 bg-white shadow-sm border-slate-100">
                  <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                    <Shapes size={32} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                      {t.categories.allCategoriesTitle}
                    </h2>
                    <p className="text-slate-500 font-light text-sm mt-2 max-w-2xl">
                      {t.categories.allCategoriesSubtitle}
                    </p>
                    <p className="text-slate-400 uppercase text-[10px] tracking-[0.2em] font-bold mt-3">
                      {t.categories.allCategoriesTemplateCount.replace(
                        '{count}',
                        String(overviewTemplates.length),
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      {t.categories.datasetTemplatesSection}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowNewTemplate(true)}
                      disabled={categories.length === 0}
                      className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest disabled:opacity-40"
                    >
                      <Plus size={14} /> {t.templates.newTemplate}
                    </button>
                  </div>

                  {overviewTemplates.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm bg-white border border-slate-100 rounded-lg border-dashed flex flex-col items-center gap-4">
                      <FileSpreadsheet size={32} className="text-slate-100" />
                      <p>{t.categories.allTemplatesEmpty}</p>
                      {categories.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowNewTemplate(true)}
                          className="minimal-button-secondary text-[10px]"
                        >
                          {t.categories.initializeTemplate}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-100 rounded-xl shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {t.categories.tableTemplateName}
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                              {t.categories.tablePages}
                            </th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                              {t.categories.tableQuestions}
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
                                  <span className="inline-flex w-fit items-center rounded border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-violet-800">
                                    {tmpl.categoryName}
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
                                    title={t.categories.editTemplateTitle}
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
                                            className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setShowCloneTemplate(tmpl);
                                                setActiveMenuId(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-[10px] mx-1 first:rounded-t-lg last:rounded-b-lg"
                                            >
                                              <Copy size={14} />{' '}
                                              {t.categories.cloneTemplateMenu}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setShowDeleteTemplateConfirm(
                                                  tmpl,
                                                );
                                                setActiveMenuId(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 rounded-[10px] mx-1 first:rounded-t-lg last:rounded-b-lg"
                                            >
                                              <Trash2 size={14} />{' '}
                                              {t.categories.deleteTemplateMenu}
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
                key={selectedCategory.id}
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Category Header */}
                <div className="minimal-card p-8 flex justify-between items-start bg-white shadow-sm border-slate-100">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                      <Shapes size={32} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight text-slate-900">{selectedCategory.name}</h2>
                      <p className="text-slate-500 font-light uppercase text-[10px] tracking-[0.2em] font-bold mt-1">
                        {t.categories.headerTemplateCount.replace(
                          '{count}',
                          String(templateCounts[selectedCategory.id] || 0),
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditCategoryName(selectedCategory.name); setShowEditCategory(selectedCategory); }}
                      className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
                      title="Edit Category"
                    >
                       <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => setShowDeleteCategoryConfirm(selectedCategory)}
                      disabled={templateCounts[selectedCategory.id] > 0 || isDeleting}
                      className={cn(
                        "p-2 text-slate-300 transition-all rounded-lg",
                        (templateCounts[selectedCategory.id] > 0)
                          ? "text-slate-200 cursor-not-allowed bg-slate-50"
                          : "hover:text-red-600 hover:bg-red-50"
                      )}
                      title={templateCounts[selectedCategory.id] > 0 ? "Cannot delete category with associated templates" : "Delete Category"}
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>

                {/* Templates Section */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      {t.categories.datasetTemplatesSection}
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
                      <p>{t.categories.categoryNoTemplates}</p>
                      <button 
                        onClick={() => setShowNewTemplate(true)}
                        className="minimal-button-secondary text-[10px]"
                      >
                        {t.categories.initializeTemplate}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-100 rounded-xl shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.categories.tableTemplateName}</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">{t.categories.tablePages}</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">{t.categories.tableQuestions}</th>
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
                                    to={`/templates/${selectedCategory.id}?templateId=${tmpl.id}`}
                                    className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                                    title={t.categories.editTemplateTitle}
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
                                            className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setShowCloneTemplate(tmpl);
                                                setActiveMenuId(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 rounded-[10px] mx-1 first:rounded-t-lg last:rounded-b-lg"
                                            >
                                              <Copy size={14} />{' '}
                                              {t.categories.cloneTemplateMenu}
                                            </button>
                                            <button
                                              onClick={() => {
                                                setShowDeleteTemplateConfirm(tmpl);
                                                setActiveMenuId(null);
                                              }}
                                              className="w-full px-4 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 rounded-[10px] mx-1 first:rounded-t-lg last:rounded-b-lg"
                                            >
                                              <Trash2 size={14} />{' '}
                                              {t.categories.deleteTemplateMenu}
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
      ) : (
        // Sector Categories Tab
        <div className="w-full space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Sector Categories</h2>
            <button
              onClick={() => {
                setShowImportModal(true);
                setImportFile(null);
                setImportData([]);
                setImportMapping(null);
                setImportError(null);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm"
            >
              <Upload size={16} />
              Import from Excel
            </button>
          </div>

          {sectorCategoriesLoading ? (
            <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-4">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-sm font-medium">Loading sector categories...</p>
            </div>
          ) : sectorCategories.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-lg border border-slate-200">
              <AlertCircle className="mx-auto mb-3 text-slate-400" size={32} />
              <p className="text-slate-600 mb-4">No sector categories imported yet.</p>
              <button
                onClick={() => {
                  setShowImportModal(true);
                  setImportFile(null);
                  setImportData([]);
                  setImportMapping(null);
                  setImportError(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all inline-flex items-center gap-2"
              >
                <Upload size={16} />
                Import Sector Categories
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-900">TYPE</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-900">KOD</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-900">BAŞLIK</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-900">BÖLÜM</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-900">İLGİLİ BİRİM</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-900">RAPOR YERİ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sectorCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-block px-2 py-1 rounded-full text-xs font-bold',
                          cat.questionSetType === 'sozel' && 'bg-blue-100 text-blue-700',
                          cat.questionSetType === 'sayisal' && 'bg-green-100 text-green-700',
                          cat.questionSetType === 'sasb' && 'bg-purple-100 text-purple-700',
                          cat.questionSetType === 'gri' && 'bg-orange-100 text-orange-700',
                          cat.questionSetType === 'other' && 'bg-slate-100 text-slate-700',
                        )}>
                          {cat.questionSetType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-900">{cat.kod}</td>
                      <td className="px-4 py-3 text-slate-700">{cat.baslik}</td>
                      <td className="px-4 py-3 text-slate-600">{cat.bolum}</td>
                      <td className="px-4 py-3 text-slate-600">{cat.ilgiliBirim}</td>
                      <td className="px-4 py-3 text-slate-600">{cat.raporYeri}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {/* New Category Modal */}
        {showAddCategory && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-6 underline decoration-slate-100 underline-offset-8">Define New Service Category</h2>
              <form onSubmit={handleCreateCategory} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Service Category Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    required 
                    className="minimal-input" 
                    placeholder="e.g. Environmental Consulting"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowAddCategory(false)} 
                    className="minimal-button-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isCreating || !newCategoryName.trim()} 
                    className="minimal-button-primary flex-1"
                  >
                    {isCreating ? <Loader2 className="animate-spin h-3 w-3 mx-auto" /> : 'Create Service Category'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Category Modal */}
        {showEditCategory && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-6 underline decoration-slate-100 underline-offset-8">Edit Service Category</h2>
              <form onSubmit={handleUpdateCategory} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Service Category Label</label>
                  <input 
                    autoFocus
                    type="text" 
                    required 
                    className="minimal-input" 
                    value={editCategoryName}
                    onChange={e => setEditCategoryName(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setShowEditCategory(null)} 
                    className="minimal-button-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !editCategoryName.trim()} 
                    className="minimal-button-primary flex-1"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin h-3 w-3 mx-auto" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showCloneTemplate && (
          <CloneTemplateModal
            template={showCloneTemplate}
            segments={categories}
            defaultSectorId={selectedCategory?.id ?? showCloneTemplate.sectorId}
            labels={{
              title: t.categories.cloneTemplateModalTitle,
              segmentLabel: t.categories.newTemplateCategoryLabel,
              selectSegmentPlaceholder: t.categories.selectCategoryPlaceholder,
              templateNameLabel: t.categories.tableTemplateName,
              submit: t.categories.cloneTemplateSubmit,
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
                  New Report Template
                </h2>
              </div>
              <form onSubmit={handleCreateTemplate} className="space-y-5">
                <div>
                  <label
                    htmlFor="new-template-category"
                    className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5"
                  >
                    {t.categories.newTemplateCategoryLabel}
                  </label>
                  <select
                    id="new-template-category"
                    name="sectorId"
                    required
                    defaultValue={selectedCategory?.id ?? ''}
                    className="minimal-input w-full"
                  >
                    <option value="" disabled>
                      {t.categories.selectCategoryPlaceholder}
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    {t.categories.tableTemplateName}
                  </label>
                  <input
                    autoFocus
                    name="name"
                    type="text"
                    required
                    className="minimal-input"
                    placeholder="e.g. ESG Framework"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewTemplate(false)}
                    className="minimal-button-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || categories.length === 0}
                    className="minimal-button-primary flex-1"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin h-3 w-3 mx-auto" />
                    ) : (
                      'Create Template'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Delete Category Confirmation Modal */}
        {showDeleteCategoryConfirm && (
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
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Delete Service Category</h2>
                  <p className="text-slate-500 text-sm">Action cannot be undone.</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Are you sure you want to delete the <span className="font-bold text-slate-900">"{showDeleteCategoryConfirm.name}"</span> category? This will permanently remove its metadata and associations.
                </p>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowDeleteCategoryConfirm(null)} 
                    className="minimal-button-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteCategoryAction} 
                    disabled={isDeleting}
                    className="minimal-button-primary bg-red-600 hover:bg-red-700 flex-1 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : 'Yes, Delete Service Category'}
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
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Delete Template</h2>
                  <p className="text-slate-500 text-sm">Permanent destruction.</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-slate-900">"{showDeleteTemplateConfirm.name}"</span>? 
                  All pages and questions within this template will be <span className="font-bold text-red-600 uppercase">permanently deleted</span>.
                </p>
                
                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100/50 flex items-start gap-3 text-red-600">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p className="text-[11px] leading-tight font-medium">
                    This will also affect existing projects that haven't finalized their questionnaires yet.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowDeleteTemplateConfirm(null)} 
                    className="minimal-button-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteTemplateAction} 
                    disabled={isSubmitting}
                    className="minimal-button-primary bg-red-600 hover:bg-red-700 flex-1 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Delete Everything'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {/* Import Sector Categories Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto"
            >
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Import Sector Categories</h2>
                  <p className="text-slate-500 text-sm">Upload an Excel file with sector category data</p>
                </div>
              </div>

              {!importFile ? (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileSpreadsheet size={32} className="mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-700 font-medium mb-1">Click to select file or drag and drop</p>
                  <p className="text-slate-500 text-sm">Excel file (.xlsx, .xls)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              ) : importData.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                  Loading file data...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>{importData.length}</strong> rows found in file. Configure field mapping below.
                    </p>
                  </div>

                  {/* Question Set Type Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase">Question Set Type</label>
                    <select
                      value={selectedQuestionSetType}
                      onChange={(e) => {
                        setSelectedQuestionSetType(e.target.value as SectorCategoryType);
                        setMetadataMapping({});
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="sozel">Sözel (Verbal)</option>
                      <option value="sayisal">Sayısal (Numerical)</option>
                      <option value="sasb">SASB</option>
                      <option value="gri">GRI</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Standard Field Mapping */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-600 uppercase">Standard Fields</h3>
                    <div className="space-y-3 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                      {SECTOR_CATEGORY_IMPORT_FIELD_DEFS.map(({ key, label, required }) => (
                      <div key={key} className="flex items-center gap-3">
                        <label className="flex-1">
                          <span className="text-xs font-bold text-slate-600 uppercase">{label}</span>
                          {required && <span className="text-red-600">*</span>}
                        </label>
                        <select
                          value={(importMapping?.[key as keyof SectorCategoryExcelMapping] || '') as string}
                          onChange={(e) => {
                            if (importMapping) {
                              setImportMapping({
                                ...importMapping,
                                [key as keyof SectorCategoryExcelMapping]: e.target.value,
                              });
                            }
                          }}
                          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-600"
                        >
                          <option value="">-- Select Column --</option>
                          {importHeaders.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                    </div>
                  </div>

                  {/* Type-Specific Metadata Fields */}
                  {SECTOR_CATEGORY_TYPE_FIELDS[selectedQuestionSetType] && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-600 uppercase">Type-Specific Fields ({selectedQuestionSetType})</h3>
                      <div className="space-y-3 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                        {SECTOR_CATEGORY_TYPE_FIELDS[selectedQuestionSetType].map(({ key, label }) => (
                          <div key={key} className="flex items-center gap-3">
                            <label className="flex-1">
                              <span className="text-xs font-bold text-slate-600 uppercase">{label}</span>
                            </label>
                            <select
                              value={metadataMapping[key] || ''}
                              onChange={(e) => {
                                setMetadataMapping({
                                  ...metadataMapping,
                                  [key]: e.target.value,
                                });
                              }}
                              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-600"
                            >
                              <option value="">-- Optional --</option>
                              {importHeaders.map((header) => (
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {importError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {importError}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportData([]);
                    setImportError(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-all"
                  disabled={isImporting}
                >
                  Cancel
                </button>
                {importFile && importData.length > 0 && (
                  <button
                    onClick={handleImportSectorCategories}
                    disabled={isImporting || !importMapping}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:bg-slate-300 flex items-center gap-2"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Import {importData.length} Categories
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
