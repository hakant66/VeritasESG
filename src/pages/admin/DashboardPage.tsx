/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, type ReactNode } from 'react';
import { 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  ExternalLink,
  ClipboardList,
  Calendar,
  FolderKanban,
  LayoutDashboard,
  AlertCircle,
  User,
  MoreHorizontal,
  Database,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import * as DB from '../../services/db';
import { Project, Customer, Assignment } from '../../types';
import { motion } from 'motion/react';
import { useAuth } from '../../lib/AuthContext';
import { isCustomerPortalPlatformUser } from '../../lib/userRoles';
import { useSettings } from '../../lib/SettingsContext';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import {
  PageHelpFullModal,
  PageHelpHeaderButton,
} from '../../components/admin/PageHelpGuidance';

const dashboardListRowClass =
  'minimal-card p-4 sm:p-5 group flex min-h-[7.25rem] items-start gap-4 relative overflow-hidden';

function DashboardListCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(dashboardListRowClass, className)}>{children}</div>
  );
}

function DashboardEmptyListRow({
  message,
  icon: Icon,
}: {
  message: string;
  icon: LucideIcon;
}) {
  return (
    <DashboardListCard className="h-full items-start bg-slate-50/50">
      <Icon
        size={80}
        className="pointer-events-none absolute -right-4 -bottom-4 z-0 text-slate-100 opacity-75 transform -rotate-12"
      />
      <div className="relative z-10 hidden h-12 w-12 shrink-0 items-center justify-center self-start rounded-xl border border-slate-100 bg-slate-100 text-slate-300 lg:flex">
        <Icon size={24} />
      </div>
      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-start self-stretch pt-0.5">
        <h3 className="truncate text-lg font-bold leading-tight text-slate-500">{message}</h3>
      </div>
    </DashboardListCard>
  );
}

export default function DashboardPage() {
  const { profile, canListAllProjects } = useAuth();
  const isCustomerUser = isCustomerPortalPlatformUser(profile?.role);
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [projects, setProjects] = useState<(Project & { customerName?: string, customerLogoUrl?: string })[]>([]);
  const [userAssignments, setUserAssignments] = useState<(Assignment & { projectName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch projects (limit to 10 for dashboard) and customers
        const [projList, myAssignments] = await Promise.all([
          DB.projects.list(
            canListAllProjects ? undefined : profile?.id,
            canListAllProjects ? undefined : profile?.customerId,
          ),
          profile?.id ? DB.assignments.listByRecipient(profile.id) : Promise.resolve([]),
        ]);

        const safeMyAssignments = myAssignments || [];
        const safeProjList = projList || [];

        let custList: Customer[] = [];
        if (canListAllProjects) {
          custList = (await DB.customers.list(false)) || [];
        } else if (isCustomerUser && profile?.customerId) {
          custList = (await DB.customers.list(false, profile.customerId)) || [];
        } else {
          const customerIds = [
            ...new Set(
              safeProjList
                .map((p) => p.customerId)
                .filter((id): id is string => !!id),
            ),
          ];
          const fetched = await Promise.all(customerIds.map((id) => DB.customers.get(id)));
          custList = fetched.filter((c): c is Customer => !!c);
        }

        const safeCustList = custList;

        const custMap = new Map(safeCustList.map(c => [c.id, { name: c.name, logoUrl: c.logoUrl }]));
        
        // Fetch projects that the user has assignments for but isn't explicitly assigned to as a team member
        const missingProjIds = Array.from(new Set(safeMyAssignments.map(a => a.projectId)))
          .filter(id => id && !safeProjList.some(p => p.id === id));
        
        let additionalProjects: Project[] = [];
        if (missingProjIds.length > 0) {
          // Fetch missing projects in chunks of 30 (Firestore 'in' limit)
          const chunks = [];
          for (let i = 0; i < missingProjIds.length; i += 30) {
            chunks.push(missingProjIds.slice(i, i + 30));
          }
          
          const results = await Promise.all(chunks.map(async (chunk) => {
            const q = DB.query(DB.collection(DB.db, 'projects'), DB.where(DB.documentId(), 'in', chunk));
            const snap = await DB.getDocs(q);
            return (snap.docs || []).map(d => ({ id: d.id, ...d.data() } as Project));
          }));
          additionalProjects = results.flat().filter(Boolean);
        }

        const allVisibleProjectsRaw = [...safeProjList, ...additionalProjects];
        const allVisibleProjects = Array.from(new Map(allVisibleProjectsRaw.filter(p => p && p.id).map(p => [p.id, p])).values());
        const projMap = new Map(allVisibleProjects.map(p => [p.id, p]));

        setUserAssignments(Array.from(new Map(safeMyAssignments.map(a => [a.id, a])).values()).map(a => ({
          ...a,
          projectName: projMap.get(a.projectId)?.name || 'Unknown Project'
        })));

        const recentProjects = (allVisibleProjects || []).slice(0, 10);
        
        setProjects(recentProjects.map(p => {
          const customerInfo = custMap.get(p.customerId);
          return {
            ...p,
            customerName: customerInfo?.name || 'Unknown Customer',
            customerLogoUrl: customerInfo?.logoUrl,
            progress: p.progress || 0
          };
        }));
      } catch (err: any) {
        console.error("Dashboard error:", err);
        try {
          const detailed = JSON.parse(err.message);
          setError(detailed.error);
        } catch {
          setError("Failed to load dashboard data.");
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const avgProgress = projects.length > 0 
    ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length) 
    : 0;

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase();
  };

  const getRoleLabel = (role?: string) => {
    if (!role) return 'Unknown';
    switch (role) {
      case 'platform_admin':
        return t.users.roles.platform_admin;
      case 'consultant_manager':
        return t.users.roles.consultant_manager;
      case 'consultant':
        return t.users.roles.consultant;
      case 'customer':
        return t.users.roles.customer;
      case 'contributor':
        return t.users.roles.contributor;
      case 'auditor':
        return t.users.roles.auditor;
      default:
        return role;
    }
  };

  const stats = [
    { label: t.projects.title, value: projects.filter(p => p.status === 'active').length, icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-100', path: '/projects' },
    { label: t.dashboard.myTasks, value: userAssignments.length, icon: ClipboardList, color: 'text-green-600', bg: 'bg-green-100', path: '/tasks' },
  ];

  return (
    <div className="p-8 space-y-8 w-full max-w-none">
      <header className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-4">
            <LayoutDashboard className="text-blue-600" size={36} strokeWidth={2.5} />
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t.dashboard.title}</h1>
          </div>
          <p className="text-lg font-light text-slate-500">
            {t.dashboard.welcome}, {profile?.name}
          </p>
        </div>
        {(settings.helpDashboardUrl || settings.helpDashboardMd) && (
          <div className="flex shrink-0 items-start gap-2">
            <PageHelpHeaderButton
              helpUrl={settings.helpDashboardUrl || ''}
              helpMd={settings.helpDashboardMd || ''}
              isHelpModalOpen={isHelpModalOpen}
              setIsHelpModalOpen={setIsHelpModalOpen}
              title={t.dashboard.guidance}
            />
          </div>
        )}
      </header>

      {/* Stats Grid */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium flex items-center gap-3">
          <CheckCircle2 className="rotate-45" size={18} />
          {error}
        </div>
      )}

      {profile?.role && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex items-center gap-4 px-6 py-5 bg-red-50 text-red-800 rounded-2xl border border-red-100/50 shadow-sm relative overflow-hidden group"
        >
          <AlertCircle 
            size={100} 
            className="absolute -right-4 -bottom-4 text-red-200 opacity-30 pointer-events-none transform -rotate-12 group-hover:rotate-0 transition-transform duration-500" 
          />
          <p className="text-sm font-semibold tracking-tight leading-relaxed max-w-2xl relative z-10">
            {profile.role === 'platform_admin' && t.dashboard.disclaimers.platform_admin}
            {profile.role === 'customer' && t.dashboard.disclaimers.customer}
            {profile.role === 'contributor' && t.dashboard.disclaimers.contributor}
            {profile.role === 'consultant' && t.dashboard.disclaimers.consultant}
            {profile.role === 'consultant_manager' && t.dashboard.disclaimers.consultant_manager}
          </p>
        </motion.div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {stats.map((stat, idx) => {
          const Card = (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={cn(
                "minimal-card p-6 flex items-center gap-4 transition-all duration-300 h-full relative overflow-hidden",
                stat.path ? "hover:border-slate-900 group cursor-pointer" : ""
              )}
            >
              <stat.icon 
                size={80} 
                className="absolute -right-4 -bottom-4 text-slate-100 opacity-75 pointer-events-none transform -rotate-12 group-hover:rotate-0 transition-transform duration-500" 
              />
              <div className={cn(
                "hidden lg:flex p-3 rounded-lg bg-slate-50 text-slate-900 border border-slate-100 transition-colors shrink-0 relative z-10 items-center justify-center",
                stat.path ? "group-hover:bg-slate-900 group-hover:text-white" : ""
              )}>
                <stat.icon size={20} />
              </div>
              <div className="min-w-0 relative z-10">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {stat.path && <ExternalLink size={14} className="text-slate-300 group-hover:text-slate-900 transition-colors" />}
                </div>
              </div>
            </motion.div>
          );

          if (stat.path) {
            return (
              <Link key={stat.label} to={stat.path} className="block h-full">
                {Card}
              </Link>
            );
          }

          return Card;
        })}

        {/* Logged in User Card (Replaces Avg. Progress) */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="minimal-card p-6 flex items-center gap-4 transition-all duration-300 h-full relative overflow-hidden group hover:border-slate-900 cursor-pointer"
        >
          <Link to="/profile" className="absolute inset-0 z-20" />
          <User 
            size={80} 
            className="absolute -right-4 -bottom-4 text-slate-100 opacity-75 pointer-events-none transform -rotate-12 group-hover:rotate-0 transition-transform duration-500" 
          />
          <div className="hidden lg:flex w-12 h-12 rounded-xl bg-slate-100 text-slate-900 items-center justify-center font-bold text-lg shadow-sm overflow-hidden border border-slate-100 shrink-0 relative z-10">
            {profile?.avatarUrl ? (
              <img 
                src={profile.avatarUrl} 
                alt={profile.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{getInitials(profile?.name || 'User')}</span>
            )}
          </div>
          <div className="min-w-0 flex flex-col justify-center relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{t.dashboard.loggedInUser}</p>
            <div className="flex items-center gap-1.5 my-0.5 min-w-0">
              <p className="text-base font-bold text-slate-900 truncate leading-tight group-hover:text-slate-600 transition-colors">{profile?.name}</p>
              <ExternalLink size={14} className="text-slate-300 group-hover:text-slate-900 transition-colors shrink-0" />
            </div>
            <p className="text-[11px] text-slate-500 truncate mb-1 leading-tight">{profile?.email}</p>
            <div className="mt-0.5 flex items-center gap-2 text-left">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[#475569] text-[7.5px] font-black uppercase tracking-[0.08em] border border-slate-200/50">
                {getRoleLabel(profile?.role)}
              </span>
            </div>
          </div>
        </motion.div>


      </section>

      <section className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-2">
        {/* Recent Projects */}
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <FolderKanban size={14} className="text-slate-300" />
              {t.projects.title}
            </h2>
            <Link 
              to="/projects" 
              className="px-2 py-1 bg-slate-100 text-[9px] font-bold text-slate-600 uppercase tracking-widest rounded hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center gap-1"
            >
              {t.dashboard.goToProjects}
            </Link>
          </div>

          <div className="grid grid-cols-1 items-start gap-3">
            {loading ? (
              <div className="text-center p-12 text-slate-400">{t.common.loading}</div>
            ) : (projects || []).length === 0 ? (
              <DashboardEmptyListRow message={t.dashboard.noProjectsFound} icon={FolderKanban} />
            ) : (
              (projects || []).map((project, idx) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                >
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      dashboardListRowClass,
                      'cursor-pointer transition-all hover:border-slate-900',
                    )}
                  >
                    <FolderKanban 
                      size={80} 
                      className="absolute -right-4 -bottom-4 text-slate-100 opacity-75 pointer-events-none transform -rotate-12 group-hover:rotate-0 transition-transform duration-500" 
                    />
                    <div className="hidden lg:flex w-12 h-12 shrink-0 self-start rounded-xl border border-slate-100 bg-slate-900 text-lg font-bold text-white shadow-lg items-center justify-center overflow-hidden relative z-10 transition-transform group-hover:scale-105">
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
                      <div className="min-w-0 flex-1 flex flex-col gap-2 relative z-10">
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
                              {project.status}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full max-w-[200px] relative z-10">
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
                      <div className="relative z-10 shrink-0 self-center p-2 text-slate-300 transition-colors group-hover:text-slate-900">
                        <ExternalLink size={20} />
                      </div>
                  </motion.div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* My Assignments */}
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 flex-grow mr-8 flex items-center gap-2 border-none">
              <ClipboardList size={14} className="text-slate-300" />
              {t.dashboard.myTasks}
            </h2>
            <Link 
              to="/tasks" 
              className="px-2 py-1 bg-slate-100 text-[9px] font-bold text-slate-600 uppercase tracking-widest rounded hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center gap-1"
            >
              {t.dashboard.goToTasks}
            </Link>
          </div>

          <div
            className={cn(
              'grid grid-cols-1 gap-3',
              !loading && (userAssignments || []).length <= 1 && 'flex flex-1 flex-col',
            )}
          >
            {loading ? (
              <div className="text-center p-12 text-slate-400">{t.common.loading}</div>
            ) : (userAssignments || []).length === 0 ? (
              <div className="flex flex-1 flex-col">
                <DashboardEmptyListRow message={t.dashboard.noAssignments} icon={ClipboardList} />
              </div>
            ) : (
              (userAssignments || []).map((assignment, idx) => {
                const isOverdue = assignment.deadline ? (Date.now() > assignment.deadline && assignment.status === 'pending') : false;
                return (
                  <Link
                    key={assignment.id}
                    to="/tasks"
                    state={{ highlightAssignmentId: assignment.id }}
                    className={cn((userAssignments || []).length === 1 && 'flex flex-1 flex-col')}
                  >
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        dashboardListRowClass,
                        'cursor-pointer transition-all hover:border-slate-900',
                        (userAssignments || []).length === 1 && 'h-full',
                      )}
                    >
                      <ClipboardList 
                        size={80} 
                        className="absolute -right-4 -bottom-4 text-slate-100 opacity-75 pointer-events-none transform -rotate-12 group-hover:rotate-0 transition-transform duration-500" 
                      />
                      <div className={cn(
                        "hidden lg:flex w-12 h-12 rounded-xl items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0 border relative z-10",
                        assignment.status === 'completed' ? "bg-emerald-500 border-emerald-600 text-white" : 
                        isOverdue ? "bg-red-500 border-red-600 text-white animate-pulse" : 
                        "bg-slate-900 border-slate-800 text-white"
                      )}>
                        <ClipboardList size={24} />
                      </div>

                      <div className="min-w-0 flex-1 flex flex-col gap-2 relative z-10">
                        <div className="pr-8 relative">
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-slate-600 transition-colors truncate">
                            {assignment.projectName}
                          </h3>
                          <button className="absolute right-0 top-0 p-1 text-slate-300 hover:text-slate-600">
                            <MoreHorizontal size={18} />
                          </button>
                          
                          <div className="flex flex-wrap items-center gap-3 mt-0.5">
                            <div className={cn(
                              "px-2 py-0.5 rounded-full text-[7px] font-bold uppercase tracking-widest whitespace-nowrap",
                              assignment.status === 'completed' ? "bg-emerald-50 text-emerald-600" :
                              isOverdue ? "bg-red-50 text-red-600" :
                              "bg-blue-50 text-blue-600"
                            )}>
                              {assignment.status}
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                              <span className="text-slate-300">Q:</span>
                              {assignment.questionIds?.length || 0}
                            </div>

                            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                              <Calendar size={12} className="text-slate-300" />
                              {assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : 'No deadline'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-2 text-slate-300 group-hover:text-slate-900 transition-colors shrink-0 relative z-10">
                        <ExternalLink size={20} />
                      </div>
                    </motion.div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      <PageHelpFullModal
        helpUrl={settings.helpDashboardUrl || ''}
        helpMd={settings.helpDashboardMd || ''}
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        labels={{
          guidance: t.dashboard.guidance,
          dontShowOnFirstOpen: t.dashboard.dontShowOnFirstOpen,
          interactiveTutorial: t.dashboard.interactiveTutorial,
          noVideo: t.dashboard.noVideo,
          tourPrev: t.common.paginationPrev,
          tourNext: t.common.paginationNext,
        }}
      />
    </div>
  );
}
