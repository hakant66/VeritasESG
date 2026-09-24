/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FolderKanban,
  Search,
  Loader2,
  Calendar,
  Plus,
  Filter,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import * as DB from '../../services/db';
import { Project, Customer, Segment } from '../../types';
import { cn } from '../../lib/utils';
import { setSidebarNavContext } from '../../lib/sidebarNavContext';
import { motion } from 'motion/react';

import { useAuth } from '../../lib/AuthContext';
import {
  isAuditorPlatformUser,
  isCustomerPortalPlatformUser,
} from '../../lib/userRoles';
import { useSettings } from '../../lib/SettingsContext';
import { useTranslation } from '../../hooks/useTranslation';
import { NewProjectLaunchModal } from '../../components/project/NewProjectLaunchModal';
import { PaginationBar, type PageSizeOption } from '../../components/ui/PaginationBar';
import {
  PageHelpFullModal,
  PageHelpHeaderButton,
} from '../../components/admin/PageHelpGuidance';

export default function ProjectsPage() {
  const location = useLocation();
  const { profile, user, canListAllProjects, canCreateCustomersAndProjects } = useAuth();
  const isPlatformAuditor = isAuditorPlatformUser(profile?.role);
  const isCustomerUser = isCustomerPortalPlatformUser(profile?.role);
  const memberId = user?.uid || profile?.id;
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [projects, setProjects] = useState<(Project & { customerName?: string, customerLogoUrl?: string, customerSectorIds?: string[] })[]>([]);
  const [availableSectors, setAvailableSectors] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed' | 'archived'>('active');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [projectListPage, setProjectListPage] = useState(1);
  const [projectPageSize, setProjectPageSize] = useState<PageSizeOption>(10);
  const [showNewProject, setShowNewProject] = useState(false);
  const pageTitle = t.projects.title;
  const pageSearchPlaceholder = t.projects.searchPlaceholder;
  const pageCreateLabel = t.projects.createNewProject;
  const PageIcon = FolderKanban;

  useEffect(() => {
    loadSectors();
    loadAllProjects();
  }, []);

  useEffect(() => {
    setSidebarNavContext('projects');
  }, []);

  async function loadSectors() {
    try {
      const data = await DB.segments.list();
      setAvailableSectors(data);
    } catch (error) {
      console.error("Failed to load segments:", error);
    }
  }

  async function loadAllProjects() {
    setLoading(true);
    setError(null);
    try {
      const pListRaw = canListAllProjects
        ? await DB.projects.list()
        : isPlatformAuditor && memberId
          ? await DB.projects.list(memberId, undefined, false, 'auditor')
          : await DB.projects.list(memberId, profile?.customerId, false);

      const safePListRaw = pListRaw || [];

      let custList: Customer[] = [];
      if (canListAllProjects) {
        custList = (await DB.customers.list(false)) || [];
      } else if (isCustomerUser && profile?.customerId) {
        custList = (await DB.customers.list(false, profile.customerId)) || [];
      } else {
        const customerIds = [
          ...new Set(
            safePListRaw
              .map((p) => p.customerId)
              .filter((id): id is string => !!id),
          ),
        ];
        const fetched = await Promise.all(customerIds.map((id) => DB.customers.get(id)));
        custList = fetched.filter((c): c is Customer => !!c);
      }

      const safeCustList = custList;

      const customersMap = safeCustList.reduce((acc, c) => {
        if (c && c.id) {
          acc[c.id] = { name: c.name, sectorIds: c.sectorIds || [], logoUrl: c.logoUrl };
        }
        return acc;
      }, {} as Record<string, { name: string, sectorIds: string[], logoUrl?: string }>);

      const pList = safePListRaw.map(data => {
        if (!data) return null;
        const customerId = data.customerId;
        const progress = data.progress || 0;
        const customerInfo = customerId ? customersMap[customerId] : null;

        return {
          ...data,
          customerName: customerInfo?.name || 'Unknown Customer',
          customerLogoUrl: customerInfo?.logoUrl,
          customerSectorIds: customerInfo?.sectorIds || [],
          progress
        } as Project & { customerName: string, customerLogoUrl?: string, customerSectorIds: string[] };
      }).filter((p): p is (Project & { customerName: string; customerLogoUrl?: string; customerSectorIds: string[] }) => p !== null);

      // Sort by startDate or createdAt desc
      pList.sort((a, b) => {
        const dateA = a.startDate || new Date(a.createdAt || 0).toISOString();
        const dateB = b.startDate || new Date(b.createdAt || 0).toISOString();
        return dateB.localeCompare(dateA);
      });
      setProjects(pList);
    } catch (err: any) {
      console.error("Failed to load projects:", err);
      try {
        const detailed = JSON.parse(err.message);
        setError(detailed.error);
      } catch {
        setError("Failed to load projects.");
      }
    } finally {
      setLoading(false);
    }
  }

  const filteredProjects = (projects || []).filter(p => {
    if (!p) return false;
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (p.customerName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setProjectListPage(1);
  }, [searchQuery, statusFilter, projectPageSize]);

  const currentProjectPage = Math.min(Math.max(1, projectListPage), Math.max(1, Math.ceil(filteredProjects.length / projectPageSize)));
  const paginatedProjects = useMemo(() => {
    const start = (currentProjectPage - 1) * projectPageSize;
    return filteredProjects.slice(start, start + projectPageSize);
  }, [filteredProjects, currentProjectPage, projectPageSize]);

  const getStatusLabel = (status: Project['status']) => {
    if (status === 'active') return t.projects.statusActive;
    if (status === 'closed') return t.projects.statusClosed;
    if (status === 'archived') return t.projects.statusArchived;
    return status;
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-4">
        <Loader2 className="animate-spin text-slate-900" size={32} />
        <p className="text-sm font-medium animate-pulse">{t.projects.loadingProjects}</p>
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-none space-y-8">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start">
        <div>
          <div className="mb-2 flex items-center gap-4">
            <PageIcon className="text-blue-600" size={36} strokeWidth={2.5} />
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">{pageTitle}</h1>
          </div>
          <p className="mt-1 text-lg font-light text-slate-500">{t.projects.subtitle}</p>
        </div>

        <div className="ml-auto flex shrink-0 items-start gap-3">
          {(settings.helpProjectsUrl || settings.helpProjectsMd) && (
            <PageHelpHeaderButton
              helpUrl={settings.helpProjectsUrl || ''}
              helpMd={settings.helpProjectsMd || ''}
              isHelpModalOpen={isHelpModalOpen}
              setIsHelpModalOpen={setIsHelpModalOpen}
              title={t.dashboard.guidance}
            />
          )}
        </div>
      </header>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full">
        <div className="relative flex-1 group">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-slate-700 group-focus-within:text-slate-900"
            size={14}
          />
          <input
            type="text"
            placeholder={pageSearchPlaceholder}
            className="relative w-full bg-white pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm shadow-sm outline-none transition-all focus:ring-1 focus:ring-slate-900"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative group md:min-w-[240px]">
          <Filter
            className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-slate-700 group-focus-within:text-slate-900"
            size={14}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="relative w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm outline-none transition-all focus:ring-1 focus:ring-slate-900"
          >
            <option value="active">
              {t.projects.activeProjects}
            </option>
            <option value="closed">
              {t.projects.closedProjects}
            </option>
            <option value="archived">
              {t.projects.archivedProjects}
            </option>
            <option value="all">
              {t.projects.allProjects}
            </option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-slate-900 transition-colors">
            <ChevronDown size={14} />
          </div>
        </div>
        {canCreateCustomersAndProjects && (
          <div className="md:pl-4 md:border-l md:border-slate-100 flex items-center">
            <button
              type="button"
              onClick={() => setShowNewProject(true)}
              className="group relative flex cursor-pointer items-center gap-2 rounded-xl border border-blue-100/80 bg-blue-50 px-4 py-2.5 text-left shadow-sm transition-all hover:border-blue-200 hover:bg-blue-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <Plus size={16} strokeWidth={2.5} className="shrink-0 text-blue-600" aria-hidden />
              <span className="min-w-0 text-sm font-semibold leading-relaxed tracking-tight text-blue-950">
                {pageCreateLabel}
              </span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium flex items-center gap-3">
          <Calendar className="rotate-45" size={18} />
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Table / list area: rows or empty state */}
        {paginatedProjects.map((project, idx) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            state={{ sidebarNav: 'projects' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="minimal-card relative overflow-hidden p-4 sm:p-5 group flex items-center gap-4 hover:border-slate-900 transition-all cursor-pointer"
            >
              <PageIcon
                size={80}
                strokeWidth={2}
                className="pointer-events-none absolute -right-4 -bottom-4 z-0 text-slate-100 opacity-75 transform -rotate-12 transition-transform duration-500 group-hover:rotate-0"
                aria-hidden
              />
              <div className="relative z-10 hidden sm:flex w-12 h-12 bg-slate-900 text-white rounded-xl items-center justify-center font-bold text-lg shadow-lg group-hover:scale-105 transition-transform overflow-hidden border border-slate-100 shrink-0">
                {project.customerLogoUrl ? (
                  <img 
                    src={project.customerLogoUrl} 
                    alt={project.customerName} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{project.customerName?.[0]}</span>
                )}
              </div>
              <div className="relative z-10 min-w-0 flex-1 flex flex-col gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-slate-600 transition-colors truncate">{project.name}</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest truncate">{project.customerName}</span>
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[7px] font-bold uppercase tracking-widest whitespace-nowrap",
                      project.status === 'closed' ? "bg-emerald-50 text-emerald-600" :
                      project.status === 'active' ? "bg-blue-50 text-blue-600" :
                      "bg-slate-100 text-slate-500"
                    )}>
                      {getStatusLabel(project.status)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full max-w-[200px]">
                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${project.progress}%` }}
                      className={cn(
                        "h-full transition-all duration-500",
                        project.progress === 100 ? "bg-emerald-500" : "bg-slate-900"
                      )}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0">{project.progress}%</span>
                </div>
              </div>
              <div className="relative z-10 flex shrink-0 items-center gap-2">
                <div
                  className="p-2 text-slate-400 transition-colors group-hover:text-slate-900"
                  title={t.projects.openProject}
                  aria-hidden
                >
                  <Search size={20} />
                </div>
              </div>
            </motion.div>
          </Link>
        ))}

        {filteredProjects.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white py-20 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <PageIcon size={32} strokeWidth={2} aria-hidden />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {t.projects.projectsEmptyStateTitle}
            </h3>
            <p className="mx-auto mt-2 max-w-md px-4 text-sm text-slate-500">
              {projects.length > 0
                ? t.projects.noProjectsMatched
                : t.projects.projectsEmptyNoProjectsYet}
            </p>
          </div>
        )}

        {filteredProjects.length > 0 && (
          <PaginationBar
            page={currentProjectPage}
            pageSize={projectPageSize}
            totalItems={filteredProjects.length}
            onPageChange={setProjectListPage}
            onPageSizeChange={setProjectPageSize}
            rangeSummaryTemplate={t.common.paginationRangeSummary}
            perPageLabel={t.common.paginationPerPageLabel}
            pageOfLabel={(c, tot) =>
              t.common.paginationPageOf.replace('{current}', String(c)).replace('{total}', String(tot))
            }
            prevLabel={t.common.paginationPrev}
            nextLabel={t.common.paginationNext}
          />
        )}

      </div>

      <NewProjectLaunchModal
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        onCreated={loadAllProjects}
        initialCategory="Project"
      />

      <PageHelpFullModal
        helpUrl={settings.helpProjectsUrl || ''}
        helpMd={settings.helpProjectsMd || ''}
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        labels={{
          guidance: t.dashboard.guidance,
          dontShowOnFirstOpen: t.dashboard.dontShowOnFirstOpen,
          interactiveTutorial: t.dashboard.interactiveTutorial,
          noVideo: t.dashboard.noVideo,
        }}
      />
    </div>
  );
}
