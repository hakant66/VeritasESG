/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit2,
  Trash2,
  Plus,
  Save,
  Map as MapIcon,
  Shapes,
  Globe,
  Tags,
  Sparkles,
  AlertTriangle,
  Search,
  FileCode,
  Filter,
  Layers,
} from "lucide-react";
import * as DB from "../../services/db";
import { logActivity } from "../../services/db";
import { ColumnSettingsPanel } from "../../components/admin/ColumnSettingsPanel";
import { QuestionExplorerTable } from "../../components/admin/QuestionExplorerTable";
import { QuestionExplorerDetailSheet } from "../../components/admin/QuestionExplorerDetailSheet";
import {
  mergeColumnWidths,
  type TemplateQuestionGridFieldId,
} from "../../lib/templateQuestionGrid";
import {
  ilgiliBirimMongoPayload,
  normalizeQuestionIlgiliBirim,
  readQuestionIlgiliBirim,
} from "../../lib/questionIlgiliBirim";
import {
  loadColumnState,
  saveColumnState,
  normalizeColumnOrder,
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_COLUMN_ORDER,
} from "../../lib/columnState";
import {
  TEMPLATE_PAGE_KINDS,
  type TemplatePageKind,
  normalizeTemplatePageKind,
} from "../../lib/templatePageKind";
import { mapDomainClauseAndEnhance } from "../../services/gemini";
import {
  autoMapExcelHeaders,
  detectExcelImportMode,
  getExcelImportFieldDefs,
  mergeImportHeaderOptions,
  parseQuestionSetExcel,
  getExcelHeaders,
  ExcelMapping,
  ExcelImportMode,
  exportQuestionsToExcel,
} from "../../services/excel";
import { sortQuestionsBySheetAndNumara } from "../../lib/compareTemplateQuestions";
import {
  collectSheetPageSyncUpdates,
  questionMatchesTemplatePageFilter,
  resolveQuestionTemplatePageId,
} from "../../lib/templatePageSheetMapping";
import { applyTemplateQuestionImport } from "../../lib/importTemplateQuestionsByKod";
import { resolveImportAtananSayfaPages } from "../../lib/resolveImportAtananSayfa";
import {
  buildAppendedQuestionKayit,
  buildQuestionKayitSnapshot,
  type QuestionKayitActor,
} from "../../lib/questionKayitLog";
import {
  Segment,
  Template,
  Question,
  Domain,
  QuestionAnswerFormat,
  QuestionSoruCogaltma,
} from "../../types";
import { normalizeQuestionSoruCogaltma } from "../../lib/questionSoruCogaltma";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { HelpMarkdown } from "../../components/ui/HelpMarkdown";
import { useAuth } from "../../lib/AuthContext";
import { useTranslation } from "../../hooks/useTranslation";
import Modal from "../../components/ui/Modal";
import { MarkdownEditorModal } from "../../components/ui/MarkdownEditorModal";
import { PaginationBar, type PageSizeOption } from "../../components/ui/PaginationBar";

const FIELD_LABEL_EMPTY_KEY = "__field_label_empty__";
const DRAFT_QUESTION_PREFIX = "draft_local_";

function selectionSetsEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

function isDraftQuestionId(id: string) {
  return id.startsWith(DRAFT_QUESTION_PREFIX);
}

/** Question explorer table: unified label + cell typography. */
const qxMetaLabel =
  "text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5";
const qxMetaLabelInline =
  "text-[10px] font-bold uppercase tracking-widest text-slate-400";
const qxCellMono =
  "text-xs font-mono font-medium text-slate-800 leading-snug";
const qxCellStrong =
  "text-xs font-semibold text-slate-800 leading-snug tracking-tight";
const qxBody = "text-sm text-slate-600 font-normal leading-relaxed";
const qxMuted = "text-xs text-slate-600 font-normal leading-snug";
const qxSelect =
  "w-full text-xs font-medium text-slate-800 border border-slate-200 bg-white hover:border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23cbd5e1%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat";
const qxExplorerReadonlyTa =
  "w-full min-w-0 cursor-pointer resize-none whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-2 text-left text-xs font-normal leading-snug text-slate-900 shadow-inner transition-colors hover:border-slate-300 hover:bg-slate-50 placeholder:text-slate-500 placeholder:italic";

/** Soru / açıklama / örnek hücrelerinde aynı görünür yükseklik (boş veya dolu). */
const EXPLORER_LONG_FIELD_TEXTAREA =
  "min-h-[11rem] max-h-[240px] overflow-y-auto";

type ExplorerMarkdownField = "soru" | "aciklama" | "ornekYanit";

type QuestionExplorerRowFields = {
  numara: string;
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
  aciklamaVideoUrl: string;
  answerFormat: QuestionAnswerFormat;
  soruCogaltma: QuestionSoruCogaltma;
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

function questionExplorerRowFields(q: Question): QuestionExplorerRowFields {
  return {
    numara:
      typeof q.numara === "number" && Number.isFinite(q.numara)
        ? String(q.numara)
        : "",
    bolum: q.bolum ?? "",
    kod: q.kod ?? "",
    baslik: q.baslik ?? "",
    soru: q.soru ?? "",
    firmaYaniti: q.firmaYaniti ?? "",
    firmaYanitiYil1: q.firmaYanitiYil1 ?? "",
    firmaYanitiYil2: q.firmaYanitiYil2 ?? "",
    firmaYanitiYil3: q.firmaYanitiYil3 ?? "",
    firmaNot: q.firmaNot ?? "",
    ilgiliBirum: readQuestionIlgiliBirim(q),
    veriDogrulugu: q.veriDogrulugu ?? "",
    aciklama: q.aciklama ?? "",
    aciklamaVideoUrl: q.aciklamaVideoUrl ?? "",
    answerFormat: q.answerFormat ?? "textarea",
    soruCogaltma: normalizeQuestionSoruCogaltma(q.soruCogaltma),
    ornekYanit: q.ornekYanit ?? "",
    dayanak: q.dayanak ?? "",
    onay: q.onay ?? "",
    raporYeri: q.raporYeri ?? "",
    reportingItr: q.reportingItr ?? "",
    tsrs1: q.tsrs1 ?? "",
    tsrs2: q.tsrs2 ?? "",
    sasbRtCh: q.sasbRtCh ?? "",
    gri: q.gri ?? "",
    msci: q.msci ?? "",
    esrs: q.esrs ?? "",
  };
}

function normalizeExplorerRowFields(
  fields: QuestionExplorerRowFields,
): QuestionExplorerRowFields {
  return {
    numara: fields.numara.trim(),
    bolum: fields.bolum.trim(),
    kod: fields.kod.trim(),
    baslik: fields.baslik.trim(),
    soru: fields.soru.trim(),
    firmaYaniti: fields.firmaYaniti.trim(),
    firmaYanitiYil1: fields.firmaYanitiYil1.trim(),
    firmaYanitiYil2: fields.firmaYanitiYil2.trim(),
    firmaYanitiYil3: fields.firmaYanitiYil3.trim(),
    firmaNot: fields.firmaNot.trim(),
    ilgiliBirum: fields.ilgiliBirum.trim(),
    veriDogrulugu: fields.veriDogrulugu.trim(),
    aciklama: fields.aciklama.trim(),
    aciklamaVideoUrl: fields.aciklamaVideoUrl.trim(),
    answerFormat: fields.answerFormat,
    soruCogaltma: fields.soruCogaltma,
    ornekYanit: fields.ornekYanit.trim(),
    dayanak: fields.dayanak.trim(),
    onay: fields.onay.trim(),
    raporYeri: fields.raporYeri.trim(),
    reportingItr: fields.reportingItr.trim(),
    tsrs1: fields.tsrs1.trim(),
    tsrs2: fields.tsrs2.trim(),
    sasbRtCh: fields.sasbRtCh.trim(),
    gri: fields.gri.trim(),
    msci: fields.msci.trim(),
    esrs: fields.esrs.trim(),
  };
}

function explorerRowFieldsEqual(
  a: QuestionExplorerRowFields,
  b: QuestionExplorerRowFields,
): boolean {
  const na = normalizeExplorerRowFields(a);
  const nb = normalizeExplorerRowFields(b);
  return (
    na.bolum === nb.bolum &&
    na.kod === nb.kod &&
    na.baslik === nb.baslik &&
    na.soru === nb.soru &&
    na.firmaYaniti === nb.firmaYaniti &&
    na.firmaYanitiYil1 === nb.firmaYanitiYil1 &&
    na.firmaYanitiYil2 === nb.firmaYanitiYil2 &&
    na.firmaYanitiYil3 === nb.firmaYanitiYil3 &&
    na.firmaNot === nb.firmaNot &&
    na.ilgiliBirum === nb.ilgiliBirum &&
    na.veriDogrulugu === nb.veriDogrulugu &&
    na.aciklama === nb.aciklama &&
    na.aciklamaVideoUrl === nb.aciklamaVideoUrl &&
    na.answerFormat === nb.answerFormat &&
    na.soruCogaltma === nb.soruCogaltma &&
    na.ornekYanit === nb.ornekYanit &&
    na.dayanak === nb.dayanak &&
    na.onay === nb.onay &&
    na.raporYeri === nb.raporYeri &&
    na.reportingItr === nb.reportingItr &&
    na.tsrs1 === nb.tsrs1 &&
    na.tsrs2 === nb.tsrs2 &&
    na.sasbRtCh === nb.sasbRtCh &&
    na.gri === nb.gri &&
    na.msci === nb.msci &&
    na.esrs === nb.esrs
  );
}

function splitSourceSheetLines(raw: string | undefined | null): string[] {
  const s = raw?.trim();
  if (!s) return [];
  const lines = s.split(/\r\n|\n|\r/).map((x) => x.trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  const parts = s.split(/[;|]/).map((x) => x.trim()).filter(Boolean);
  if (parts.length > 1) return parts;
  return [s];
}

function formatImportError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  try {
    const parsed = JSON.parse(err.message) as { error?: string };
    if (typeof parsed?.error === "string" && parsed.error.trim()) return parsed.error;
  } catch {
    /* plain Error message */
  }
  return err.message;
}

export default function TemplatesPage() {
  const { user, profile } = useAuth();

  function questionAuditFields() {
    const now = Date.now();
    const label =
      profile?.name?.trim() ||
      user?.displayName?.trim() ||
      user?.email?.trim() ||
      "";
    return {
      updatedAt: now,
      ...(user?.uid ? { updatedBy: user.uid } : {}),
      ...(label ? { updatedByName: label } : {}),
    };
  }

  function questionKayitActor(): QuestionKayitActor {
    return {
      email: user?.email?.trim() || profile?.email?.trim() || undefined,
      name:
        profile?.name?.trim() ||
        user?.displayName?.trim() ||
        undefined,
    };
  }

  function buildKayitForQuestionChange(
    existing: Question,
    next: Partial<Question>,
    fallbackAction?: string,
  ): string | undefined {
    const audit = questionAuditFields();
    const before = buildQuestionKayitSnapshot(existing, templatePages);
    const after = buildQuestionKayitSnapshot(
      { ...existing, ...next },
      templatePages,
    );
    return buildAppendedQuestionKayit({
      previousKayit: existing.kayit,
      timestamp: audit.updatedAt as number,
      actor: questionKayitActor(),
      before,
      after,
      fallbackAction,
    });
  }

  const { t } = useTranslation();
  const { sectorId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tIdFromUrl = searchParams.get("templateId");
  const questionIdFromUrl = searchParams.get("questionId");
  const [urlHighlightQuestionId, setUrlHighlightQuestionId] = useState<string | null>(
    null,
  );
  const scrolledToQuestionFromUrlRef = useRef<string | null>(null);
  type TemplateWorkspaceTabId = "dataset" | "pages" | "bulk";
  const [templateWorkspaceTab, setTemplateWorkspaceTab] =
    useState<TemplateWorkspaceTabId>("dataset");
  const [sector, setSector] = useState<Segment | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [explorerAssignmentFilter, setExplorerAssignmentFilter] = useState<
    "all" | "assigned" | "unassigned"
  >("all");
  const [selectedBaslikKeys, setSelectedBaslikKeys] = useState<string[]>([]);
  const [fieldLabelChipOrderMode, setFieldLabelChipOrderMode] = useState<
    "label" | "kod"
  >("label");
  const [fieldLabelTagsExpanded, setFieldLabelTagsExpanded] = useState(false);
  const [explorerDatasetFiltersExpanded, setExplorerDatasetFiltersExpanded] =
    useState(false);
  /** Ignore scroll-driven collapse briefly after opening filters (layout/scroll anchoring can fire `scroll`). */
  const explorerFiltersSuppressScrollCollapseUntilRef = useRef(0);
  const templateStickyToolbarRef = useRef<HTMLDivElement>(null);
  const [templateStickyToolbarPx, setTemplateStickyToolbarPx] = useState(72);

  const [questionExplorerPage, setQuestionExplorerPage] = useState(1);
  const [questionExplorerPageSize, setQuestionExplorerPageSize] =
    useState<PageSizeOption>(200);
  /** Empty = all pages; otherwise Mongo id of a template page (`templatePages`). */
  const [explorerPageIdFilter, setExplorerPageIdFilter] = useState("");
  const [templatePages, setTemplatePages] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingDraftId, setSavingDraftId] = useState<string | null>(null);
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageKind, setNewPageKind] =
    useState<TemplatePageKind>("customer_question_set");
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showDeletePageConfirm, setShowDeletePageConfirm] = useState(false);
  const [showDeleteQuestionConfirm, setShowDeleteQuestionConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<{
    id: string;
    kod: string;
  } | null>(null);
  const [pageToDelete, setPageToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [hasAnswers, setHasAnswers] = useState(false);
  const [domains, setDomains] = useState<Domain[]>([]);

  // Column visibility and order state
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = loadColumnState();
    return normalizeColumnOrder(saved.columnOrder, DEFAULT_COLUMN_ORDER);
  });
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const saved = loadColumnState();
    // Merge saved visibility with defaults to handle schema changes
    return {
      ...DEFAULT_COLUMN_VISIBILITY,
      ...(saved.columnVisibility || {}),
    };
  });

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = loadColumnState();
    return mergeColumnWidths(saved.columnWidths);
  });

  useEffect(() => {
    saveColumnState({ columnOrder, columnVisibility, columnWidths });
  }, [columnOrder, columnVisibility, columnWidths]);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importSheetNames, setImportSheetNames] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [importMode, setImportMode] = useState<ExcelImportMode>("sozel");
  const [importMapping, setImportMapping] = useState<ExcelMapping>({
    bolumField: "",
    kodField: "",
    baslikField: "",
    soruField: "",
    firmaYanitiField: "",
    firmaYanitiYil1Field: "",
    firmaYanitiYil2Field: "",
    firmaYanitiYil3Field: "",
    firmaNotField: "",
    unitField: "",
    birimField: "",
    veriDogruluguField: "",
    aciklamaField: "",
    ornekField: "",
    dayanakField: "",
    onayField: "",
    raporField: "",
    reportingItrField: "",
    tsrs1Field: "",
    tsrs2Field: "",
    sasbRtChField: "",
    griField: "",
    msciField: "",
    esrsField: "",
    atananSayfaField: "",
    kayitField: "",
    defaultAtananSayfaTitle: "",
    autoAssignKod: false,
    upsertByKod: true,
  });
  const [showAutoNumberConfirm, setShowAutoNumberConfirm] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [importResultModal, setImportResultModal] = useState<{
    variant: "success" | "error" | "warning";
    title: string;
    description: string;
  } | null>(null);
  const [showBulkAutoMappingModal, setShowBulkAutoMappingModal] = useState(false);
  const [bulkMappingStatus, setBulkMappingStatus] = useState({ current: 0, total: 0 });
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [selectedBulkDomainIds, setSelectedBulkDomainIds] = useState<string[]>([]);
  const [isMappingQuestionId, setIsMappingQuestionId] = useState<string | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [bulkSourcePageId, setBulkSourcePageId] = useState("");
  const [bulkSourceGroupKeys, setBulkSourceGroupKeys] = useState<string[]>([]);
  const [bulkLabelPageId, setBulkLabelPageId] = useState("");
  const [bulkLabelKeys, setBulkLabelKeys] = useState<string[]>([]);
  const [bulkFieldLabelOrderMode, setBulkFieldLabelOrderMode] = useState<
    "label" | "kod"
  >("label");
  const [bulkAssignSourceOpen, setBulkAssignSourceOpen] = useState(false);
  const [bulkAssignFieldOpen, setBulkAssignFieldOpen] = useState(false);
  const [bulkUpdatesOpen, setBulkUpdatesOpen] = useState(true);
  const [bulkAssigning, setBulkAssigning] = useState<"source" | "label" | null>(
    null,
  );

  useLayoutEffect(() => {
    const el = templateStickyToolbarRef.current;
    if (!el) return;
    const measure = () => {
      setTemplateStickyToolbarPx(
        Math.max(72, Math.round(el.getBoundingClientRect().height)),
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [selectedTemplate?.id, templates.length, isUploading, sector?.name]);

  useEffect(() => {
    if (sectorId) {
      loadSectorData();
    }
  }, [sectorId]);

  useEffect(() => {
    setBulkSourcePageId("");
    setBulkSourceGroupKeys([]);
    setBulkLabelPageId("");
    setBulkLabelKeys([]);
    setBulkFieldLabelOrderMode("label");
    setBulkAssigning(null);
    setFieldLabelTagsExpanded(false);
    setExplorerDatasetFiltersExpanded(false);
  }, [selectedTemplate?.id]);

  useEffect(() => {
    setTemplateWorkspaceTab("dataset");
  }, [selectedTemplate?.id]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const onWindowScroll = () => {
      if (
        performance.now() <
        explorerFiltersSuppressScrollCollapseUntilRef.current
      ) {
        return;
      }
      setExplorerDatasetFiltersExpanded(false);
    };
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onWindowScroll);
    };
  }, [selectedTemplate?.id]);

  useEffect(() => {
    if (selectedTemplate) {
      checkAnswers();
    }
  }, [selectedTemplate]);

  async function checkAnswers() {
    if (!selectedTemplate) return;
    try {
      // Check if any project exists with this template
      const pSnap = await DB.getDocs(
        DB.query(
          DB.collection(DB.db, "projects"),
          DB.where("templateId", "==", selectedTemplate.id),
          DB.limit(1), // Only need to know if ONE exists to potentially have answers
        ),
      );

      if (pSnap.empty) {
        setHasAnswers(false);
        return;
      }

      // Instead of looping through all projects, just check the most recent one
      // to see if it has ANY answers. This is a heuristic to save quota.
      const firstProjId = pSnap.docs[0].id;
      const aSnap = await DB.getDocs(
        DB.query(
          DB.collection(DB.db, `projects/${firstProjId}/answers`),
          DB.limit(1),
        ),
      );

      setHasAnswers(!aSnap.empty);
    } catch (error) {
      console.error("Error checking answers:", error);
      setHasAnswers(false);
    }
  }

  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingPageTitle, setEditingPageTitle] = useState("");

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [editingTemplateName, setEditingTemplateName] = useState("");

  const [editingBriefId, setEditingBriefId] = useState<string | null>(null);
  const [editingBriefText, setEditingBriefText] = useState("");

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const [editingQuestionText, setEditingQuestionText] = useState("");

  const [editingBolumId, setEditingBolumId] = useState<string | null>(null);
  const [editingBolumText, setEditingBolumText] = useState("");

  const [editingKodId, setEditingKodId] = useState<string | null>(null);
  const [editingKodText, setEditingKodText] = useState("");

  const [editingBaslikId, setEditingBaslikId] = useState<string | null>(null);
  const [editingBaslikText, setEditingBaslikText] = useState("");

  const [editingFirmaYanitiId, setEditingFirmaYanitiId] = useState<string | null>(null);
  const [editingFirmaYanitiText, setEditingFirmaYanitiText] = useState("");

  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [detailSheetQuestion, setDetailSheetQuestion] = useState<Question | null>(null);

  const [explorerMdModal, setExplorerMdModal] = useState<{
    questionId: string;
    field: ExplorerMarkdownField;
    draft: string;
  } | null>(null);

  const [explorerRowDrafts, setExplorerRowDrafts] = useState<
    Record<string, QuestionExplorerRowFields>
  >({});
  const [savingExplorerRowId, setSavingExplorerRowId] = useState<string | null>(
    null,
  );


  async function loadSectorData() {
    setLoading(true);
    try {
      const [sSnap, dList] = await Promise.all([
        DB.getDoc(DB.doc(DB.db, "segments", sectorId!)),
        DB.domains.list(),
      ]);
      setDomains(dList);
      if (sSnap.exists()) {
        setSector({ id: sSnap.id, ...sSnap.data(), type: sSnap.data().type || (t.nav.sectors.endsWith('s') ? 'Customer Sector' : 'Sektör') } as Segment);
        const tList = await DB.templates.listBySector(sectorId!);
        setTemplates(tList);

        // Auto select template if ID is in URL
        if (tIdFromUrl) {
          const found = tList.find((t) => t.id === tIdFromUrl);
          if (found) {
            setSelectedTemplate(found);
            loadTemplateQuestions(found.id);
          } else if (tList.length > 0) {
            setSelectedTemplate(tList[0]);
            loadTemplateQuestions(tList[0].id);
          }
        } else if (tList.length > 0 && !selectedTemplate) {
          setSelectedTemplate(tList[0]);
          loadTemplateQuestions(tList[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load sector data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function initiateFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedTemplate || !sectorId) return;

    try {
      const { headers, sheetNames } = await getExcelHeaders(file);
      setImportFile(file);
      setImportHeaders(headers);
      setImportSheetNames(sheetNames);
      setSelectedSheetName(sheetNames[0]);

      autoMap(headers, { defaultPageTitle: sheetNames[0] || "" });
      setShowMappingModal(true);
    } catch (err) {
      console.error(err);
      alert("Failed to read Excel file headers.");
    }
    // Reset input value so same file can be uploaded again if needed
    e.target.value = "";
  }

  function autoMap(
    headers: string[],
    options?: { defaultPageTitle?: string },
  ) {
    const mode = detectExcelImportMode(headers);
    setImportMode(mode);
    setImportMapping((prev) => ({
      ...autoMapExcelHeaders(headers, mode),
      selectedPageId: prev.selectedPageId,
      defaultAtananSayfaTitle: prev.selectedPageId
        ? ""
        : options?.defaultPageTitle?.trim() ||
          prev.defaultAtananSayfaTitle ||
          "",
      upsertByKod: prev.upsertByKod ?? true,
      autoAssignKod: prev.autoAssignKod,
    }));
  }

  async function handleSheetChange(sheetName: string) {
    if (!importFile) return;
    setSelectedSheetName(sheetName);
    try {
      const { headers } = await getExcelHeaders(importFile, sheetName);
      setImportHeaders(headers);
      autoMap(headers, { defaultPageTitle: sheetName });
    } catch (err) {
      console.error(err);
      alert("Failed to load headers for the selected sheet.");
    }
  }

  async function handleConfirmImport() {
    if (!importFile || !selectedTemplate || !sectorId) return;

    if (importMode === "sozel" && !importMapping.soruField) {
      setImportResultModal({
        variant: "warning",
        title: t.templates.importValidationSoruTitle,
        description: t.templates.importValidationSoruDescription,
      });
      return;
    }

    if (
      importMode === "sayisal" &&
      !importMapping.firmaYanitiYil1Field &&
      !importMapping.firmaYanitiYil2Field &&
      !importMapping.firmaYanitiYil3Field
    ) {
      setImportResultModal({
        variant: "warning",
        title: t.templates.importValidationSayisalYilTitle,
        description: t.templates.importValidationSayisalYilDescription,
      });
      return;
    }

    if (!importMapping.kodField && !importMapping.autoAssignKod) {
      setImportResultModal({
        variant: "warning",
        title: t.templates.importValidationKodTitle,
        description: t.templates.importValidationKodDescription,
      });
      return;
    }

    if (importMapping.upsertByKod && importMapping.autoAssignKod) {
      setImportResultModal({
        variant: "warning",
        title: t.templates.importValidationUpsertKodTitle,
        description: t.templates.importValidationUpsertKodDescription,
      });
      return;
    }

    if (importMapping.upsertByKod && !importMapping.kodField) {
      setImportResultModal({
        variant: "warning",
        title: t.templates.importValidationKodTitle,
        description: t.templates.importValidationUpsertRequiresKodDescription,
      });
      return;
    }

    setIsUploading(true);
    setShowMappingModal(false);
    try {
      const parsedQuestions = await parseQuestionSetExcel(
        importFile,
        selectedTemplate.id,
        sectorId,
        importMapping,
        selectedSheetName,
      );
      if (!parsedQuestions || parsedQuestions.length === 0) {
        setImportResultModal({
          variant: "warning",
          title: t.templates.importResultNoMatchTitle,
          description: t.templates.importResultNoMatchDescription,
        });
        return;
      }

      const audit = questionAuditFields();
      const resolvedQuestions = await resolveImportAtananSayfaPages({
        items: parsedQuestions,
        templateId: selectedTemplate.id,
        pages: templatePages,
        defaultAtananSayfaTitle: importMapping.defaultAtananSayfaTitle,
        selectedPageId: importMapping.selectedPageId,
        createPage: async ({ templateId, title, order }) => {
          const newDocRef = await DB.addDoc(
            DB.collection(DB.db, "templatePages"),
            {
              templateId,
              title,
              order,
              briefText: "",
              pageKind: "customer_question_set",
              createdAt: Date.now(),
            },
          );
          return { id: newDocRef.id };
        },
      });

      const questionsWithPages = resolvedQuestions.map(
        ({ atananSayfaTitle: _drop, ...q }) => ({
          ...q,
          ...audit,
        }),
      );

      const importResult = await applyTemplateQuestionImport({
        items: questionsWithPages,
        existing: questions,
        upsertByKod: importMapping.upsertByKod !== false,
        bulkCreate: async (items) => {
          const audit = questionAuditFields();
          await DB.questions.bulkCreate(
            items.map((item) => {
              const empty = buildQuestionKayitSnapshot(
                {
                  kod: "",
                  baslik: "",
                  soru: "",
                  ilgiliBirum: "",
                  aciklama: "",
                  ornekYanit: "",
                  raporYeri: "",
                  thematicGroup: "",
                  isMandatory: false,
                  order: 0,
                  templateId: item.templateId,
                  sectorId: item.sectorId,
                },
                templatePages,
              );
              const after = buildQuestionKayitSnapshot(item, templatePages);
              const kayit = buildAppendedQuestionKayit({
                previousKayit: undefined,
                timestamp: audit.updatedAt as number,
                actor: questionKayitActor(),
                before: empty,
                after,
                fallbackAction: "Excel içe aktarma ile oluşturuldu",
              });
              return { ...item, ...audit, kayit };
            }),
          );
        },
        update: async (id, data) => {
          const existing = questions.find((q) => q.id === id);
          if (!existing) {
            await DB.questions.update(id, data);
            return;
          }
          const audit = questionAuditFields();
          const kayit = buildKayitForQuestionChange(
            existing,
            data,
            "Excel içe aktarma ile güncellendi",
          );
          await DB.questions.update(id, { ...data, ...audit, kayit });
        },
        remove: async (id) => {
          await DB.deleteDoc(DB.doc(DB.db, "questions", id));
        },
      });

      if (user) {
        const defaultPageTitle = importMapping.defaultAtananSayfaTitle?.trim();
        const pageInfo = defaultPageTitle
          ? ` and assigned to page "${defaultPageTitle}"`
          : importMapping.selectedPageId
            ? ` and assigned to page "${templatePages.find((p) => p.id === importMapping.selectedPageId)?.title || "Unknown"}"`
            : " and auto-created missing pages from ATANAN SAYFA column";
        const modeLabel =
          importMapping.upsertByKod !== false
            ? `sync by sheet+KOD+soru (${importResult.updated} updated, ${importResult.created} created, ${importResult.removed} removed)`
            : `insert only (${importResult.created} created)`;
        await logActivity(
          user,
          importResult.updated > 0 ? "update" : "create",
          "questions",
          selectedTemplate.id,
          `Imported ${parsedQuestions.length} questions from Excel (${modeLabel})${pageInfo} to template ${selectedTemplate.name}`,
        );
      }
      const successDescription =
        importMapping.upsertByKod !== false
          ? t.templates.importResultSuccessUpsertDescription
              .replace("{updated}", String(importResult.updated))
              .replace("{created}", String(importResult.created))
              .replace("{removed}", String(importResult.removed))
          : t.templates.importResultSuccessDescription.replace(
              "{count}",
              String(importResult.created),
            );
      setImportResultModal({
        variant: "success",
        title: t.templates.importResultSuccessTitle,
        description: successDescription,
      });
      loadTemplateQuestions(selectedTemplate.id);
      setImportFile(null);
    } catch (err) {
      console.error(err);
      setImportResultModal({
        variant: "error",
        title: t.templates.importResultErrorTitle,
        description: `${formatImportError(err)}\n\n${t.templates.importResultErrorHint}`,
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function loadTemplateQuestions(tId: string) {
    try {
      // Wrap each fetch for quota safety
      const [qList, pSnap] = await Promise.all([
        DB.questions.listByTemplate(tId).catch(() => []),
        DB.getDocs(
          DB.query(
            DB.collection(DB.db, "templatePages"),
            DB.where("templateId", "==", tId),
          ),
        ).catch(() => ({ docs: [] }) as any),
      ]);

      const pages = pSnap.docs
        .map((d: any) => ({ id: d.id, ...d.data() }) as any)
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

      const normalizedQuestions = (qList as Question[]).map(normalizeQuestionIlgiliBirim);
      const sheetSyncUpdates = collectSheetPageSyncUpdates(
        normalizedQuestions.filter((q) => !isDraftQuestionId(q.id)),
        pages,
      );

      if (sheetSyncUpdates.length > 0) {
        const audit = questionAuditFields();
        for (const update of sheetSyncUpdates) {
          await DB.updateDoc(DB.doc(DB.db, "questions", update.id), {
            pageId: update.pageId,
            ...audit,
          });
        }
      }

      const syncedQuestions =
        sheetSyncUpdates.length === 0
          ? normalizedQuestions
          : normalizedQuestions.map((q) => {
              const update = sheetSyncUpdates.find((item) => item.id === q.id);
              return update ? { ...q, pageId: update.pageId } : q;
            });

      setQuestions(syncedQuestions);
      setExplorerRowDrafts({});
      setTemplatePages(pages);
    } catch (error) {
      console.error("Failed to load template questions/pages:", error);
    }
  }

  const handleUpdatePageTitle = async (pageId: string) => {
    if (!editingPageTitle.trim()) {
      setEditingPageId(null);
      return;
    }
    try {
      await DB.updateDoc(DB.doc(DB.db, "templatePages", pageId), {
        title: editingPageTitle,
      });
      if (user) {
        await logActivity(
          user,
          "update",
          "templatePages",
          pageId,
          `Renamed template page to "${editingPageTitle}"`,
        );
      }
      setTemplatePages((prev) =>
        prev.map((p) =>
          p.id === pageId ? { ...p, title: editingPageTitle } : p,
        ),
      );
      setEditingPageId(null);
    } catch (error) {
      console.error("Failed to update page title:", error);
    }
  };

  const handleUpdateTemplateName = async (tId: string) => {
    if (!editingTemplateName.trim()) {
      setEditingTemplateId(null);
      return;
    }
    try {
      await DB.updateDoc(DB.doc(DB.db, "templates", tId), {
        name: editingTemplateName,
      });
      if (user) {
        await logActivity(
          user,
          "update",
          "templates",
          tId,
          `Renamed reporting template to "${editingTemplateName}"`,
        );
      }
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === tId ? { ...t, name: editingTemplateName } : t,
        ),
      );
      if (selectedTemplate?.id === tId) {
        setSelectedTemplate({ ...selectedTemplate, name: editingTemplateName });
      }
      setEditingTemplateId(null);
    } catch (error) {
      console.error("Failed to update template name:", error);
    }
  };

  const handleUpdatePageKind = async (pageId: string, pageKind: TemplatePageKind) => {
    try {
      await DB.updateDoc(DB.doc(DB.db, "templatePages", pageId), { pageKind });
      setTemplatePages((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, pageKind } : p)),
      );
    } catch (error) {
      console.error("Failed to update page type:", error);
    }
  };

  const handleUpdatePageBrief = async (pageId: string) => {
    try {
      await DB.updateDoc(DB.doc(DB.db, "templatePages", pageId), {
        briefText: editingBriefText,
      });
      setTemplatePages((prev) =>
        prev.map((p) =>
          p.id === pageId ? { ...p, briefText: editingBriefText } : p,
        ),
      );
      setEditingBriefId(null);
    } catch (error) {
      console.error("Failed to update page brief:", error);
    }
  };

  const handleCreatePage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const pageKind = (formData.get("pageKind") as TemplatePageKind) || newPageKind;
    if (!title) return;

    setIsSubmitting(true);
    try {
      const res = await DB.addDoc(DB.collection(DB.db, "templatePages"), {
        templateId: selectedTemplate.id,
        title,
        order: templatePages.length + 1,
        briefText: "",
        pageKind,
      });
      if (user) {
        await logActivity(
          user,
          "create",
          "templatePages",
          res.id,
          `Created template page "${title}" in template ${selectedTemplate.name}`,
        );
      }
      setShowAddPage(false);
      setNewPageKind("customer_question_set");
      await loadTemplateQuestions(selectedTemplate.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePage = (pageId: string, pageTitle: string) => {
    setPageToDelete({ id: pageId, title: pageTitle });
    setShowDeletePageConfirm(true);
  };

  const executeDeletePage = async () => {
    if (!selectedTemplate || !pageToDelete) return;

    setIsSubmitting(true);
    try {
      // 1. Delete linked questions
      const linkedQuestions = (questions || []).filter(
        (q) => q.pageId === pageToDelete.id,
      );
      if (linkedQuestions.length > 0) {
        const batchSize = 450;
        for (let i = 0; i < linkedQuestions.length; i += batchSize) {
          const batch = DB.writeBatch(DB.db);
          linkedQuestions.slice(i, i + batchSize).forEach((q) => {
            batch.delete(DB.doc(DB.db, "questions", q.id));
          });
          await batch.commit();
        }
      }

      // 2. Delete the page document
      await DB.deleteDoc(DB.doc(DB.db, "templatePages", pageToDelete.id));

      if (user) {
        await logActivity(
          user,
          "delete",
          "templatePages",
          pageToDelete.id,
          `Deleted template page "${pageToDelete.title}" and ${linkedQuestions.length} linked questions from template ${selectedTemplate.name}`,
        );
      }

      await loadTemplateQuestions(selectedTemplate.id);
      setShowDeletePageConfirm(false);
      setPageToDelete(null);
    } catch (error) {
      console.error("Failed to delete page:", error);
      alert("Failed to delete page.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignPage = async (questionId: string, pageId: string) => {
    try {
      const q = questions.find((x) => x.id === questionId);
      if (!q) return;
      const audit = questionAuditFields();
      const nextPageId = pageId || undefined;
      const kayit = buildKayitForQuestionChange(q, { pageId: nextPageId });
      if (isDraftQuestionId(questionId)) {
        setQuestions((prev) =>
          prev.map((row) =>
            row.id === questionId
              ? { ...row, pageId: nextPageId, ...audit, kayit }
              : row,
          ),
        );
        return;
      }
      await DB.updateDoc(DB.doc(DB.db, "questions", questionId), {
        pageId: nextPageId,
        ...audit,
        ...(kayit !== undefined ? { kayit } : {}),
      });
      setQuestions((prev) =>
        prev.map((row) =>
          row.id === questionId
            ? { ...row, pageId: nextPageId, ...audit, kayit }
            : row,
        ),
      );
    } catch (error) {
      console.error("Failed to assign page:", error);
    }
  };

  const handleSoruCogaltmaChange = async (
    questionId: string,
    mode: QuestionSoruCogaltma,
  ) => {
    try {
      const audit = questionAuditFields();
      if (isDraftQuestionId(questionId)) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId ? { ...q, soruCogaltma: mode, ...audit } : q,
          ),
        );
        return;
      }
      await DB.updateDoc(DB.doc(DB.db, "questions", questionId), {
        soruCogaltma: mode,
        ...audit,
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, soruCogaltma: mode, ...audit } : q,
        ),
      );
    } catch (error) {
      console.error("Failed to update soru cogaltma:", error);
    }
  };

  const handleAnswerFormatChange = async (
    questionId: string,
    fmt: QuestionAnswerFormat,
  ) => {
    try {
      const audit = questionAuditFields();
      if (isDraftQuestionId(questionId)) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId ? { ...q, answerFormat: fmt, ...audit } : q,
          ),
        );
        return;
      }
      await DB.updateDoc(DB.doc(DB.db, "questions", questionId), {
        answerFormat: fmt,
        ...audit,
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId ? { ...q, answerFormat: fmt, ...audit } : q,
        ),
      );
    } catch (error) {
      console.error("Failed to update answer format:", error);
    }
  };

  const handleUpdateQuestionText = async (qId: string) => {
    if (!editingQuestionText.trim()) {
      if (isDraftQuestionId(qId)) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === qId ? { ...q, soru: "" } : q)),
        );
      }
      setEditingQuestionId(null);
      return;
    }
    try {
      const audit = questionAuditFields();
      if (isDraftQuestionId(qId)) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === qId ? { ...q, soru: editingQuestionText, ...audit } : q,
          ),
        );
        setEditingQuestionId(null);
        return;
      }
      await DB.updateDoc(DB.doc(DB.db, "questions", qId), {
        soru: editingQuestionText,
        ...audit,
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === qId ? { ...q, soru: editingQuestionText, ...audit } : q,
        ),
      );
      setEditingQuestionId(null);
    } catch (error) {
      console.error("Failed to update question:", error);
    }
  };

  const handleUpdateKodText = async (qId: string) => {
    if (!editingKodText.trim()) {
      if (isDraftQuestionId(qId)) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === qId ? { ...q, kod: "" } : q)),
        );
      }
      setEditingKodId(null);
      return;
    }
    try {
      const audit = questionAuditFields();
      if (isDraftQuestionId(qId)) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === qId ? { ...q, kod: editingKodText, ...audit } : q,
          ),
        );
        setEditingKodId(null);
        return;
      }
      await DB.updateDoc(DB.doc(DB.db, "questions", qId), {
        kod: editingKodText,
        ...audit,
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === qId ? { ...q, kod: editingKodText, ...audit } : q,
        ),
      );
      setEditingKodId(null);
    } catch (error) {
      console.error("Failed to update kod:", error);
    }
  };

  const handleUpdateBaslikText = async (qId: string) => {
    if (!editingBaslikText.trim()) {
      if (isDraftQuestionId(qId)) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === qId ? { ...q, baslik: "" } : q)),
        );
      }
      setEditingBaslikId(null);
      return;
    }
    try {
      const audit = questionAuditFields();
      if (isDraftQuestionId(qId)) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === qId ? { ...q, baslik: editingBaslikText, ...audit } : q,
          ),
        );
        setEditingBaslikId(null);
        return;
      }
      await DB.updateDoc(DB.doc(DB.db, "questions", qId), {
        baslik: editingBaslikText,
        ...audit,
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === qId ? { ...q, baslik: editingBaslikText, ...audit } : q,
        ),
      );
      setEditingBaslikId(null);
    } catch (error) {
      console.error("Failed to update baslik:", error);
    }
  };

  const handleUpdateAciklamaVideoUrl = async (qId: string, value: string) => {
    const trimmed = value.trim();
    const current = questions.find((q) => q.id === qId);
    if (!current || (current.aciklamaVideoUrl || "").trim() === trimmed) return;
    try {
      const audit = questionAuditFields();
      if (isDraftQuestionId(qId)) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === qId ? { ...q, aciklamaVideoUrl: trimmed, ...audit } : q,
          ),
        );
        return;
      }
      await DB.updateDoc(DB.doc(DB.db, "questions", qId), {
        aciklamaVideoUrl: trimmed,
        ...audit,
      });
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === qId ? { ...q, aciklamaVideoUrl: trimmed, ...audit } : q,
        ),
      );
    } catch (error) {
      console.error("Failed to update aciklama video URL:", error);
    }
  };

  const getExplorerRowFields = (q: Question): QuestionExplorerRowFields =>
    explorerRowDrafts[q.id] ?? questionExplorerRowFields(q);

  const getExplorerRowFieldsRef = useRef(getExplorerRowFields);
  getExplorerRowFieldsRef.current = getExplorerRowFields;

  const getExplorerGridFieldValue = useCallback(
    (q: Question, field: TemplateQuestionGridFieldId) =>
      getExplorerRowFieldsRef.current(q)[field] ?? "",
    [],
  );

  const resolveExplorerRowFields = (q: Question): QuestionExplorerRowFields => {
    let fields = getExplorerRowFields(q);
    if (editingBolumId === q.id) fields = { ...fields, bolum: editingBolumText };
    if (editingKodId === q.id) fields = { ...fields, kod: editingKodText };
    if (editingBaslikId === q.id)
      fields = { ...fields, baslik: editingBaslikText };
    if (editingQuestionId === q.id)
      fields = { ...fields, soru: editingQuestionText };
    if (editingFirmaYanitiId === q.id)
      fields = { ...fields, firmaYaniti: editingFirmaYanitiText };
    return fields;
  };

  const isExplorerRowDirty = (q: Question) => {
    const current = normalizeExplorerRowFields(resolveExplorerRowFields(q));
    const saved = normalizeExplorerRowFields(questionExplorerRowFields(q));
    return !explorerRowFieldsEqual(current, saved);
  };

  const ensureExplorerRowDraft = (q: Question) => {
    setExplorerRowDrafts((prev) => {
      if (prev[q.id]) return prev;
      return { ...prev, [q.id]: questionExplorerRowFields(q) };
    });
  };

  const patchExplorerRowDraft = (
    q: Question,
    patch: Partial<QuestionExplorerRowFields>,
  ) => {
    setExplorerRowDrafts((prev) => ({
      ...prev,
      [q.id]: { ...(prev[q.id] ?? questionExplorerRowFields(q)), ...patch },
    }));
  };

  const clearExplorerRowDraft = (qId: string) => {
    setExplorerRowDrafts((prev) => {
      if (!prev[qId]) return prev;
      const next = { ...prev };
      delete next[qId];
      return next;
    });
    if (editingBolumId === qId) setEditingBolumId(null);
    if (editingKodId === qId) setEditingKodId(null);
    if (editingBaslikId === qId) setEditingBaslikId(null);
    if (editingQuestionId === qId) setEditingQuestionId(null);
    if (editingFirmaYanitiId === qId) setEditingFirmaYanitiId(null);
  };

  const handleSaveExplorerRow = async (qId: string) => {
    const q = questions.find((x) => x.id === qId);
    if (!q) return;

    const fields = normalizeExplorerRowFields(resolveExplorerRowFields(q));
    const saved = normalizeExplorerRowFields(questionExplorerRowFields(q));
    if (explorerRowFieldsEqual(fields, saved)) return;

    const audit = questionAuditFields();
    const fieldPayload = {
      kod: fields.kod || q.kod?.trim() || "N/A",
      baslik: fields.baslik || q.baslik?.trim() || "-",
      soru: fields.soru || q.soru?.trim() || " ",
      bolum: fields.bolum,
      firmaYaniti: fields.firmaYaniti,
      firmaYanitiYil1: fields.firmaYanitiYil1,
      firmaYanitiYil2: fields.firmaYanitiYil2,
      firmaYanitiYil3: fields.firmaYanitiYil3,
      firmaNot: fields.firmaNot,
      ...ilgiliBirimMongoPayload(fields.ilgiliBirum),
      veriDogrulugu: fields.veriDogrulugu,
      aciklama: fields.aciklama,
      aciklamaVideoUrl: fields.aciklamaVideoUrl,
      answerFormat: fields.answerFormat,
      soruCogaltma: fields.soruCogaltma,
      ornekYanit: fields.ornekYanit,
      dayanak: fields.dayanak,
      onay: fields.onay,
      raporYeri: fields.raporYeri,
      reportingItr: fields.reportingItr,
      tsrs1: fields.tsrs1,
      tsrs2: fields.tsrs2,
      sasbRtCh: fields.sasbRtCh,
      gri: fields.gri,
      msci: fields.msci,
      esrs: fields.esrs,
    };
    const kayit = buildKayitForQuestionChange(q, fieldPayload);
    const payload = {
      ...fieldPayload,
      ...audit,
      ...(kayit !== undefined ? { kayit } : {}),
    };

    if (isDraftQuestionId(qId)) {
      setQuestions((prev) =>
        prev.map((x) =>
          x.id === qId
            ? normalizeQuestionIlgiliBirim({
                ...x,
                ...payload,
                ilgiliBirum: fields.ilgiliBirum,
              })
            : x,
        ),
      );
      clearExplorerRowDraft(qId);
      return;
    }

    setSavingExplorerRowId(qId);
    try {
      await DB.questions.update(qId, payload);
      setQuestions((prev) =>
        prev.map((x) =>
          x.id === qId
            ? normalizeQuestionIlgiliBirim({
                ...x,
                ...payload,
                ilgiliBirum: fields.ilgiliBirum,
              })
            : x,
        ),
      );
      clearExplorerRowDraft(qId);
    } catch (error) {
      console.error("Failed to save question row:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : t.common.errorOccurred;
      alert(message);
    } finally {
      setSavingExplorerRowId(null);
    }
  };

  const saveExplorerMarkdownField = async (
    snap?: {
      questionId: string;
      field: ExplorerMarkdownField;
      draft: string;
    } | null,
  ) => {
    const modal = snap ?? explorerMdModal;
    if (!modal) return;
    const { questionId, field, draft } = modal;
    const q = questions.find((x) => x.id === questionId);
    if (!q) return;
    const patchFields: Partial<QuestionExplorerRowFields> =
      field === "soru"
        ? { soru: draft }
        : { [field]: draft };
    ensureExplorerRowDraft(q);
    patchExplorerRowDraft(q, patchFields);
    if (field === "soru" && editingQuestionId === questionId) {
      setEditingQuestionText(draft);
    }
    setExplorerMdModal(null);
  };

  const handleToggleDomain = async (questionId: string, domainId: string, currentDomainIds: string[] = []) => {
    let newDomainIds: string[];
    if (currentDomainIds.includes(domainId)) {
      newDomainIds = currentDomainIds.filter(id => id !== domainId);
    } else {
      newDomainIds = [...currentDomainIds, domainId];
    }
    
    try {
      const audit = questionAuditFields();
      if (isDraftQuestionId(questionId)) {
        setQuestions((prev) =>
          prev.map((q) =>
            q.id === questionId ? { ...q, domainIds: newDomainIds, ...audit } : q,
          ),
        );
        return;
      }
      await DB.updateDoc(DB.doc(DB.db, "questions", questionId), {
        domainIds: newDomainIds,
        ...audit,
      });
      setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, domainIds: newDomainIds, ...audit } : q));
    } catch (error) {
      console.error("Failed to update domainIds:", error);
    }
  };

  const handleSaveDraftQuestion = async (draftId: string) => {
    const q = questions.find((x) => x.id === draftId);
    if (!q || !isDraftQuestionId(draftId) || !selectedTemplate) return;
    if (!q.kod?.trim() && !q.soru?.trim()) {
      alert(t.templates.saveDraftQuestionValidation);
      return;
    }
    setSavingDraftId(draftId);
    try {
      const audit = questionAuditFields();
      const kod = q.kod?.trim() || "N/A";
      const payload: Record<string, unknown> = {
        templateId: selectedTemplate.id,
        sectorId: sector?.id ?? sectorId,
        kod,
        baslik: q.baslik?.trim() ?? "",
        soru: q.soru?.trim() || " ",
        ...ilgiliBirimMongoPayload(readQuestionIlgiliBirim(q)),
        aciklama: q.aciklama?.trim() ?? "",
        aciklamaVideoUrl: q.aciklamaVideoUrl?.trim() ?? "",
        ornekYanit: q.ornekYanit?.trim() ?? "",
        raporYeri: q.raporYeri?.trim() ?? "",
        thematicGroup: q.thematicGroup?.trim() ?? "",
        isMandatory: q.isMandatory ?? false,
        order: q.order ?? 0,
        pageId: q.pageId || undefined,
        domainIds: q.domainIds ?? [],
        answerFormat: q.answerFormat ?? "textarea",
        soruCogaltma: normalizeQuestionSoruCogaltma(q.soruCogaltma),
        ...audit,
      };
      const created = await DB.addDoc(
        DB.collection(DB.db, "questions"),
        payload,
      );
      const newId = (created as { id: string }).id;
      setQuestions((prev) =>
        prev.map((x) => (x.id === draftId ? { ...q, id: newId, ...audit } : x)),
      );
      if (user) {
        await logActivity(
          user,
          "create",
          "questions",
          newId,
          `Added question ${kod} to template ${selectedTemplate.name}`,
        );
      }
    } catch (error) {
      console.error("Failed to save new question:", error);
      alert(t.common.errorOccurred);
    } finally {
      setSavingDraftId(null);
    }
  };

  const handleAutoMapClause = async (q: Question) => {
    if (isDraftQuestionId(q.id)) return;
    if (!q.domainIds || q.domainIds.length === 0) {
      alert("Please assign at least one domain to this question first.");
      return;
    }
    
    setIsMappingQuestionId(q.id);
    try {
      const mappedDomainNames = domains
        .filter(d => (q.domainIds || []).includes(d.id))
        .map(d => d.name);
        
      const result = await mapDomainClauseAndEnhance(q, mappedDomainNames);
      if (result && result.clause) {
        const updates: Record<string, string> = {
          ...ilgiliBirimMongoPayload(result.clause),
        };
        if (result.description && (!q.aciklama || q.aciklama.trim() === "")) {
          updates.aciklama = result.description;
        }
        if (result.example && (!q.ornekYanit || q.ornekYanit.trim() === "")) {
          updates.ornekYanit = result.example;
        }
        const audit = questionAuditFields();
        Object.assign(updates, audit);

        const applyMappingUpdates = (item: Question): Question =>
          item.id === q.id
            ? normalizeQuestionIlgiliBirim({
                ...item,
                ...updates,
                ilgiliBirum: result.clause,
              })
            : item;

        if (isDraftQuestionId(q.id)) {
          setQuestions((prev) => prev.map(applyMappingUpdates));
        } else {
          await DB.updateDoc(DB.doc(DB.db, "questions", q.id), updates);
          setQuestions((prev) => prev.map(applyMappingUpdates));
        }

        if (user) {
          await logActivity(
            user,
            "update",
            "questions",
            q.id,
            `AI Auto-mapped domain clause to "${result.clause}"${result.description ? " and updated description" : ""}${result.example ? " and updated example" : ""} for question ${q.kod}`
          );
        }
      }
    } catch (error) {
      console.error("Auto-mapping failed:", error);
      alert("AI mapping failed. Please try again.");
    } finally {
      setIsMappingQuestionId(null);
    }
  };

  const handleBulkAutoMapClauses = async () => {
    if (filteredQuestions.length === 0) {
      alert("No questions to map.");
      return;
    }
    if (!confirm("Are you sure you want to AI-map clauses for ALL filtered questions? This might take a while.")) {
      return;
    }

    setIsMappingQuestionId("bulk");
    setShowBulkAutoMappingModal(true);
    setBulkMappingStatus({ current: 0, total: filteredQuestions.length });
    let count = 0;
    for (let i = 0; i < filteredQuestions.length; i++) {
      const q = filteredQuestions[i];
      setBulkMappingStatus({ current: i + 1, total: filteredQuestions.length });
      if (q.domainIds && q.domainIds.length > 0) {
        try {
          const mappedDomainNames = domains
            .filter(d => (q.domainIds || []).includes(d.id))
            .map(d => d.name);
          
          const result = await mapDomainClauseAndEnhance(q, mappedDomainNames);
          if (result && result.clause) {
            const updates: Record<string, string> = {
              ...ilgiliBirimMongoPayload(result.clause),
            };
            if (result.description && (!q.aciklama || q.aciklama.trim() === "")) {
              updates.aciklama = result.description;
            }
            if (result.example && (!q.ornekYanit || q.ornekYanit.trim() === "")) {
              updates.ornekYanit = result.example;
            }
            const audit = questionAuditFields();
            Object.assign(updates, audit);

            await DB.updateDoc(DB.doc(DB.db, "questions", q.id), updates);
            setQuestions((prev) =>
              prev.map((item) =>
                item.id === q.id
                  ? normalizeQuestionIlgiliBirim({
                      ...item,
                      ...updates,
                      ilgiliBirum: result.clause,
                    })
                  : item,
              ),
            );
            count++;
          }
        } catch (error) {
          console.error(`Mapping failed for ${q.kod}:`, error);
        }
      }
    }
    alert(`Auto-mapped ${count} questions.`);
    setShowBulkAutoMappingModal(false);
    setIsMappingQuestionId(null);
  };

  const handleApplyBulkSourceSheetsToPage = async () => {
    if (
      !selectedTemplate ||
      !bulkSourcePageId ||
      bulkSourceGroupKeys.length === 0
    )
      return;
    const groupSet = new Set(bulkSourceGroupKeys);
    const qs = (questions || []).filter((q) => groupSet.has(q.thematicGroup));
    if (qs.length === 0) return;

    setBulkAssigning("source");
    setIsSubmitting(true);
    const audit = questionAuditFields();
    try {
      for (const q of qs) {
        await DB.updateDoc(DB.doc(DB.db, "questions", q.id), {
          pageId: bulkSourcePageId,
          ...audit,
        });
      }
      await loadTemplateQuestions(selectedTemplate.id);
      setBulkSourceGroupKeys([]);
    } finally {
      setIsSubmitting(false);
      setBulkAssigning(null);
    }
  };

  const handleApplyBulkFieldLabelsToPage = async () => {
    if (!selectedTemplate || !bulkLabelPageId || bulkLabelKeys.length === 0)
      return;
    const keySet = new Set(bulkLabelKeys);
    const qs = (questions || []).filter((q) => {
      const raw = (q.baslik ?? "").trim();
      const k = raw === "" ? FIELD_LABEL_EMPTY_KEY : raw;
      return keySet.has(k);
    });
    if (qs.length === 0) return;

    setBulkAssigning("label");
    setIsSubmitting(true);
    const audit = questionAuditFields();
    try {
      for (const q of qs) {
        await DB.updateDoc(DB.doc(DB.db, "questions", q.id), {
          pageId: bulkLabelPageId,
          ...audit,
        });
      }
      await loadTemplateQuestions(selectedTemplate.id);
      setBulkLabelKeys([]);
    } finally {
      setIsSubmitting(false);
      setBulkAssigning(null);
    }
  };

  const handleAutoNumberQuestions = async () => {
    if (!selectedTemplate || questions.length === 0) {
      alert("No questions found in this template to auto-number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const batch = DB.writeBatch(DB.db);
      
      // 1. Get sorted pages from the template
      const sortedPages = [...templatePages].sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // 2. Group questions by page
      const questionsByPage: Record<string, Question[]> = {};
      questions.forEach(q => {
        const pId = q.pageId || 'unassigned';
        if (!questionsByPage[pId]) questionsByPage[pId] = [];
        questionsByPage[pId].push(q);
      });

      let totalUpdated = 0;

      // 3. Iterate through pages to number hierarchically
      sortedPages.forEach((page, pageIdx) => {
        const pageQuestions = questionsByPage[page.id] || [];
        // Sort questions on this page by their current order
        pageQuestions.sort((a, b) => (a.order || 0) - (b.order || 0));

        // 4. Identify thematic groups on this page in the order they first appear
        const pageGroups: string[] = [];
        pageQuestions.forEach(q => {
          const group = q.thematicGroup || "General";
          if (!pageGroups.includes(group)) {
            pageGroups.push(group);
          }
        });

        // 5. Counter for questions within each group on this page
        const groupCounters: Record<string, number> = {};
        pageGroups.forEach(g => { groupCounters[g] = 0; });

        // 6. Generate and update tripartite codes: Page-Group-Question
        pageQuestions.forEach(q => {
          const group = q.thematicGroup || "General";
          const groupIdx = pageGroups.indexOf(group);
          groupCounters[group] += 1;
          
          // Determine X (Page) and Y (Group) by trying to preserve first/second blocks from existing KOD if available
          let xValue = (pageIdx + 1).toString();
          let yValue = (groupIdx + 1).toString();

          // Try to find the first question in THIS GROUP that has any existing code to extract prefix
          const groupQuestionsWithCodes = pageQuestions.filter(pq => pq.thematicGroup === group && pq.kod);
          if (groupQuestionsWithCodes.length > 0) {
            const firstKod = groupQuestionsWithCodes[0].kod;
            const parts = firstKod.split('-').map(p => p.trim()).filter(Boolean);
            if (parts.length >= 1) xValue = parts[0];
            if (parts.length >= 2) yValue = parts[1];
          } else {
            // Fallback to page-wide search for X if group has no codes
            const pageQuestionsWithCodes = pageQuestions.filter(pq => pq.kod);
            if (pageQuestionsWithCodes.length > 0) {
              const firstPageKod = pageQuestionsWithCodes[0].kod;
              const parts = firstPageKod.split('-').map(p => p.trim()).filter(Boolean);
              if (parts.length >= 1) xValue = parts[0];
            }
          }

          const z = groupCounters[group];
          const newCode = `${xValue}-${yValue}-${z}`;
          const qRef = DB.doc(DB.db, "questions", q.id);
          const audit = questionAuditFields();
          
          // Only update kod as requested
          batch.update(qRef, { 
            kod: newCode,
            ...audit,
          });
          totalUpdated++;
        });
      });

      // Handle unassigned questions if any (using page 0 as prefix)
      const unassigned = questionsByPage['unassigned'] || [];
      if (unassigned.length > 0) {
        unassigned.sort((a, b) => (a.order || 0) - (b.order || 0));
        unassigned.forEach((q, idx) => {
          const newCode = `0-0-${idx + 1}`;
          const qRef = DB.doc(DB.db, "questions", q.id);
          const audit = questionAuditFields();
          batch.update(qRef, { kod: newCode, ...audit });
          totalUpdated++;
        });
      }

      await batch.commit();
      if (user) {
        await logActivity(
          user,
          "update",
          "questions",
          selectedTemplate.id,
          `Auto-numbered ${totalUpdated} questions with hierarchical X-Y-Z ruling in template ${selectedTemplate.name}`,
        );
      }

      setShowAutoNumberConfirm(false);
      await loadTemplateQuestions(selectedTemplate.id);
      alert(`Successfully auto-numbered ${totalUpdated} questions.`);
    } catch (error: any) {
      console.error("Failed to auto-number questions:", error);
      alert(
        "Failed to auto-number questions. " +
          (error.message || "Unknown error"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkUpdateDomains = async () => {
    if (!selectedTemplate || filteredQuestions.length === 0) return;

    setIsSubmitting(true);
    try {
      const audit = questionAuditFields();
      const CHUNK_SIZE = 450;
      const questionChunks = [];
      for (let i = 0; i < filteredQuestions.length; i += CHUNK_SIZE) {
        questionChunks.push(filteredQuestions.slice(i, i + CHUNK_SIZE));
      }

      for (const chunk of questionChunks) {
        const batch = DB.writeBatch(DB.db);
        chunk.forEach((q) => {
          const qRef = DB.doc(DB.db, "questions", q.id);
          batch.update(qRef, { domainIds: selectedBulkDomainIds, ...audit });
        });
        await batch.commit();
      }

      if (user) {
        await logActivity(
          user,
          "update",
          "questions",
          selectedTemplate.id,
          `Bulk updated domains for ${filteredQuestions.length} questions in template ${selectedTemplate.name}`,
        );
      }

      setQuestions((prev) =>
        prev.map((q) => {
          if (filteredQuestions.some((fq) => fq.id === q.id)) {
            return { ...q, domainIds: selectedBulkDomainIds, ...audit };
          }
          return q;
        }),
      );

      setIsBulkUpdateModalOpen(false);
      alert(`Successfully updated ${filteredQuestions.length} questions.`);
    } catch (error) {
      console.error("Failed bulk update:", error);
      alert("Failed to bulk update questions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuestion = (qId: string, qKod: string) => {
    if (isDraftQuestionId(qId)) {
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
      setSelectedQuestionIds((prev) => {
        const next = new Set(prev);
        next.delete(qId);
        return next;
      });
      return;
    }
    setQuestionToDelete({ id: qId, kod: qKod });
    setShowDeleteQuestionConfirm(true);
  };

  const executeDeleteQuestion = async () => {
    if (!questionToDelete) return;

    if (isDraftQuestionId(questionToDelete.id)) {
      setQuestions((prev) =>
        prev.filter((q) => q.id !== questionToDelete!.id),
      );
      setShowDeleteQuestionConfirm(false);
      setQuestionToDelete(null);
      return;
    }

    setIsSubmitting(true);
    try {
      await DB.deleteDoc(DB.doc(DB.db, "questions", questionToDelete.id));
      if (user) {
        await logActivity(user, 'delete', 'questions', questionToDelete.id, `Deleted single question: ${questionToDelete.kod}`);
      }
      setShowDeleteQuestionConfirm(false);
      setQuestionToDelete(null);
      await loadTemplateQuestions(selectedTemplate!.id);
    } catch (error) {
      console.error("Error deleting question:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAllQuestions = () => {
    if (!selectedTemplate || questions.length === 0) return;
    setShowDeleteAllConfirm(true);
  };

  const executeDeleteAll = async () => {
    if (!selectedTemplate || questions.length === 0) return;
    setShowDeleteAllConfirm(false);
    setIsSubmitting(true);
    try {
      // Process in chunks if more than 500 questions
      const questionChunks = [];
      const CHUNK_SIZE = 450;
      for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
        questionChunks.push(questions.slice(i, i + CHUNK_SIZE));
      }

      for (const chunk of questionChunks) {
        const b = DB.writeBatch(DB.db);
        chunk.forEach((q) => {
          b.delete(DB.doc(DB.db, "questions", q.id));
        });
        await b.commit();
      }

      if (user) {
        await logActivity(
          user,
          "delete",
          "questions",
          selectedTemplate.id,
          `Deleted all ${questions.length} questions from template "${selectedTemplate.name}"`,
        );
      }
      await loadTemplateQuestions(selectedTemplate.id);
      setSelectedQuestionIds(new Set());
    } catch (error) {
      console.error("Error deleting all questions:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = () => {
    if (!selectedTemplate || selectedQuestionIds.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const executeBulkDelete = async () => {
    if (!selectedTemplate || selectedQuestionIds.size === 0) return;
    
    setShowBulkDeleteConfirm(false);
    setIsSubmitting(true);
    try {
      const selectedIds = Array.from(selectedQuestionIds);
      const draftIds = new Set(selectedIds.filter(isDraftQuestionId));
      const serverIds = selectedIds.filter((id) => !isDraftQuestionId(id));

      if (draftIds.size > 0) {
        setQuestions((prev) => prev.filter((q) => !draftIds.has(q.id)));
      }

      const CHUNK_SIZE = 450;
      for (let i = 0; i < serverIds.length; i += CHUNK_SIZE) {
        const chunk = serverIds.slice(i, i + CHUNK_SIZE);
        const b = DB.writeBatch(DB.db);
        chunk.forEach((id) => {
          b.delete(DB.doc(DB.db, "questions", id));
        });
        await b.commit();
      }

      if (user && serverIds.length > 0) {
        await logActivity(
          user,
          "delete",
          "questions",
          selectedTemplate.id,
          `Bulk deleted ${serverIds.length} questions from template "${selectedTemplate.name}"`,
        );
      }
      if (serverIds.length > 0) {
        await loadTemplateQuestions(selectedTemplate.id);
      }
      setSelectedQuestionIds(new Set());
    } catch (error) {
      console.error("Error bulk deleting questions:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAllSelection = () => {
    if (selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const toggleQuestionSelection = (id: string) => {
    const next = new Set(selectedQuestionIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedQuestionIds(next);
  };

  const openQuestionDetail = useCallback((q: Question) => {
    setDetailSheetQuestion(q);
    setDetailSheetOpen(true);
  }, []);

  useEffect(() => {
    if (!detailSheetQuestion) return;
    const fresh = questions.find((q) => q.id === detailSheetQuestion.id);
    if (fresh && fresh !== detailSheetQuestion) {
      setDetailSheetQuestion(fresh);
    }
  }, [questions, detailSheetQuestion]);

  useEffect(() => {
    setSelectedBaslikKeys([]);
    setFieldLabelChipOrderMode("label");
    setQuestionExplorerPage(1);
    setExplorerPageIdFilter("");
    setDetailSheetOpen(false);
    setDetailSheetQuestion(null);
  }, [selectedTemplate?.id]);

  const baslikFilterDep = useMemo(
    () => [...selectedBaslikKeys].sort().join("\u001e"),
    [selectedBaslikKeys],
  );

  useEffect(() => {
    setQuestionExplorerPage(1);
    setSelectedQuestionIds((prev) => (prev.size === 0 ? prev : new Set()));
    setDetailSheetOpen(false);
    setDetailSheetQuestion(null);
  }, [
    searchTerm,
    questionExplorerPageSize,
    baslikFilterDep,
    explorerPageIdFilter,
    explorerAssignmentFilter,
  ]);

  const handleExplorerSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedQuestionIds((prev) => (selectionSetsEqual(prev, ids) ? prev : ids));
  }, []);

  /** Search + assignment + report page only (no field-label pills) — drives pill list + row filter base. */
  const questionsMatchingExplorerFilters = useMemo(() => {
    const st = searchTerm.trim().toLowerCase();
    const searchPass = (q: Question) => {
      if (!st) return true;
      const haystacks = [
        q.kod,
        q.soru,
        q.thematicGroup,
        q.baslik,
        q.id,
        q.legacyFirebaseId,
      ];
      return haystacks.some((value) =>
        (value || "").toLowerCase().includes(st),
      );
    };

    const assignmentPass = (q: Question) => {
      const hasPage = Boolean(
        resolveQuestionTemplatePageId(q, templatePages),
      );
      if (explorerAssignmentFilter === "assigned") return hasPage;
      if (explorerAssignmentFilter === "unassigned") return !hasPage;
      return true;
    };

    const pagePass = (q: Question) =>
      questionMatchesTemplatePageFilter(q, explorerPageIdFilter, templatePages);

    return questions.filter(
      (q) => searchPass(q) && assignmentPass(q) && pagePass(q),
    );
  }, [
    questions,
    searchTerm,
    explorerAssignmentFilter,
    explorerPageIdFilter,
    templatePages,
  ]);

  useEffect(() => {
    const valid = new Set(
      questionsMatchingExplorerFilters.map((q) => {
        const raw = (q.baslik ?? "").trim();
        return raw === "" ? FIELD_LABEL_EMPTY_KEY : raw;
      }),
    );
    setSelectedBaslikKeys((prev) => {
      const next = prev.filter((k) => valid.has(k));
      if (next.length === prev.length && next.every((k, i) => k === prev[i])) {
        return prev;
      }
      return next;
    });
  }, [questionsMatchingExplorerFilters]);

  const baslikChipOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const q of questionsMatchingExplorerFilters) {
      const raw = (q.baslik ?? "").trim();
      const key = raw === "" ? FIELD_LABEL_EMPTY_KEY : raw;
      const label = raw === "" ? t.templates.fieldLabelUntagged : raw;
      if (!map.has(key)) map.set(key, label);
    }
    const entries = [...map.entries()];
    if (fieldLabelChipOrderMode === "label") {
      return entries.sort((a, b) =>
        a[1].localeCompare(b[1], undefined, { sensitivity: "base" }),
      );
    }
    const kodRankForKey = (key: string) => {
      const kods = questionsMatchingExplorerFilters
        .filter((q) => {
          const raw = (q.baslik ?? "").trim();
          const k = raw === "" ? FIELD_LABEL_EMPTY_KEY : raw;
          return k === key;
        })
        .map((q) => (q.kod || "").trim())
        .filter(
          (k) =>
            k &&
            !["N/A", "n/a", "N/a", "n/A"].includes(k),
        );
      if (kods.length === 0) return "\uFFFF";
      return kods.reduce((best, cur) =>
        best.localeCompare(cur, undefined, {
          numeric: true,
          sensitivity: "base",
        }) <= 0
          ? best
          : cur,
      );
    };
    return entries.sort((a, b) => {
      const cmp = kodRankForKey(a[0]).localeCompare(
        kodRankForKey(b[0]),
        undefined,
        { numeric: true, sensitivity: "base" },
      );
      if (cmp !== 0) return cmp;
      return a[1].localeCompare(b[1], undefined, { sensitivity: "base" });
    });
  }, [questionsMatchingExplorerFilters, t, fieldLabelChipOrderMode]);

  const bulkLabelChipOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const q of questions) {
      const raw = (q.baslik ?? "").trim();
      const key = raw === "" ? FIELD_LABEL_EMPTY_KEY : raw;
      const label = raw === "" ? t.templates.fieldLabelUntagged : raw;
      if (!map.has(key)) map.set(key, label);
    }
    const entries = [...map.entries()];
    if (bulkFieldLabelOrderMode === "label") {
      return entries.sort((a, b) =>
        a[1].localeCompare(b[1], undefined, { sensitivity: "base" }),
      );
    }
    const kodRankForKey = (key: string) => {
      const kods = questions
        .filter((q) => {
          const raw = (q.baslik ?? "").trim();
          const k = raw === "" ? FIELD_LABEL_EMPTY_KEY : raw;
          return k === key;
        })
        .map((q) => (q.kod || "").trim())
        .filter(
          (k) =>
            k &&
            !["N/A", "n/a", "N/a", "n/A"].includes(k),
        );
      if (kods.length === 0) return "\uFFFF";
      return kods.reduce((best, cur) =>
        best.localeCompare(cur, undefined, {
          numeric: true,
          sensitivity: "base",
        }) <= 0
          ? best
          : cur,
      );
    };
    return entries.sort((a, b) => {
      const cmp = kodRankForKey(a[0]).localeCompare(
        kodRankForKey(b[0]),
        undefined,
        { numeric: true, sensitivity: "base" },
      );
      if (cmp !== 0) return cmp;
      return a[1].localeCompare(b[1], undefined, { sensitivity: "base" });
    });
  }, [questions, t, bulkFieldLabelOrderMode]);

  const sortedTemplatePages = useMemo(
    () =>
      [...(templatePages || [])].sort(
        (a: { order?: number }, b: { order?: number }) =>
          (a.order || 0) - (b.order || 0),
      ),
    [templatePages],
  );

  const importHeaderOptions = useMemo(
    () => mergeImportHeaderOptions(importHeaders),
    [importHeaders],
  );

  const importAtananSayfaSelectValue = useMemo(() => {
    if (importMapping.selectedPageId) return importMapping.selectedPageId;
    const custom = importMapping.defaultAtananSayfaTitle?.trim() || "";
    if (!custom || custom === selectedSheetName.trim()) return "__sheet__";
    const existing = sortedTemplatePages.find(
      (p) => (p.title || "").trim() === custom,
    );
    if (existing) return existing.id;
    return "__new__";
  }, [
    importMapping.selectedPageId,
    importMapping.defaultAtananSayfaTitle,
    selectedSheetName,
    sortedTemplatePages,
  ]);

  const handleImportAtananSayfaSelect = useCallback(
    (value: string) => {
      if (value === "__sheet__") {
        setImportMapping((prev) => ({
          ...prev,
          selectedPageId: undefined,
          defaultAtananSayfaTitle: selectedSheetName.trim(),
        }));
        return;
      }
      if (value === "__new__") {
        setImportMapping((prev) => ({
          ...prev,
          selectedPageId: undefined,
          defaultAtananSayfaTitle: prev.defaultAtananSayfaTitle?.trim()
            ? prev.defaultAtananSayfaTitle
            : "",
        }));
        return;
      }
      const page = sortedTemplatePages.find((p) => p.id === value);
      setImportMapping((prev) => ({
        ...prev,
        selectedPageId: value,
        defaultAtananSayfaTitle: page?.title?.trim() || "",
      }));
    },
    [selectedSheetName, sortedTemplatePages],
  );

  const thematicGroupOptions = useMemo(() => {
    const vals = Array.from(
      new Set((questions || []).map((q) => q.thematicGroup)),
    );
    return vals.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [questions]);

  const explorerQuestionStats = useMemo(() => {
    const list = questions || [];
    const assigned = list.filter(
      (q) => Boolean(resolveQuestionTemplatePageId(q, templatePages)),
    ).length;
    return {
      total: list.length,
      assigned,
      unassigned: Math.max(0, list.length - assigned),
    };
  }, [questions, templatePages]);

  const explorerQuestionCountByPageId = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of questions || []) {
      const pid = resolveQuestionTemplatePageId(q, templatePages);
      if (!pid) continue;
      map.set(pid, (map.get(pid) || 0) + 1);
    }
    return map;
  }, [questions, templatePages]);

  const filteredQuestions = useMemo(() => {
    const base =
      selectedBaslikKeys.length === 0
        ? questionsMatchingExplorerFilters
        : questionsMatchingExplorerFilters.filter((q) => {
            const raw = (q.baslik ?? "").trim();
            const key = raw === "" ? FIELD_LABEL_EMPTY_KEY : raw;
            return selectedBaslikKeys.includes(key);
          });
    return sortQuestionsBySheetAndNumara(base);
  }, [questionsMatchingExplorerFilters, selectedBaslikKeys]);

  const explorerTotalPages = Math.max(
    1,
    Math.ceil(filteredQuestions.length / questionExplorerPageSize) || 1,
  );
  const explorerPageSafe = Math.min(
    Math.max(1, questionExplorerPage),
    explorerTotalPages,
  );

  const paginatedQuestions = useMemo(() => {
    const start = (explorerPageSafe - 1) * questionExplorerPageSize;
    return filteredQuestions.slice(start, start + questionExplorerPageSize);
  }, [filteredQuestions, explorerPageSafe, questionExplorerPageSize]);

  useEffect(() => {
    setQuestionExplorerPage((p) =>
      p > explorerTotalPages ? explorerTotalPages : p,
    );
  }, [explorerTotalPages]);

  useEffect(() => {
    scrolledToQuestionFromUrlRef.current = null;
  }, [questionIdFromUrl, tIdFromUrl]);

  useEffect(() => {
    if (!tIdFromUrl || templates.length === 0) return;
    if (selectedTemplate?.id === tIdFromUrl) return;
    const found = templates.find((t) => t.id === tIdFromUrl);
    if (!found) return;
    setSelectedTemplate(found);
    void loadTemplateQuestions(found.id);
  }, [tIdFromUrl, templates, selectedTemplate?.id]);

  useEffect(() => {
    if (!questionIdFromUrl || questions.length === 0) return;
    if (tIdFromUrl && selectedTemplate?.id !== tIdFromUrl) return;

    const q = questions.find(
      (item) =>
        item.id === questionIdFromUrl ||
        item.legacyFirebaseId === questionIdFromUrl,
    );
    if (!q) return;

    setTemplateWorkspaceTab("dataset");
    setSearchTerm(questionIdFromUrl);
    const raw = (q.baslik ?? "").trim();
    setSelectedBaslikKeys([raw === "" ? FIELD_LABEL_EMPTY_KEY : raw]);
  }, [questionIdFromUrl, questions, selectedTemplate?.id, tIdFromUrl]);

  useEffect(() => {
    if (!questionIdFromUrl || questions.length === 0) return;
    if (scrolledToQuestionFromUrlRef.current === questionIdFromUrl) return;
    if (tIdFromUrl && selectedTemplate?.id !== tIdFromUrl) return;

    const matchQuestion = (item: Question) =>
      item.id === questionIdFromUrl ||
      item.legacyFirebaseId === questionIdFromUrl;

    const q = questions.find(matchQuestion);
    if (!q) return;

    scrolledToQuestionFromUrlRef.current = questionIdFromUrl;
    const focusIndex = filteredQuestions.findIndex((item) => item.id === q.id);
    if (focusIndex >= 0) {
      setQuestionExplorerPage(
        Math.floor(focusIndex / questionExplorerPageSize) + 1,
      );
    }
    setUrlHighlightQuestionId(q.id);
    openQuestionDetail(q);

    const clearHighlightTimer = window.setTimeout(
      () => setUrlHighlightQuestionId(null),
      5000,
    );

    return () => {
      window.clearTimeout(clearHighlightTimer);
    };
  }, [
    questionIdFromUrl,
    questions,
    filteredQuestions,
    questionExplorerPageSize,
    selectedTemplate?.id,
    tIdFromUrl,
    openQuestionDetail,
  ]);

  const handleInsertQuestionDraftRelative = (
    q: Question,
    placement: "above" | "below",
  ) => {
    if (!selectedTemplate || !sectorId) {
      console.warn("Cannot insert: missing selectedTemplate or sectorId");
      return;
    }
    const allQs = [...questions];
    const i = allQs.findIndex((x) => x.id === q.id);
    console.log(`Insert ${placement}: found question at index ${i} in all questions (total: ${allQs.length})`);
    if (i < 0) {
      console.error(`Question ${q.id} not found in questions array`);
      return;
    }
    const oQ = q.order ?? i + 1;
    const oPrev = i > 0 ? allQs[i - 1].order ?? oQ - 1 : null;
    const oNext =
      i < allQs.length - 1 ? allQs[i + 1].order ?? oQ + 1 : null;
    let newOrder: number;
    if (placement === "above") {
      newOrder = oPrev != null ? (oPrev + oQ) / 2 : oQ - 0.5;
    } else {
      newOrder = oNext != null ? (oQ + oNext) / 2 : oQ + 1;
    }
    if (!Number.isFinite(newOrder)) {
      newOrder =
        questions.reduce((m, x) => Math.max(m, x.order ?? 0), 0) + 1;
    }
    const draftId = `${DRAFT_QUESTION_PREFIX}${Date.now()}`;
    const sid = sector?.id ?? sectorId;
    const newQ: Question = {
      id: draftId,
      templateId: selectedTemplate.id,
      sectorId: sid,
      kod: q.kod ?? "",
      baslik: q.baslik ?? "",
      soru: "",
      ilgiliBirum: readQuestionIlgiliBirim(q),
      ilgiliBirim: readQuestionIlgiliBirim(q),
      aciklama: q.aciklama ?? "",
      aciklamaVideoUrl: q.aciklamaVideoUrl ?? "",
      ornekYanit: q.ornekYanit ?? "",
      raporYeri: "",
      thematicGroup: q.thematicGroup ?? "",
      isMandatory: false,
      order: newOrder,
      pageId: q.pageId ?? undefined,
      domainIds: [],
      answerFormat: q.answerFormat ?? "textarea",
      soruCogaltma: normalizeQuestionSoruCogaltma(q.soruCogaltma),
    };
    setQuestions((prev) => {
      console.log(`Adding draft question: ${draftId}, new total: ${prev.length + 1}`);
      return [...prev, newQ];
    });
    console.log(`Draft question added: ${draftId} (order: ${newOrder})`);
    setQuestionExplorerPage(1);
  };

  const deleteQuestionRef = useRef(handleDeleteQuestion);
  deleteQuestionRef.current = handleDeleteQuestion;
  const insertQuestionRelativeRef = useRef(handleInsertQuestionDraftRelative);
  insertQuestionRelativeRef.current = handleInsertQuestionDraftRelative;

  const handleGridDeleteQuestion = useCallback((q: Question) => {
    deleteQuestionRef.current(q.id, q.kod || "N/A");
  }, []);

  const handleGridInsertAbove = useCallback((q: Question) => {
    insertQuestionRelativeRef.current(q, "above");
  }, []);

  const handleGridInsertBelow = useCallback((q: Question) => {
    insertQuestionRelativeRef.current(q, "below");
  }, []);

  if (loading)
    return <div className="p-12 text-center text-slate-400">Loading...</div>;

  const isServiceCategorySector =
    sector?.type === "Service Category" || sector?.type === "Kategori";
  const HeaderNavIcon = isServiceCategorySector ? Shapes : MapIcon;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="w-full max-w-none space-y-2 px-4 py-2">
        <div
          ref={templateStickyToolbarRef}
          className={cn(
            "sticky top-0 z-20 -mx-4 space-y-2 border-b border-slate-200/90 px-4 py-2",
            "bg-[#f8fafc]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[#f8fafc]/80",
            "shadow-[0_1px_0_rgba(15,23,42,0.06)]",
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Link
              to={
                isServiceCategorySector
                  ? "/service-categories"
                  : "/sectors"
              }
              className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
              title="Back"
              aria-label="Back"
            >
              <ChevronLeft size={18} />
            </Link>
            <HeaderNavIcon
              className="shrink-0 text-blue-600"
              size={18}
              strokeWidth={2.25}
            />
            <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-slate-900">
              {sector?.name}
            </h1>
            {sector?.type ? (
              <span className="hidden shrink-0 items-center rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-800 sm:inline-flex">
                {sector.type}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:max-w-[min(280px,42%)]">
              <label
                htmlFor="template-dataset-select"
                className="sr-only"
              >
                {t.templates.template}
              </label>
              {templates.length > 0 ? (
                editingTemplateId === selectedTemplate?.id ? (
                  <input
                    autoFocus
                    className="h-8 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={editingTemplateName}
                    onChange={(e) => setEditingTemplateName(e.target.value)}
                    onBlur={() =>
                      selectedTemplate &&
                      handleUpdateTemplateName(selectedTemplate.id)
                    }
                    onKeyDown={(e) => {
                      if (!selectedTemplate) return;
                      if (e.key === "Enter")
                        handleUpdateTemplateName(selectedTemplate.id);
                      if (e.key === "Escape") setEditingTemplateId(null);
                    }}
                  />
                ) : (
                  <select
                    id="template-dataset-select"
                    value={selectedTemplate?.id ?? ""}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) return;
                      const tmpl = templates.find((x) => x.id === id);
                      if (!tmpl) return;
                      setSelectedTemplate(tmpl);
                      void loadTemplateQuestions(tmpl.id);
                      setSearchParams(
                        (prev) => {
                          const next = new URLSearchParams(prev);
                          next.set("templateId", id);
                          return next;
                        },
                        { replace: true },
                      );
                    }}
                    className="h-8 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-800 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  >
                    {templates.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </option>
                    ))}
                  </select>
                )
              ) : (
                <p className="text-xs text-slate-400">
                  {t.templates.noTemplatesInSector}
                </p>
              )}
              {selectedTemplate &&
              editingTemplateId !== selectedTemplate.id ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplateId(selectedTemplate.id);
                    setEditingTemplateName(selectedTemplate.name);
                  }}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900"
                  title={t.common.edit}
                  aria-label={t.common.edit}
                >
                  <Edit2 size={14} />
                </button>
              ) : null}
            </div>

            {selectedTemplate ? (
              <div
                className="flex max-w-full flex-wrap items-center gap-0.5 rounded-lg border border-slate-200/80 bg-slate-100/80 p-0.5"
                role="tablist"
                aria-label={selectedTemplate.name}
              >
                {(
                  [
                    { id: "dataset" as const, label: t.templates.tabDataset },
                    {
                      id: "pages" as const,
                      label: t.templates.tabPages,
                      count: templatePages.length,
                    },
                    { id: "bulk" as const, label: t.templates.tabBulk },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={templateWorkspaceTab === tab.id}
                    onClick={() => setTemplateWorkspaceTab(tab.id)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all",
                      templateWorkspaceTab === tab.id
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:bg-slate-200/60 hover:text-slate-700",
                    )}
                  >
                    <span>{tab.label}</span>
                    {"count" in tab ? (
                      <span
                        className={cn(
                          "min-w-[1rem] rounded-full px-1.5 py-0.5 text-center text-[9px] font-bold tabular-nums leading-none",
                          templateWorkspaceTab === tab.id
                            ? "bg-blue-600 text-white"
                            : "bg-slate-200/90 text-slate-600",
                        )}
                      >
                        {tab.count}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={!selectedTemplate}
                onClick={() => {
                  if (!selectedTemplate) return;
                  exportQuestionsToExcel(
                    questions,
                    templatePages,
                    selectedTemplate.name,
                  );
                }}
                className="minimal-button-secondary inline-flex h-8 items-center gap-1.5 px-2.5 disabled:pointer-events-none disabled:opacity-40"
              >
                <Upload size={13} />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {t.templates.exportXlsx}
                </span>
              </button>
              <label
                className={cn(
                  "minimal-button-secondary inline-flex h-8 cursor-pointer items-center gap-1.5 px-2.5",
                  (!selectedTemplate || isUploading) &&
                    "pointer-events-none opacity-40",
                )}
              >
                {isUploading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Download size={13} />
                )}
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {isUploading
                    ? t.templates.importing
                    : t.templates.importXlsx}
                </span>
                <input
                  type="file"
                  className="hidden"
                  onChange={initiateFileUpload}
                  accept=".xlsx, .xls"
                  disabled={isUploading || !selectedTemplate}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-3 pb-20">
          <div className="animate-in fade-in duration-500">
          {!selectedTemplate ? (
            <div className="minimal-card p-24 text-center text-slate-300 flex flex-col items-center gap-4 bg-slate-50/50">
              <FileSpreadsheet size={48} className="text-slate-100" />
              <p className="text-sm font-light">
                Select or create a template to begin defining your report
                structure.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {templateWorkspaceTab === "pages" ? (
                <section className="space-y-3 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center gap-3">
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          {t.templates.reportStructure}
                        </h3>
                        {sortedTemplatePages.length > 0 ? (
                          <p className="mt-0.5 truncate text-[11px] text-slate-500" title={sortedTemplatePages.map((p) => p.title).join(" · ")}>
                            {t.templates.tabPages}: {sortedTemplatePages.length}
                            {" — "}
                            {sortedTemplatePages.map((p) => p.title).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      <button
                        onClick={() => setShowAddPage(true)}
                        className="minimal-button-secondary py-1 px-3 h-auto text-[10px] shrink-0"
                      >
                        {t.templates.addPage.toUpperCase()}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {sortedTemplatePages.length === 0 ? (
                        <div className="p-12 text-center text-slate-300 border border-dashed rounded-xl text-xs">
                          {t.templates.noPages}
                        </div>
                      ) : (
                        sortedTemplatePages.map((p, pageIndex) => (
                          <div
                            key={p.id}
                            className="minimal-card flex items-start justify-between gap-3 px-3 py-2.5 group hover:shadow-md transition-shadow"
                          >
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-white">
                                  {pageIndex + 1}/{sortedTemplatePages.length}
                                </span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-slate-500">
                                  P{p.order}
                                </span>
                                <span
                                  className={cn(
                                    "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                    normalizeTemplatePageKind(p.pageKind) ===
                                      "audit_question_set"
                                      ? "bg-amber-50 text-amber-800"
                                      : "bg-blue-50 text-blue-800",
                                  )}
                                >
                                  {normalizeTemplatePageKind(p.pageKind) ===
                                  "audit_question_set"
                                    ? t.templates.pageKindAudit
                                    : t.templates.pageKindCustomer}
                                </span>
                                {editingPageId === p.id ? (
                                  <input
                                    autoFocus
                                    className="min-w-0 flex-1 border-none bg-slate-50 p-0 text-sm font-bold text-slate-800 focus:ring-0"
                                    value={editingPageTitle}
                                    onChange={(e) =>
                                      setEditingPageTitle(e.target.value)
                                    }
                                    onBlur={() => handleUpdatePageTitle(p.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        handleUpdatePageTitle(p.id);
                                      if (e.key === "Escape")
                                        setEditingPageId(null);
                                    }}
                                  />
                                ) : (
                                  <span
                                    className="min-w-0 cursor-pointer truncate text-sm font-bold text-slate-800 transition-colors hover:text-slate-600"
                                    onClick={() => {
                                      setEditingPageId(p.id);
                                      setEditingPageTitle(p.title);
                                    }}
                                  >
                                    {p.title}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                  {t.templates.questionsAssignedOnPage.replace(
                                    "{count}",
                                    String(
                                      questions.filter((q) => q.pageId === p.id)
                                        .length,
                                    ),
                                  )}
                                </span>
                              </div>

                              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                                <div className="min-w-0 flex-1">
                                  {editingBriefId === p.id ? (
                                    <textarea
                                      autoFocus
                                      className="min-h-[56px] w-full rounded-lg border border-slate-200 bg-white p-2 text-[11px] focus:ring-1 focus:ring-slate-900"
                                      value={editingBriefText}
                                      onChange={(e) =>
                                        setEditingBriefText(e.target.value)
                                      }
                                      onBlur={() => handleUpdatePageBrief(p.id)}
                                      placeholder="Add layout briefing/notes for this page..."
                                    />
                                  ) : (
                                    <p
                                      className="cursor-pointer text-[11px] italic text-slate-500 line-clamp-1 transition-colors hover:text-slate-900"
                                      onClick={() => {
                                        setEditingBriefId(p.id);
                                        setEditingBriefText(p.briefText || "");
                                      }}
                                    >
                                      {p.briefText ||
                                        "Add narrative briefing / notes..."}
                                    </p>
                                  )}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <label className="sr-only" htmlFor={`page-kind-${p.id}`}>
                                    {t.templates.pageTypeLabel}
                                  </label>
                                  <select
                                    id={`page-kind-${p.id}`}
                                    value={normalizeTemplatePageKind(p.pageKind)}
                                    onChange={(e) =>
                                      void handleUpdatePageKind(
                                        p.id,
                                        e.target.value as TemplatePageKind,
                                      )
                                    }
                                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-slate-900"
                                    aria-label={t.templates.editPageType}
                                  >
                                    {TEMPLATE_PAGE_KINDS.map((kind) => (
                                      <option key={kind} value={kind}>
                                        {kind === "audit_question_set"
                                          ? t.templates.pageKindAudit
                                          : t.templates.pageKindCustomer}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeletePage(p.id, p.title)}
                              className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                              title="Delete Page and Questions"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                </section>
              ) : null}

              {templateWorkspaceTab === "bulk" ? (
                <section className="space-y-4 animate-in fade-in duration-300">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    {t.templates.bulkSectionTitle}
                  </h3>
                  <div className="flex w-full flex-col gap-6">
                      <div className="minimal-card overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-3 p-5 text-left transition-colors hover:bg-slate-50/80"
                        onClick={() => setBulkUpdatesOpen((o) => !o)}
                        aria-expanded={bulkUpdatesOpen}
                        aria-controls="bulk-updates-panel"
                        id="bulk-updates-heading"
                        aria-label={
                          bulkUpdatesOpen
                            ? t.templates.bulkUpdatesToggleCollapse
                            : t.templates.bulkUpdatesToggleExpand
                        }
                      >
                        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2 pr-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {t.templates.bulkUpdatesTitle}
                          </h4>
                          {selectedQuestionIds.size > 0 ? (
                            <span className="inline-flex shrink-0 items-center rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-700">
                              {t.templates.bulkUpdatesSelectedBadge.replace(
                                "{count}",
                                String(selectedQuestionIds.size),
                              )}
                            </span>
                          ) : null}
                        </div>
                        <ChevronDown
                          size={20}
                          className={cn(
                            "mt-0.5 shrink-0 text-slate-400 transition-transform duration-200",
                            bulkUpdatesOpen && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </button>
                      {bulkUpdatesOpen ? (
                        <div
                          id="bulk-updates-panel"
                          role="region"
                          aria-labelledby="bulk-updates-heading"
                          className="border-t border-slate-100 px-5 pb-5 pt-4"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => void handleBulkAutoMapClauses()}
                              disabled={
                                isMappingQuestionId === "bulk" ||
                                filteredQuestions.length === 0
                              }
                              title={t.templates.bulkAutoMapTooltip}
                              className="whitespace-nowrap text-[10px] font-bold text-violet-600 hover:text-white hover:bg-violet-600 flex items-center gap-1.5 bg-violet-50 px-4 py-2 rounded-full transition-all border border-violet-100 disabled:opacity-50 min-h-[40px]"
                            >
                              {isMappingQuestionId === "bulk" ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Sparkles size={12} />
                              )}
                              {t.templates.bulkAutoMapLabel.toUpperCase()}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAutoNumberConfirm(true)}
                              disabled={isSubmitting || questions.length === 0}
                              className="whitespace-nowrap text-[10px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-full transition-all border border-slate-100 min-h-[40px]"
                            >
                              {isSubmitting ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <MapIcon size={12} />
                              )}
                              {t.templates.autoFixNumbering.toUpperCase()}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBulkDomainIds([]);
                                setIsBulkUpdateModalOpen(true);
                              }}
                              disabled={
                                isSubmitting || filteredQuestions.length === 0
                              }
                              className="whitespace-nowrap text-[10px] font-bold text-blue-600 hover:text-white hover:bg-blue-600 flex items-center gap-1.5 bg-blue-50 px-4 py-2 rounded-full transition-all border border-blue-100 disabled:opacity-50 min-h-[40px]"
                            >
                              <Globe size={12} />
                              {t.templates.bulkAssignDomain.toUpperCase()}
                            </button>
                            {!hasAnswers && (questions || []).length > 0 ? (
                              <button
                                type="button"
                                onClick={handleDeleteAllQuestions}
                                disabled={isSubmitting}
                                className="whitespace-nowrap text-[10px] font-bold text-red-500 hover:text-white hover:bg-red-500 flex items-center gap-1.5 bg-red-50 px-4 py-2 rounded-full transition-all border border-red-100 disabled:opacity-50 min-h-[40px]"
                              >
                                <Trash2 size={12} />
                                {t.templates.deleteAll.toUpperCase()}
                              </button>
                            ) : null}
                            {selectedQuestionIds.size > 0 ? (
                              <button
                                type="button"
                                onClick={handleBulkDelete}
                                disabled={isSubmitting}
                                className="whitespace-nowrap text-[10px] font-bold text-red-600 hover:text-white hover:bg-red-600 flex items-center gap-1.5 bg-red-50 px-4 py-2 rounded-full transition-all border border-red-100 disabled:opacity-50 min-h-[40px]"
                              >
                                <Trash2 size={12} />
                                {`${t.templates.bulkDelete.toUpperCase()} (${selectedQuestionIds.size})`}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>

                      {/* Card: page ↔ source sheets */}
                      {(templatePages || []).length > 0 &&
                          thematicGroupOptions.length > 0 && (
                            <div className="minimal-card overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                              <button
                                type="button"
                                className="flex w-full items-start justify-between gap-3 p-5 text-left transition-colors hover:bg-slate-50/80"
                                onClick={() =>
                                  setBulkAssignSourceOpen((o) => !o)
                                }
                                aria-expanded={bulkAssignSourceOpen}
                                aria-controls="bulk-assign-source-panel"
                                id="bulk-assign-source-heading"
                                aria-label={
                                  bulkAssignSourceOpen
                                    ? t.templates.bulkAssignToggleCollapse
                                    : t.templates.bulkAssignToggleExpand
                                }
                              >
                                <div className="min-w-0 flex-1 space-y-1 pr-2">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    {t.templates.bulkAssignKicker}
                                  </p>
                                  <h4 className="text-sm font-bold text-slate-900">
                                    {t.templates.bulkAssignCardSourceTitle}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 leading-relaxed">
                                    {t.templates.sourceSheetMultiSelectHint}
                                  </p>
                                </div>
                                <ChevronDown
                                  size={20}
                                  className={cn(
                                    "mt-0.5 shrink-0 text-slate-400 transition-transform duration-200",
                                    bulkAssignSourceOpen && "rotate-180",
                                  )}
                                  aria-hidden
                                />
                              </button>
                              {bulkAssignSourceOpen ? (
                                <div
                                  id="bulk-assign-source-panel"
                                  role="region"
                                  aria-labelledby="bulk-assign-source-heading"
                                  className="space-y-5 border-t border-slate-100 px-5 pb-5 pt-4"
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                                    <button
                                      type="button"
                                      disabled={
                                        !bulkSourcePageId ||
                                        bulkSourceGroupKeys.length === 0 ||
                                        bulkAssigning !== null ||
                                        isSubmitting
                                      }
                                      onClick={() =>
                                        void handleApplyBulkSourceSheetsToPage()
                                      }
                                      className="w-full sm:w-auto minimal-button-primary text-[10px] uppercase tracking-widest font-bold h-10 px-6 disabled:opacity-50 whitespace-nowrap"
                                    >
                                      {bulkAssigning === "source" ? (
                                        <Loader2 className="animate-spin h-4 w-4 mx-auto" />
                                      ) : (
                                        t.templates.bulkAssignApply
                                      )}
                                    </button>
                                  </div>
                                  <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6 w-full">
                                    <div className="w-full lg:max-w-[140px] lg:w-[min(100%,140px)] lg:flex-none space-y-1.5 shrink-0">
                                      <label
                                        htmlFor="bulk-assign-source-page"
                                        className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block"
                                      >
                                        {t.templates.bulkAssignPageColumn}
                                      </label>
                                      <select
                                        id="bulk-assign-source-page"
                                        className="minimal-input w-full min-h-[44px] text-[12px] font-semibold"
                                        value={bulkSourcePageId}
                                        onChange={(e) =>
                                          setBulkSourcePageId(e.target.value)
                                        }
                                      >
                                        <option value="">
                                          {t.templates.bulkAssignSelectPagePlaceholder}
                                        </option>
                                        {sortedTemplatePages.map(
                                          (p: {
                                            id: string;
                                            title: string;
                                            order?: number;
                                          }) => (
                                            <option key={p.id} value={p.id}>
                                              P{p.order ?? "—"} — {p.title}
                                            </option>
                                          ),
                                        )}
                                      </select>
                                    </div>
                                    <div
                                      className="flex items-center justify-center py-1 text-slate-300 text-xl font-light select-none shrink-0 lg:pt-9"
                                      aria-hidden
                                    >
                                      {t.templates.bulkAssignConnector}
                                    </div>
                                    <div className="w-full lg:flex-1 min-w-0 space-y-1.5">
                                      <label
                                        htmlFor="bulk-assign-source-groups"
                                        className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block"
                                      >
                                        {t.templates.bulkAssignSourceColumn}
                                      </label>
                                      <select
                                        id="bulk-assign-source-groups"
                                        multiple
                                        size={Math.min(
                                          8,
                                          Math.max(
                                            3,
                                            thematicGroupOptions.length,
                                          ),
                                        )}
                                        className="minimal-input w-full min-h-[100px] text-[12px] py-2.5 font-medium text-slate-700"
                                        value={bulkSourceGroupKeys}
                                        onChange={(e) => {
                                          setBulkSourceGroupKeys(
                                            Array.from(
                                              e.target.selectedOptions,
                                              (o) => o.value,
                                            ),
                                          );
                                        }}
                                      >
                                        {thematicGroupOptions.map((g) => (
                                          <option key={g} value={g}>
                                            {g || "Default"}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}

                        {/* Card: page ↔ field labels */}
                        {(templatePages || []).length > 0 &&
                          bulkLabelChipOptions.length > 0 && (
                            <div className="minimal-card overflow-hidden bg-white border border-slate-200/80 rounded-2xl shadow-sm">
                              <button
                                type="button"
                                className="flex w-full items-start justify-between gap-3 p-5 text-left transition-colors hover:bg-slate-50/80"
                                onClick={() =>
                                  setBulkAssignFieldOpen((o) => !o)
                                }
                                aria-expanded={bulkAssignFieldOpen}
                                aria-controls="bulk-assign-field-panel"
                                id="bulk-assign-field-heading"
                                aria-label={
                                  bulkAssignFieldOpen
                                    ? t.templates.bulkAssignToggleCollapse
                                    : t.templates.bulkAssignToggleExpand
                                }
                              >
                                <div className="min-w-0 flex-1 space-y-1 pr-2">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    {t.templates.bulkAssignKicker}
                                  </p>
                                  <h4 className="text-sm font-bold text-slate-900">
                                    {t.templates.bulkAssignCardFieldTitle}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 leading-relaxed">
                                    {t.templates.fieldLabelsMultiSelectHint}
                                  </p>
                                </div>
                                <ChevronDown
                                  size={20}
                                  className={cn(
                                    "mt-0.5 shrink-0 text-slate-400 transition-transform duration-200",
                                    bulkAssignFieldOpen && "rotate-180",
                                  )}
                                  aria-hidden
                                />
                              </button>
                              {bulkAssignFieldOpen ? (
                                <div
                                  id="bulk-assign-field-panel"
                                  role="region"
                                  aria-labelledby="bulk-assign-field-heading"
                                  className="space-y-5 border-t border-slate-100 px-5 pb-5 pt-4"
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                                    <button
                                      type="button"
                                      disabled={
                                        !bulkLabelPageId ||
                                        bulkLabelKeys.length === 0 ||
                                        bulkAssigning !== null ||
                                        isSubmitting
                                      }
                                      onClick={() =>
                                        void handleApplyBulkFieldLabelsToPage()
                                      }
                                      className="w-full sm:w-auto minimal-button-primary text-[10px] uppercase tracking-widest font-bold h-10 px-6 disabled:opacity-50 whitespace-nowrap"
                                    >
                                      {bulkAssigning === "label" ? (
                                        <Loader2 className="animate-spin h-4 w-4 mx-auto" />
                                      ) : (
                                        t.templates.bulkAssignApply
                                      )}
                                    </button>
                                  </div>
                                  <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6 w-full">
                                    <div className="w-full lg:max-w-[140px] lg:w-[min(100%,140px)] lg:flex-none space-y-1.5 shrink-0">
                                      <label
                                        htmlFor="bulk-assign-label-page"
                                        className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block"
                                      >
                                        {t.templates.bulkAssignPageColumn}
                                      </label>
                                      <select
                                        id="bulk-assign-label-page"
                                        className="minimal-input w-full min-h-[44px] text-[12px] font-semibold"
                                        value={bulkLabelPageId}
                                        onChange={(e) =>
                                          setBulkLabelPageId(e.target.value)
                                        }
                                      >
                                        <option value="">
                                          {t.templates.bulkAssignSelectPagePlaceholder}
                                        </option>
                                        {sortedTemplatePages.map(
                                          (p: {
                                            id: string;
                                            title: string;
                                            order?: number;
                                          }) => (
                                            <option key={p.id} value={p.id}>
                                              P{p.order ?? "—"} — {p.title}
                                            </option>
                                          ),
                                        )}
                                      </select>
                                    </div>
                                    <div
                                      className="flex items-center justify-center py-1 text-slate-300 text-xl font-light select-none shrink-0 lg:pt-9"
                                      aria-hidden
                                    >
                                      {t.templates.bulkAssignConnector}
                                    </div>
                                    <div className="w-full lg:flex-1 min-w-0 space-y-1.5">
                                      <div className="flex flex-wrap items-end justify-between gap-2">
                                        <label
                                          htmlFor="bulk-assign-label-keys"
                                          className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block"
                                        >
                                          {t.templates.bulkAssignFieldLabelColumn}
                                        </label>
                                        <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setBulkFieldLabelOrderMode(
                                                "label",
                                              )
                                            }
                                            className={cn(
                                              "rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest transition-all",
                                              bulkFieldLabelOrderMode ===
                                                "label"
                                                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800",
                                            )}
                                          >
                                            {t.templates.orderByFieldLabel}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setBulkFieldLabelOrderMode("kod")
                                            }
                                            className={cn(
                                              "rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest transition-all",
                                              bulkFieldLabelOrderMode === "kod"
                                                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800",
                                            )}
                                          >
                                            {t.templates.orderByKod}
                                          </button>
                                        </div>
                                      </div>
                                      <select
                                        id="bulk-assign-label-keys"
                                        multiple
                                        size={Math.min(
                                          8,
                                          Math.max(
                                            3,
                                            bulkLabelChipOptions.length,
                                          ),
                                        )}
                                        className="minimal-input w-full min-h-[100px] text-[12px] py-2.5 font-medium text-slate-700"
                                        value={bulkLabelKeys}
                                        onChange={(e) => {
                                          setBulkLabelKeys(
                                            Array.from(
                                              e.target.selectedOptions,
                                              (o) => o.value,
                                            ),
                                          );
                                        }}
                                      >
                                        {bulkLabelChipOptions.map(
                                          ([baslikKey, baslikLabel]) => (
                                            <option
                                              key={baslikKey}
                                              value={baslikKey}
                                            >
                                              {baslikLabel}
                                            </option>
                                          ),
                                        )}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                    </div>
                </section>
              ) : null}

              {templateWorkspaceTab === "dataset" ? (
              <section className="w-full min-w-0 space-y-2 animate-in fade-in duration-300">
                {(((searchTerm || selectedBaslikKeys.length > 0) &&
                  (questions || []).length > 0) ||
                  searchTerm) && (
                  <div className="flex min-h-[1.25rem] flex-wrap items-center gap-2">
                    {(searchTerm || selectedBaslikKeys.length > 0) &&
                      (questions || []).length > 0 && (
                        <div className="text-[11px] text-slate-500 bg-slate-100/80 px-3 py-1 rounded-full font-medium">
                          {t.templates.questionsMatchFilters.replace(
                            "{count}",
                            String(filteredQuestions.length),
                          )}
                        </div>
                      )}
                    {searchTerm && (
                      <div className="text-[11px] text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-medium animate-in fade-in zoom-in-95">
                        {filteredQuestions.length} {t.templates.results}
                      </div>
                    )}
                  </div>
                )}

                <div className="minimal-card relative z-0 w-full overflow-visible border-slate-100/50 bg-white p-0 shadow-md">
                  <div
                    className={cn(
                      "sticky z-[15] border-b border-slate-200/90 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.12)]",
                      "bg-[#f8fafc]/98 backdrop-blur-md supports-[backdrop-filter]:bg-[#f8fafc]/90",
                    )}
                    style={{ top: templateStickyToolbarPx }}
                  >
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-1.5 md:px-4 md:py-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {!explorerDatasetFiltersExpanded ? (
                        <form
                          className="flex min-w-0 flex-1 items-center gap-2 max-w-xl"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const input = e.currentTarget.elements.namedItem(
                              "explorer-quick-search",
                            ) as HTMLInputElement | null;
                            if (input) setSearchTerm(input.value);
                          }}
                        >
                          <div className="relative min-w-0 flex-1">
                            <Search
                              className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-slate-400"
                              size={13}
                              strokeWidth={2}
                              aria-hidden
                            />
                            <input
                              id="explorer-quick-search"
                              name="explorer-quick-search"
                              type="text"
                              placeholder={t.templates.filterBy}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:ring-1 focus:ring-slate-900"
                              aria-label={t.templates.filterBy}
                            />
                          </div>
                          <button
                            type="submit"
                            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                          >
                            {t.common.search}
                          </button>
                        </form>
                      ) : null}
                    </div>
                    {explorerDatasetFiltersExpanded ? (
                      <button
                        type="button"
                        onClick={() =>
                          setExplorerDatasetFiltersExpanded(false)
                        }
                        className="shrink-0 rounded-sm px-1 py-0.5 text-[10px] font-medium text-slate-600 transition-colors hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                      >
                        {t.templates.explorerFiltersHide}
                      </button>
                    ) : (
                      <div className="flex items-center gap-4 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            explorerFiltersSuppressScrollCollapseUntilRef.current =
                              performance.now() + 500;
                            setExplorerDatasetFiltersExpanded(true);
                          }}
                          className="rounded-sm px-1 py-0.5 text-[10px] font-medium text-slate-600 transition-colors hover:text-slate-900 underline underline-offset-2 decoration-slate-400 hover:decoration-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                        >
                          {t.templates.explorerFiltersShow}
                        </button>
                        <ColumnSettingsPanel
                          columnOrder={columnOrder}
                          columnVisibility={columnVisibility}
                          onColumnOrderChange={setColumnOrder}
                          onColumnVisibilityChange={setColumnVisibility}
                        />
                      </div>
                    )}
                  </div>
                  {explorerDatasetFiltersExpanded ? (
                  <div className="shrink-0 border-b border-slate-100 bg-slate-50/50 px-3 py-2 md:px-4 md:py-2.5">
                    <div className="flex w-full flex-col items-stretch gap-4 md:flex-row md:items-center">
                      <div className="relative min-w-0 flex-1 group">
                        <Search
                          className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-600"
                          size={14}
                          strokeWidth={2}
                          aria-hidden
                        />
                        <input
                          type="text"
                          placeholder={t.templates.filterBy}
                          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:ring-1 focus:ring-slate-900"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="relative shrink-0 group md:min-w-[240px] md:max-w-[min(320px,32%)]">
                        <Filter
                          className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400 transition-colors group-hover:text-slate-900"
                          size={14}
                          strokeWidth={2}
                          aria-hidden
                        />
                        <select
                          value={explorerAssignmentFilter}
                          onChange={(e) =>
                            setExplorerAssignmentFilter(
                              e.target.value as
                                | "all"
                                | "assigned"
                                | "unassigned",
                            )
                          }
                          className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm outline-none transition-all focus:ring-1 focus:ring-slate-900"
                          aria-label={
                            t.templates.explorerAssignmentFilterAria
                          }
                        >
                          <option value="all">
                            {t.templates.explorerFilterOptionAll.replace(
                              "{count}",
                              String(explorerQuestionStats.total),
                            )}
                          </option>
                          <option value="assigned">
                            {t.templates.explorerFilterOptionAssigned.replace(
                              "{count}",
                              String(explorerQuestionStats.assigned),
                            )}
                          </option>
                          <option value="unassigned">
                            {t.templates.explorerFilterOptionUnassigned.replace(
                              "{count}",
                              String(explorerQuestionStats.unassigned),
                            )}
                          </option>
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-slate-900">
                          <ChevronDown size={14} strokeWidth={2} aria-hidden />
                        </div>
                      </div>
                      <div className="relative shrink-0 group md:min-w-[220px] md:max-w-[min(320px,32%)]">
                        <Layers
                          className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-slate-400 transition-colors group-hover:text-slate-900"
                          size={14}
                          strokeWidth={2}
                          aria-hidden
                        />
                        <select
                          value={explorerPageIdFilter}
                          onChange={(e) => setExplorerPageIdFilter(e.target.value)}
                          className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm outline-none transition-all focus:ring-1 focus:ring-slate-900"
                          aria-label={t.templates.explorerPageFilterAria}
                        >
                          <option value="">
                            {t.templates.explorerPageFilterAll}
                          </option>
                          {sortedTemplatePages.map((p) => {
                            const count =
                              explorerQuestionCountByPageId.get(p.id) || 0;
                            return (
                              <option key={p.id} value={p.id}>
                                {t.templates.explorerPageFilterOption
                                  .replace("{title}", String(p.title || ""))
                                  .replace("{count}", String(count))}
                              </option>
                            );
                          })}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-slate-900">
                          <ChevronDown size={14} strokeWidth={2} aria-hidden />
                        </div>
                      </div>
                    </div>
                    {questions.length > 0 && baslikChipOptions.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {t.templates.fieldLabelFilterHeading}
                          </p>
                          {!fieldLabelTagsExpanded && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-semibold text-slate-500">
                                {selectedBaslikKeys.length === 0
                                  ? t.templates.fieldLabelAll
                                  : t.templates.fieldLabelTagsSelectedCount.replace(
                                      "{count}",
                                      String(selectedBaslikKeys.length),
                                    )}
                              </span>
                              <button
                                type="button"
                                onClick={() => setFieldLabelTagsExpanded(true)}
                                className="rounded-sm px-0.5 py-0 text-[10px] font-medium text-slate-600 underline decoration-slate-400 underline-offset-2 transition-colors hover:text-slate-900 hover:decoration-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                              >
                                {t.templates.fieldLabelTagsShow}
                              </button>
                            </div>
                          )}
                        </div>
                        {fieldLabelTagsExpanded ? (
                          <>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedBaslikKeys([])}
                                className={cn(
                                  "rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all",
                                  selectedBaslikKeys.length === 0
                                    ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                                )}
                              >
                                {t.templates.fieldLabelAll}
                              </button>
                              {baslikChipOptions.map(([key, label]) => {
                                const active = selectedBaslikKeys.includes(key);
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                      setSelectedBaslikKeys((prev) =>
                                        prev.includes(key)
                                          ? prev.filter((k) => k !== key)
                                          : [...prev, key],
                                      );
                                    }}
                                    className={cn(
                                      "max-w-[280px] truncate rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all",
                                      active
                                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                                    )}
                                    title={label}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                            <div
                              className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[10px] leading-tight text-slate-500"
                              role="group"
                              aria-label={t.templates.fieldLabelFilterHeading}
                            >
                              <button
                                type="button"
                                onClick={() => setFieldLabelChipOrderMode("label")}
                                className={cn(
                                  "rounded-sm px-0.5 py-0 text-left font-medium transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60",
                                  fieldLabelChipOrderMode === "label"
                                    ? "text-slate-900 underline decoration-slate-900 underline-offset-2"
                                    : "text-slate-400 hover:underline",
                                )}
                              >
                                {t.templates.orderByFieldLabel}
                              </button>
                              <span
                                className="select-none text-slate-300"
                                aria-hidden
                              >
                                ·
                              </span>
                              <button
                                type="button"
                                onClick={() => setFieldLabelChipOrderMode("kod")}
                                className={cn(
                                  "rounded-sm px-0.5 py-0 text-left font-medium transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60",
                                  fieldLabelChipOrderMode === "kod"
                                    ? "text-slate-900 underline decoration-slate-900 underline-offset-2"
                                    : "text-slate-400 hover:underline",
                                )}
                              >
                                {t.templates.orderByKod}
                              </button>
                              <span
                                className="select-none text-slate-300"
                                aria-hidden
                              >
                                ·
                              </span>
                              <button
                                type="button"
                                onClick={() => setFieldLabelTagsExpanded(false)}
                                className="rounded-sm px-0.5 py-0 text-left font-medium text-slate-600 underline decoration-slate-400 underline-offset-2 transition-colors hover:text-slate-900 hover:decoration-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60"
                              >
                                {t.templates.fieldLabelTagsHide}
                              </button>
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>
                  ) : null}
                  </div>

                  <div className="flex min-h-0 w-full items-stretch">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <QuestionExplorerTable
                        rows={paginatedQuestions}
                        selectedQuestionIds={selectedQuestionIds}
                        onSelectionChange={handleExplorerSelectionChange}
                        onBulkDelete={handleBulkDelete}
                        onToggleSelectAll={toggleAllSelection}
                        bulkDeleteTitle={t.templates.bulkDelete}
                        selectAllLabel={t.templates.selectAllQuestions}
                        columnOrder={columnOrder}
                        columnVisibility={columnVisibility}
                        columnWidths={columnWidths}
                        getFieldValue={getExplorerGridFieldValue}
                        onOpenDetail={openQuestionDetail}
                        onDelete={handleGridDeleteQuestion}
                        onInsertAbove={handleGridInsertAbove}
                        onInsertBelow={handleGridInsertBelow}
                        activeDetailQuestionId={detailSheetQuestion?.id ?? null}
                        urlHighlightQuestionId={urlHighlightQuestionId}
                        isSubmitting={isSubmitting}
                        emptyMessage={
                          searchTerm || selectedBaslikKeys.length > 0
                            ? t.templates.noQuestions
                            : "No questions in this template yet. Import an XLSX file to get started."
                        }
                        labels={{
                          numara: "Numara",
                          baslik: t.templates.baslik,
                          soru: t.templates.soru,
                          detail: "Detay",
                        }}
                      />
                      <PaginationBar
                        page={explorerPageSafe}
                        pageSize={questionExplorerPageSize}
                        totalItems={filteredQuestions.length}
                        onPageChange={setQuestionExplorerPage}
                        onPageSizeChange={setQuestionExplorerPageSize}
                        pageSizeOptions={[10, 25, 50, 100, 200, 250, 500]}
                        rangeSummaryTemplate={t.common.paginationRangeSummary}
                        perPageLabel={t.common.paginationPerPageLabel}
                        pageOfLabel={(c, tot) =>
                          t.common.paginationPageOf.replace("{current}", String(c)).replace("{total}", String(tot))
                        }
                        prevLabel={t.common.paginationPrev}
                        nextLabel={t.common.paginationNext}
                        className="border-t border-slate-100 px-4 pb-4 pt-2"
                      />
                    </div>
                    <QuestionExplorerDetailSheet
                      open={detailSheetOpen}
                      question={detailSheetQuestion}
                      templatePages={sortedTemplatePages}
                      getFields={getExplorerRowFields}
                      onPatch={(q, patch) => {
                        ensureExplorerRowDraft(q);
                        patchExplorerRowDraft(q, patch);
                      }}
                      onPageIdChange={(q, pageId) => {
                        void handleAssignPage(q.id, pageId);
                      }}
                      onSave={(questionId) => void handleSaveExplorerRow(questionId)}
                      onClose={() => {
                        setDetailSheetOpen(false);
                        setDetailSheetQuestion(null);
                      }}
                      isDirty={isExplorerRowDirty}
                      isSaving={savingExplorerRowId === detailSheetQuestion?.id}
                    />
                  </div>
                </div>
              </section>
              ) : null}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* New Page Modal */}
      <AnimatePresence>
        {showAddPage && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-6">
                {t.templates.newReportPageTitle}
              </h2>
              <form onSubmit={handleCreatePage} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Page Title
                  </label>
                  <input
                    name="title"
                    type="text"
                    required
                    className="minimal-input"
                    placeholder="e.g. Environmental Impact"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    {t.templates.pageTypeLabel}
                  </label>
                  <select
                    name="pageKind"
                    value={newPageKind}
                    onChange={(e) =>
                      setNewPageKind(e.target.value as TemplatePageKind)
                    }
                    className="minimal-input cursor-pointer"
                  >
                    {TEMPLATE_PAGE_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind === "audit_question_set"
                          ? t.templates.pageKindAudit
                          : t.templates.pageKindCustomer}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddPage(false)}
                    className="minimal-button-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="minimal-button-primary flex-1"
                  >
                    {isSubmitting ? "Adding..." : "Add Page"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Mapping Modal */}
      <AnimatePresence>
        {showMappingModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-md sm:p-6">
            <div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="mx-auto flex w-full max-w-3xl max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)]"
            >
              <div className="shrink-0 border-b border-slate-100 px-6 pb-4 pt-6 sm:px-8 sm:pt-8">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                      {t.templates.importMappingTitle}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {t.templates.importMappingSubtitle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-4 sm:px-8">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {t.templates.importMappingSelectSheet}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {importSheetNames.map((sheet) => (
                      <button
                        key={sheet}
                        onClick={() => handleSheetChange(sheet)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                          selectedSheetName === sheet
                            ? "bg-slate-900 text-white border-slate-900 shadow-lg"
                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-400",
                        )}
                      >
                        {sheet}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="space-y-1">
                    <label
                      htmlFor="import-atanan-sayfa-select"
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-400"
                    >
                      {t.templates.importMappingAtananSayfaLabel}
                    </label>
                    <p className="text-[10px] leading-relaxed text-slate-500">
                      {t.templates.importMappingAtananSayfaHint}
                    </p>
                  </div>
                  <select
                    id="import-atanan-sayfa-select"
                    className="minimal-input w-full min-h-[44px] text-sm font-semibold"
                    value={importAtananSayfaSelectValue}
                    onChange={(e) => handleImportAtananSayfaSelect(e.target.value)}
                  >
                    <option value="__sheet__">
                      {t.templates.importMappingAtananSayfaSheetOption.replace(
                        "{sheet}",
                        selectedSheetName || "—",
                      )}
                    </option>
                    {sortedTemplatePages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.title || page.id}
                      </option>
                    ))}
                    <option value="__new__">
                      {t.templates.importMappingAtananSayfaNewPage}
                    </option>
                  </select>
                  {importAtananSayfaSelectValue === "__new__" ? (
                    <input
                      type="text"
                      className="minimal-input w-full min-h-[44px] text-sm font-semibold"
                      placeholder={
                        t.templates.importMappingAtananSayfaNewPagePlaceholder
                      }
                      value={importMapping.defaultAtananSayfaTitle || ""}
                      onChange={(e) =>
                        setImportMapping((prev) => ({
                          ...prev,
                          selectedPageId: undefined,
                          defaultAtananSayfaTitle: e.target.value,
                        }))
                      }
                    />
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {getExcelImportFieldDefs(importMode).map(({ key, label, required }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        {label}
                        {((required && key !== "kodField") ||
                          (key === "kodField" &&
                            !importMapping.autoAssignKod)) && (
                          <span className="text-red-500">*</span>
                        )}
                      </label>
                      <select
                        className={cn(
                          "minimal-input h-10 text-xs font-medium",
                          key === "kodField" &&
                            importMapping.autoAssignKod &&
                            "opacity-50 pointer-events-none bg-slate-100",
                        )}
                        value={importMapping[key] as string}
                        onChange={(e) =>
                          setImportMapping((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        disabled={
                          key === "kodField" && importMapping.autoAssignKod
                        }
                      >
                        <option value="">
                          {t.templates.importMappingSelectColumn}
                        </option>
                        {importHeaderOptions.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      {key === "kodField" && (
                        <div className="mt-2 space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 transition-all cursor-pointer"
                              checked={importMapping.autoAssignKod}
                              onChange={(e) =>
                                setImportMapping((prev) => ({
                                  ...prev,
                                  autoAssignKod: e.target.checked,
                                  upsertByKod: e.target.checked
                                    ? false
                                    : prev.upsertByKod,
                                }))
                              }
                            />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">
                              {t.templates.importMappingAutoAssignKod}
                            </span>
                          </label>
                          <label className="flex items-start gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 transition-all cursor-pointer"
                              checked={importMapping.upsertByKod !== false}
                              disabled={importMapping.autoAssignKod}
                              onChange={(e) =>
                                setImportMapping((prev) => ({
                                  ...prev,
                                  upsertByKod: e.target.checked,
                                }))
                              }
                            />
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase tracking-widest transition-colors",
                                importMapping.autoAssignKod
                                  ? "text-slate-300"
                                  : "text-slate-400 group-hover:text-slate-900",
                              )}
                            >
                              {t.templates.importUpsertByKodLabel}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-slate-500 italic px-1">
                  {t.templates.importMappingSilentFieldsNote}
                </p>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                  <AlertCircle
                    size={20}
                    className="text-slate-400 mt-1 shrink-0"
                  />
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                      Pro Tip
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {t.templates.importMappingProTip}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 gap-4 border-t border-slate-100 px-6 py-4 sm:px-8 sm:pb-6">
                <button
                  onClick={() => setShowMappingModal(false)}
                  className="flex-1 rounded-2xl px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-2xl"
                >
                  Start Import
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {importResultModal && (
        <Modal
          isOpen
          onClose={() => setImportResultModal(null)}
          title={importResultModal.title}
          cancelLabel={t.tasks.close}
          closeLabel={t.tasks.close}
          type={
            importResultModal.variant === "success"
              ? "info"
              : importResultModal.variant === "error"
                ? "danger"
                : "warning"
          }
        >
          {importResultModal.variant === "success" ? (
            <div className="flex gap-3">
              <CheckCircle2
                className="mt-0.5 shrink-0 text-emerald-600"
                size={22}
                aria-hidden
              />
              <p className="text-sm leading-relaxed text-slate-600">
                {importResultModal.description}
              </p>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {importResultModal.description}
            </p>
          )}
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showAutoNumberConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <MapIcon size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Auto-number Labels
                  </h2>
                  <p className="text-slate-500 text-sm">
                    Sequential organization.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  This will overwrite{" "}
                  <span className="font-bold text-slate-900">ALL</span> existing
                  Question Codes (KOD) and Field Labels (Baslık) for all{" "}
                  <span className="font-bold text-slate-900">
                    {questions.length} questions
                  </span>{" "}
                  in this template with hierarchical codes (X-Y-Z) based on
                  Page, Group, and Question order.
                </p>

                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-start gap-3">
                  <AlertCircle
                    size={16}
                    className="text-blue-500 mt-0.5 shrink-0"
                  />
                  <p className="text-[11px] text-blue-600 leading-tight">
                    This action will fix and update existing numbering to follow
                    the tripartite format (e.g., 2-1-1).
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAutoNumberConfirm(false)}
                    className="minimal-button-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAutoNumberQuestions}
                    disabled={isSubmitting}
                    className="minimal-button-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Yes, Run Auto-code"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showDeleteAllConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {t.templates.deleteAllConfirmTitle}
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {t.templates.deleteAllConfirmText}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="minimal-button-secondary flex-1"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={executeDeleteAll}
                  disabled={isSubmitting}
                  className="px-8 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all flex items-center gap-2 flex-1 justify-center"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  {t.templates.deleteAll.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        )}

        <MarkdownEditorModal
          isOpen={explorerMdModal !== null}
          onClose={() => setExplorerMdModal(null)}
          markdown={explorerMdModal?.draft ?? ""}
          onMarkdownChange={(value) =>
            setExplorerMdModal((prev) => (prev ? { ...prev, draft: value } : prev))
          }
          onSave={() => {
            if (!explorerMdModal) return;
            void saveExplorerMarkdownField({ ...explorerMdModal });
          }}
          sourceMeta={
            explorerMdModal?.questionId ? (
              <span className="font-mono font-semibold normal-case tracking-normal text-slate-500">
                {" "}
                ({explorerMdModal.questionId})
              </span>
            ) : undefined
          }
          pdfFileName={
            explorerMdModal?.questionId
              ? `template-question-${explorerMdModal.questionId}`
              : "template-markdown"
          }
        />

        {/* Delete Question Confirmation */}
        {showDeleteQuestionConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
            <div
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
                    {t.templates.deleteConfirmTitle}
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {t.templates.deleteConfirmText}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDeleteQuestionConfirm(null)}
                  className="minimal-button-secondary flex-1"
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={() => {
                    if (showDeleteQuestionConfirm) {
                      executeDeleteQuestion();
                    }
                  }}
                  disabled={isSubmitting}
                  className="px-8 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all flex items-center gap-2 flex-1 justify-center"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                  {t.common.delete.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation */}
        <AnimatePresence>
          {showBulkDeleteConfirm && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                    <Trash2 className="text-red-600" size={24} />
                  </div>
                  <p className="text-lg font-semibold text-slate-900 leading-relaxed">
                    {t.templates.bulkDeleteConfirmQuestion}
                  </p>
                </div>
                <div className="p-6 bg-slate-50 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteConfirm(false)}
                    className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900"
                  >
                    {t.common.no}
                  </button>
                  <button
                    type="button"
                    onClick={executeBulkDelete}
                    disabled={isSubmitting}
                    className="px-8 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all flex items-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : null}
                    {t.common.yes}
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Page Confirmation */}
        <AnimatePresence>
          {showDeletePageConfirm && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDeletePageConfirm(null)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                    <Trash2 className="text-red-600" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {t.templates.deletePageTitle}
                  </h3>
                  <p className="text-slate-500 leading-relaxed">
                    {t.templates.deletePageText}
                  </p>
                </div>
                <div className="p-6 bg-slate-50 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowDeletePageConfirm(null)}
                    className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={() => {
                      if (showDeletePageConfirm) {
                        executeDeletePage();
                      }
                    }}
                    disabled={isSubmitting}
                    className="px-8 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all flex items-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                    {t.common.delete}
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </AnimatePresence>

      <AnimatePresence>
        {showBulkAutoMappingModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[70]">
            <div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100"
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl mb-4">
                  <Loader2 size={32} className="animate-spin" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
                  AI is Mapping...
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  Processing {bulkMappingStatus.current} / {bulkMappingStatus.total} questions
                </p>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-violet-600 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(bulkMappingStatus.current / bulkMappingStatus.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {isBulkUpdateModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[70]">
            <div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Globe size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Bulk Update Domains
                  </h2>
                  <p className="text-slate-500 text-sm">
                    Assign domains to {filteredQuestions.length} visible questions.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 flex items-start gap-3">
                  <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-blue-600 leading-tight">
                    This will replace all existing domains for the questions currently filtered in the table.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Select Domains
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-1">
                    {domains.map((domain) => (
                      <button
                        key={domain.id}
                        onClick={() => {
                          setSelectedBulkDomainIds(prev => 
                            prev.includes(domain.id) 
                              ? prev.filter(id => id !== domain.id)
                              : [...prev, domain.id]
                          );
                        }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl text-left border transition-all text-xs",
                          selectedBulkDomainIds.includes(domain.id)
                            ? "bg-blue-600 text-white border-blue-600 shadow-md"
                            : "bg-white text-slate-600 border-slate-100 hover:border-slate-300"
                        )}
                      >
                        <Tags size={12} className={selectedBulkDomainIds.includes(domain.id) ? "text-blue-200" : "text-slate-400"} />
                        <span className="truncate">{domain.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIsBulkUpdateModalOpen(false)}
                    className="minimal-button-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkUpdateDomains}
                    disabled={isSubmitting}
                    className="minimal-button-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      `Update ${filteredQuestions.length} Questions`
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
);
}
