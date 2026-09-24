/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  FolderKanban, 
  History,
  ExternalLink,
  ChevronRight,
  Clock,
  Activity,
  Languages,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth, type TestRoleOverride } from '../../lib/AuthContext';
import * as DB from '../../services/db';
import { Project, AuditLog } from '../../types';
import { motion } from 'motion/react';
import { cn, formatDateTimeAt } from '../../lib/utils';
import { PaginationBar, type PageSizeOption } from '../../components/ui/PaginationBar';

import { useTranslation } from '../../hooks/useTranslation';
import { CANONICAL_PLATFORM_ROLES } from '../../lib/platformRoles.ts';

const TEST_ROLE_OPTIONS = [...CANONICAL_PLATFORM_ROLES] as TestRoleOverride[];

const ACTIVITY_PAGE_SIZE_OPTIONS: PageSizeOption[] = [10, 25, 50];

function getThreeMonthsAgoMs() {
  const since = new Date();
  since.setMonth(since.getMonth() - 3);
  return since.getTime();
}

export default function ProfilePage() {
  const {
    profile,
    actualProfile,
    testRoleOverride,
    setTestRoleOverride,
    refreshProfile,
    isTasksAndProfileOnly,
  } = useAuth();
  const { t, lang } = useTranslation();

  const canUseTestRoleSimulator = false; // Test mode disabled
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [auditHistory, setAuditHistory] = useState<AuditLog[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState<PageSizeOption>(10);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [projectNamesById, setProjectNamesById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  // Language adjustment
  const [selectedLang, setSelectedLang] = useState<'en' | 'tr'>(profile?.language || 'en');
  const [isUpdatingLang, setIsUpdatingLang] = useState(false);
  const [autoShowHelpOnOpen, setAutoShowHelpOnOpen] = useState<boolean>(
    profile?.autoShowHelpOnOpen === true,
  );
  const [isUpdatingHelpPref, setIsUpdatingHelpPref] = useState(false);
  const [showLangSaved, setShowLangSaved] = useState(false);
  const [showHelpSaved, setShowHelpSaved] = useState(false);

  useEffect(() => {
    if (profile?.language) {
      setSelectedLang(profile.language);
    }
  }, [profile?.language]);

  useEffect(() => {
    setAutoShowHelpOnOpen(profile?.autoShowHelpOnOpen === true);
  }, [profile?.autoShowHelpOnOpen]);

  useEffect(() => {
    async function loadProjects() {
      if (!profile?.id) return;
      setLoading(true);
      try {
        const projects = await DB.projects.list(profile.id);
        const projectList = projects || [];
        setAssignedProjects(projectList);

        const names: Record<string, string> = {};
        for (const p of projectList) {
          if (p.id && p.name) names[p.id] = p.name;
        }
        setProjectNamesById((prev) => ({ ...names, ...prev }));
      } catch (error) {
        console.error('Failed to load profile data:', error);
      } finally {
        setLoading(false);
      }
    }
    void loadProjects();
  }, [profile?.id]);

  useEffect(() => {
    async function loadActivities() {
      if (!profile?.id) return;
      setActivitiesLoading(true);
      try {
        const since = getThreeMonthsAgoMs();
        const skip = (activityPage - 1) * activityPageSize;
        const { items, total } = await DB.auditLogs.listPaged({
          userId: profile.id,
          since,
          skip,
          limit: activityPageSize,
        });
        const historyList = items || [];
        setAuditHistory(historyList);
        setActivityTotal(total);

        const totalPages = Math.max(1, Math.ceil(total / activityPageSize));
        if (activityPage > totalPages && total > 0) {
          setActivityPage(totalPages);
          return;
        }

        const missingIds = [
          ...new Set(
            historyList.map((l) => l.projectId).filter((id): id is string => !!id),
          ),
        ];
        if (missingIds.length > 0) {
          const extra = await Promise.all(missingIds.map((id) => DB.projects.get(id)));
          const resolved: Record<string, string> = {};
          for (const p of extra) {
            if (p?.id && p.name) resolved[p.id] = p.name;
          }
          if (Object.keys(resolved).length > 0) {
            setProjectNamesById((prev) => ({ ...prev, ...resolved }));
          }
        }
      } catch (error) {
        console.error('Failed to load profile activities:', error);
        setAuditHistory([]);
        setActivityTotal(0);
      } finally {
        setActivitiesLoading(false);
      }
    }
    void loadActivities();
  }, [profile?.id, activityPage, activityPageSize]);

  const handleLanguageChange = async (lang: 'en' | 'tr') => {
    if (!profile?.id || isUpdatingLang) return;
    
    setIsUpdatingLang(true);
    try {
      await DB.platformUsers.update(profile.id, { language: lang });
      await refreshProfile();
      setShowLangSaved(true);
      setTimeout(() => setShowLangSaved(false), 3000);
    } catch (error) {
      console.error("Failed to update language:", error);
    } finally {
      setIsUpdatingLang(false);
    }
  };

  const handleHelpAutoOpenChange = async (enabled: boolean) => {
    if (!profile?.id || isUpdatingHelpPref) return;

    setIsUpdatingHelpPref(true);
    try {
      await DB.platformUsers.update(profile.id, { autoShowHelpOnOpen: enabled });
      setAutoShowHelpOnOpen(enabled);
      await refreshProfile();
      setShowHelpSaved(true);
      setTimeout(() => setShowHelpSaved(false), 3000);
    } catch (error) {
      console.error('Failed to update help preference:', error);
      setAutoShowHelpOnOpen(profile?.autoShowHelpOnOpen === true);
    } finally {
      setIsUpdatingHelpPref(false);
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'platform_admin':
        return t.users.roles.platform_admin;
      case 'consultant_manager':
        return t.users.roles.consultant_manager;
      case 'consultant':
        return t.users.roles.consultant;
      case 'auditor':
        return t.users.roles.auditor;
      case 'contributor':
        return t.users.roles.contributor;
      case 'customer':
        return t.users.roles.customer;
      default:
        return role || t.common.none;
    }
  };

  const isTasksOnlyUser = isTasksAndProfileOnly;

  const getActivityIconColor = (log: AuditLog) => {
    switch (log.action) {
      case 'create':
        return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      case 'update':
        return 'text-amber-500 bg-amber-50 border-amber-100';
      case 'delete':
        return 'text-red-500 bg-red-50 border-red-100';
      default:
        return 'text-slate-500 bg-slate-50 border-slate-100';
    }
  };

  const getActivityTitle = (log: AuditLog) => {
    if (log.collection === 'answers' && log.details?.trim()) {
      return log.details;
    }
    const collectionLabel =
      log.collection.charAt(0).toUpperCase() + log.collection.slice(1);
    const actionLabel =
      log.action === 'create'
        ? t.audit.created
        : log.action === 'delete'
          ? t.audit.deleted
          : t.audit.updated;
    return `${collectionLabel} · ${actionLabel}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-6 p-4 sm:space-y-8 sm:p-6 lg:p-8">
      <header className="border-b border-slate-100 pb-4 sm:pb-6 lg:pb-8">
        <div className="mb-2 flex items-center gap-3 sm:gap-4">
          <User className="shrink-0 text-blue-600" size={32} strokeWidth={2.5} />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl xl:text-4xl">
            {t.profile.title}
          </h1>
        </div>
        <p className="mt-1 text-base font-light text-slate-500 sm:text-lg">{t.profile.description}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
        {/* Profile Card — full width on tablet; sidebar column on xl+ */}
        <div className="xl:col-span-1">
          <div className="minimal-card flex w-full max-w-none flex-col items-center space-y-4 p-6 text-center sm:p-8 xl:max-w-none">
            <div className="w-24 h-24 rounded-[32px] bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center font-bold text-3xl text-slate-900 overflow-hidden relative group">
              {profile?.avatarUrl ? (
                <img 
                  src={profile.avatarUrl} 
                  alt={profile.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                profile?.name?.[0].toUpperCase()
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Shield size={24} className="text-white" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-slate-900 leading-tight">{profile?.name}</h2>
              <div className="flex items-center justify-center gap-2 text-slate-500">
                <Mail size={14} />
                <span className="text-sm">{profile?.email}</span>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2 text-slate-500">
                <Clock size={14} className="shrink-0" />
                <span className="text-xs font-medium">
                  {t.profile.lastLoginAt}:{' '}
                  {formatDateTimeAt(profile?.lastLoginAt, lang) ?? t.profile.lastLoginNever}
                </span>
              </div>
            </div>

            <div className="pt-4 w-full">
              <div
                className={cn(
                  'space-y-3 rounded-2xl border p-4',
                  canUseTestRoleSimulator
                    ? 'border-amber-200 bg-amber-50/80'
                    : 'border-slate-100 bg-slate-50',
                )}
              >
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                  <span>{t.profile.currentRole}</span>
                  <Shield size={12} />
                </div>

                <div className="rounded-xl bg-slate-900 px-3 py-2 text-center text-sm font-bold text-white shadow-lg">
                  {getRoleLabel(profile?.role)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full pt-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.nav.projects}</p>
                <p className="text-xl font-bold text-slate-900">{(assignedProjects || []).length}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.profile.activities}</p>
                <p className="text-xl font-bold text-slate-900">{activityTotal}</p>
              </div>
            </div>

            {/* Language Selection */}
            <div className="pt-6 w-full text-left space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                <Languages size={14} />
                {t.common.language}
              </div>
              <select
                value={selectedLang}
                disabled={isUpdatingLang}
                onChange={(e) => {
                  const nextLang = e.target.value as 'en' | 'tr';
                  setSelectedLang(nextLang);
                  void handleLanguageChange(nextLang);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-slate-400 focus:ring-2 focus:ring-slate-900/10 disabled:opacity-60"
              >
                <option value="en">{t.common.english}</option>
                <option value="tr">{t.common.turkish}</option>
              </select>
              {showLangSaved && (
                <motion.p 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-emerald-600 font-bold text-center"
                >
                  {t.common.saved}
                </motion.p>
              )}
              {isUpdatingLang && (
                <div className="flex justify-center pt-1">
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                </div>
              )}
            </div>

            <div className="w-full text-left space-y-3">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {t.profile.helpAutoOpenLabel}
                </span>
                <input
                  type="checkbox"
                  checked={autoShowHelpOnOpen}
                  disabled={isUpdatingHelpPref}
                  onChange={(e) => {
                    void handleHelpAutoOpenChange(e.target.checked);
                  }}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-slate-900 focus:ring-slate-900/30 disabled:opacity-60"
                />
              </label>
              <p className="text-[10px] text-slate-500">
                {autoShowHelpOnOpen
                  ? t.profile.helpAutoOpenEnabled
                  : t.profile.helpAutoOpenDisabled}
              </p>
              {isUpdatingHelpPref ? (
                <div className="flex justify-center pt-1">
                  <Loader2 size={14} className="animate-spin text-slate-400" />
                </div>
              ) : null}
              {showHelpSaved ? (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] font-bold text-center text-emerald-600"
                >
                  {t.profile.helpPrefSaved}
                </motion.p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Projects + activities — stacked below profile until xl */}
        <div className="min-w-0 space-y-6 sm:space-y-8 xl:col-span-2">
          {/* Assigned Projects — hidden for tasks-only contributors (use Görevler) */}
          {!isTasksOnlyUser ? (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              <FolderKanban size={14} />
              {t.profile.assignedProjects}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(!assignedProjects || assignedProjects.length === 0) ? (
                <div className="col-span-full minimal-card p-12 text-center bg-slate-50/50">
                  <p className="text-slate-500 text-sm">{t.profile.noProjects}</p>
                </div>
              ) : (
                assignedProjects.map((project, idx) => (
                  <Link key={project.id} to={`/projects/${project.id}`}>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="minimal-card p-5 group hover:border-slate-900 transition-all cursor-pointer h-full flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-slate-600 transition-colors truncate">
                            {project.name}
                          </h3>
                          <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-900 transition-all transform group-hover:translate-x-1" />
                        </div>
                        <div className={cn(
                          "inline-flex px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                          project.status === 'active' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                        )}>
                          {project.status}
                        </div>
                      </div>
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white">
                            {profile?.name?.[0].toUpperCase()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-900" style={{ width: `${project.progress || 0}%` }} />
                          </div>
                          <span className="text-[9px] font-bold text-slate-500">{project.progress || 0}%</span>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))
              )}
            </div>
          </section>
          ) : null}

          {/* Audit History */}
          <section className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                <History size={14} />
                {t.profile.recentActivities}
              </div>
              <p className="text-xs text-slate-500">{t.profile.activitiesLast3Months}</p>
            </div>
            <div className="minimal-card overflow-hidden">
              <div className="divide-y divide-slate-100">
                {activitiesLoading ? (
                  <div className="flex items-center justify-center p-12">
                    <Loader2 size={24} className="animate-spin text-slate-400" />
                  </div>
                ) : (!auditHistory || auditHistory.length === 0) ? (
                  <div className="p-12 text-center text-slate-400 text-sm italic">
                    {t.profile.noActivities}
                  </div>
                ) : (
                  auditHistory.map((log, idx) => (
                    <motion.div 
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className={cn(
                        "p-2 rounded-xl border shrink-0",
                        getActivityIconColor(log)
                      )}>
                        <Activity size={16} />
                      </div>
                      <div className="min-w-0 flex-1 py-1">
                        <div className="flex items-center justify-between gap-4 mb-0.5">
                          <p className="text-sm font-bold text-slate-900 truncate" title={getActivityTitle(log)}>
                            {getActivityTitle(log)}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                            <Clock size={10} />
                            {formatDateTimeAt(log.timestamp, lang)}
                          </div>
                        </div>
                        {log.projectId && projectNamesById[log.projectId] ? (
                          <p
                            className="mt-0.5 truncate text-xs font-medium text-slate-500"
                            title={projectNamesById[log.projectId]}
                          >
                            {projectNamesById[log.projectId]}
                          </p>
                        ) : null}
                        {log.collection !== 'answers' && log.details ? (
                          <p className="text-xs text-slate-500 leading-relaxed truncate opacity-80" title={log.details}>
                            {log.details}
                          </p>
                        ) : null}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              {activityTotal > 0 ? (
                <div className="border-t border-slate-100 px-4 pb-4">
                  <PaginationBar
                    page={activityPage}
                    pageSize={activityPageSize}
                    totalItems={activityTotal}
                    onPageChange={setActivityPage}
                    onPageSizeChange={(size) => {
                      setActivityPageSize(size);
                      setActivityPage(1);
                    }}
                    pageSizeOptions={ACTIVITY_PAGE_SIZE_OPTIONS}
                    rangeSummaryTemplate={t.common.paginationRangeSummary}
                    perPageLabel={t.common.paginationPerPageLabel}
                    pageOfLabel={(c, tot) =>
                      t.common.paginationPageOf
                        .replace('{current}', String(c))
                        .replace('{total}', String(tot))
                    }
                    prevLabel={t.common.paginationPrev}
                    nextLabel={t.common.paginationNext}
                  />
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
