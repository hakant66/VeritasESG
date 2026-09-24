/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  History,
  ClipboardCheck,
  Search, 
  Filter, 
  Calendar, 
  User, 
  Database,
  ArrowRight,
  PlusCircle,
  Edit,
  Trash2,
  Clock,
  HelpCircle,
  Plus,
  Mail,
} from 'lucide-react';
import * as DB from '../../services/db';
import { AuditLog } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

import { useSettings } from '../../lib/SettingsContext';
import { HelpMarkdown } from '../../components/ui/HelpMarkdown';

import { useTranslation } from '../../hooks/useTranslation';
import {
  emailDeliveryStatusLabel,
  emailDeliveryStatusTone,
  isEmailDeliveryFailure,
  resolveEmailDeliveryStatus,
} from '../../lib/emailDeliveryStatus';

export default function AuditPage() {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterCollection, setFilterCollection] = useState<string>('all');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await DB.auditLogs.list(undefined, undefined, 500);
      setLogs(data || []);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
    } finally {
      setLoading(false);
    }
  }

  const collectionLabel = (collection: string) => {
    if (collection === 'emails') return t.audit.collectionEmails;
    return collection;
  };

  const isEmailLog = (log: AuditLog) => log.collection === 'emails';
  const isEmailFailed = (log: AuditLog) => {
    const delivery = resolveEmailDeliveryStatus(log);
    if (delivery) return isEmailDeliveryFailure(delivery);
    return isEmailLog(log) && /failed/i.test(log.details);
  };

  const deliveryStatusClass = (tone: ReturnType<typeof emailDeliveryStatusTone>) => {
    switch (tone) {
      case 'success':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'danger':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const collections = Array.from(new Set((logs || []).map(l => l.collection))).sort();

  const filteredLogs = (logs || []).filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.recordId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesCollection = filterCollection === 'all' || log.collection === filterCollection;

    return matchesSearch && matchesAction && matchesCollection;
  });

  const getActionIcon = (action: string, log?: AuditLog) => {
    if (log && isEmailLog(log)) {
      return <Mail size={14} className={isEmailFailed(log) ? 'text-red-600' : 'text-violet-600'} />;
    }
    switch (action) {
      case 'create': return <PlusCircle size={14} className="text-green-600" />;
      case 'update': return <Edit size={14} className="text-blue-600" />;
      case 'delete': return <Trash2 size={14} className="text-red-600" />;
      default: return <Clock size={14} className="text-slate-600" />;
    }
  };

  const getActionColor = (action: string, log?: AuditLog) => {
    if (log && isEmailLog(log)) {
      return isEmailFailed(log)
        ? 'bg-red-50 text-red-700 border-red-100'
        : 'bg-violet-50 text-violet-700 border-violet-100';
    }
    switch (action) {
      case 'create': return 'bg-green-50 text-green-700 border-green-100';
      case 'update': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'delete': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="p-8 w-full max-w-none space-y-8">
      <header className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-4">
            <ClipboardCheck className="text-blue-600" size={36} strokeWidth={2.5} />
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t.audit.title}</h1>
          </div>
          <p className="mt-1 text-lg font-light text-slate-500">{t.audit.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-start justify-end gap-3">
          {(settings.helpActivitiesUrl || settings.helpActivitiesMd) && (
            <button 
              type="button"
              onClick={() => setIsHelpModalOpen(true)}
              className="self-start rounded-xl border border-transparent p-2 text-slate-400 transition-all hover:border-slate-100 hover:bg-white hover:text-slate-900"
              title={t.audit.guidance}
            >
              <HelpCircle size={20} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setFilterCollection('emails');
              setFilterAction('all');
            }}
            className={cn(
              'flex shrink-0 items-center gap-2 self-start rounded-lg border px-4 py-2 text-sm font-medium transition-all',
              filterCollection === 'emails'
                ? 'border-violet-200 bg-violet-50 text-violet-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            <Mail size={16} />
            {t.audit.emailsOnly}
          </button>
          <button 
            type="button"
            onClick={loadLogs}
            disabled={loading}
            className="flex shrink-0 items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50"
          >
            <Clock size={16} className={cn(loading && "animate-spin")} />
            {t.audit.refresh}
          </button>
        </div>
      </header>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder={t.audit.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 md:bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 md:border-none md:p-0 md:bg-transparent">
            <Filter size={16} className="text-slate-400" />
            <select 
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="flex-1 text-sm font-bold uppercase tracking-widest text-slate-600 bg-transparent md:bg-slate-50 border-none rounded-md px-3 py-1.5 focus:ring-2 focus:ring-slate-200 outline-none cursor-pointer"
            >
              <option value="all">{t.audit.allActions}</option>
              <option value="create">{t.audit.created}</option>
              <option value="update">{t.audit.updated}</option>
              <option value="delete">{t.audit.deleted}</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 md:border-none md:p-0 md:bg-transparent">
            <Database size={16} className="text-slate-400" />
            <select 
              value={filterCollection}
              onChange={(e) => setFilterCollection(e.target.value)}
              className="flex-1 text-sm font-bold uppercase tracking-widest text-slate-600 bg-transparent md:bg-slate-50 border-none rounded-md px-3 py-1.5 focus:ring-2 focus:ring-slate-200 outline-none cursor-pointer"
            >
              <option value="all">{t.audit.allModules}</option>
              {(collections || []).map(c => (
                <option key={c} value={c}>{collectionLabel(c)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-100 shadow-sm border-dashed">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-medium">{t.audit.loadingLogs}</p>
          </div>
      ) : (
        <div className="notion-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.audit.time}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.audit.user}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.audit.action}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.audit.deliveryStatus}</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.audit.details}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={log.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{format(log.timestamp, 'MMM d, HH:mm')}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{format(log.timestamp, 'yyyy-MM-dd')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase border border-white">
                            {(log.userName || 'U').charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900">{log.userName}</div>
                            <div className="text-xs text-slate-400 font-mono">{log.userEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                          getActionColor(log.action, log)
                        )}>
                          {getActionIcon(log.action, log)}
                          {isEmailLog(log)
                            ? (isEmailFailed(log) ? t.audit.emailFailed : t.audit.emailSent)
                            : log.action}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isEmailLog(log) ? (
                          <div className="space-y-1">
                            <div
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border',
                                deliveryStatusClass(
                                  emailDeliveryStatusTone(resolveEmailDeliveryStatus(log)),
                                ),
                              )}
                            >
                              {emailDeliveryStatusLabel(
                                resolveEmailDeliveryStatus(log),
                                t.audit,
                              )}
                            </div>
                            {log.emailDeliveryDetail ? (
                              <div className="text-[10px] text-slate-500 max-w-[220px] line-clamp-2">
                                {log.emailDeliveryDetail}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                            {collectionLabel(log.collection)}
                          </span>
                          <span className="text-sm text-slate-600 line-clamp-2">{log.details}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-2 flex-wrap">
                          <span>ID: {log.recordId}</span>
                          {log.projectId ? (
                            <span className="text-slate-500">project: {log.projectId}</span>
                          ) : null}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      {t.audit.noLogs}
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {isHelpModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsHelpModalOpen(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full h-full max-w-none flex flex-col p-4 sm:p-12 relative z-10"
            >
              <div className="flex items-center justify-between mb-8 text-white">
                <div>
                  <h3 className="text-3xl font-bold font-display tracking-tight">
                    {t.audit.guidance}
                  </h3>
                  <div className="text-white/40 text-xs font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    {t.dashboard.interactiveTutorial}
                  </div>
                </div>
                <button 
                  onClick={() => setIsHelpModalOpen(false)}
                  className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-white transition-all active:scale-95 group"
                >
                  <Plus size={24} className="rotate-45 group-hover:rotate-[135deg] transition-transform duration-500" />
                </button>
              </div>

              <div className={cn(
                "flex-1 min-h-0 grid gap-8",
                settings.helpActivitiesMd ? "lg:grid-cols-2" : "grid-cols-1"
              )}>
                {/* Video Column */}
                <div className="bg-black rounded-[32px] overflow-hidden shadow-2xl border border-white/10 flex flex-col">
                  <div className="flex-1 relative">
                    {settings.helpActivitiesUrl ? (
                      <iframe 
                        src={settings.helpActivitiesUrl} 
                        loading="lazy" 
                        title="Tutorial Video" 
                        allowFullScreen 
                        className="absolute inset-0 w-full h-full border-none"
                        allow="autoplay; encrypted-media; fullscreen; microphone; screen-wake-lock;" 
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white/20 text-sm">
                        {t.dashboard.noVideo}
                      </div>
                    )}
                  </div>
                </div>

                {/* Markdown Column (Conditional) */}
                {settings.helpActivitiesMd && (
                  <div className="bg-white rounded-[32px] shadow-2xl border border-white/10 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                      <HelpMarkdown>{settings.helpActivitiesMd}</HelpMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
