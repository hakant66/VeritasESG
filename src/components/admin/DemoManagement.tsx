/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Building2,
  Tags,
  Users,
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { useAuth } from '../../lib/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { motion } from 'motion/react';

interface DemoSeedResponse {
  ok: boolean;
  log: string[];
  generatedAt?: string;
  stats?: Record<string, { created: number; updated: number }>;
  error?: string;
}

export default function DemoManagement() {
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const [status, setStatus] = useState<'idle' | 'seeding' | 'success' | 'error'>('idle');
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runSeed = async () => {
    if (!isAdmin) return;
    setStatus('seeding');
    setLog([]);
    addLog('Starting demo snapshot seeding...');

    try {
      const result = await apiRequest<DemoSeedResponse>('/api/demo/seed', { method: 'POST' });
      for (const line of result.log || []) {
        addLog(line);
      }
      if (!result.ok) {
        throw new Error(result.error || 'Demo seed failed.');
      }
      setStatus('success');
    } catch (err) {
      console.error(err);
      addLog(`CRITICAL ERROR: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('error');
    }
  };

  const statusLabel =
    status === 'idle'
      ? t.demoManagement.statusIdle
      : status === 'seeding'
        ? t.demoManagement.statusSeeding
        : status === 'success'
          ? t.demoManagement.statusSuccess
          : t.demoManagement.statusError;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="minimal-card p-8 bg-white shadow-xl shadow-slate-100 border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
              <Database size={160} />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                  <Database size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{t.demoManagement.title}</h2>
                  <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                    {t.demoManagement.subtitle}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-4 text-left sm:grid-cols-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2 text-slate-900">
                    <Tags size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">{t.demoManagement.customerSectorsTitle}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-light">{t.demoManagement.customerSectorsDesc}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2 text-slate-900">
                    <Building2 size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">{t.demoManagement.customersTitle}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-light">{t.demoManagement.customersDesc}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2 text-slate-900">
                    <Users size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">{t.demoManagement.usersProjectsTitle}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-light">{t.demoManagement.usersProjectsDesc}</p>
                </div>
              </div>

              <div className="pt-6">
                {status === 'idle' && (
                  <button
                    onClick={runSeed}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
                  >
                    {t.demoManagement.initButton}
                    <ArrowRight size={18} />
                  </button>
                )}
                {status === 'seeding' && (
                  <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-wait">
                    <Loader2 size={18} className="animate-spin" />
                    {t.demoManagement.seeding}
                  </div>
                )}
                {status === 'success' && (
                  <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-emerald-100">
                    <CheckCircle2 size={18} />
                    {t.demoManagement.demoReady}
                  </div>
                )}
                {status === 'error' && (
                  <div className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-red-100">
                    <AlertTriangle size={18} />
                    {t.demoManagement.initFailed}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="minimal-card p-6 bg-black text-emerald-400 overflow-hidden relative h-full flex flex-col border-slate-800 shadow-2xl shadow-emerald-900/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">{t.demoManagement.logTitle}</h3>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-900 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-900 animate-pulse delay-75" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-900 animate-pulse delay-150" />
              </div>
            </div>
            <div className="flex-1 font-mono text-[10px] space-y-2 overflow-y-auto max-h-[400px] scrollbar-hide pr-2">
              {log.length === 0 ? (
                <div className="flex flex-col gap-1 opacity-20">
                  <span className="text-emerald-900">{t.demoManagement.logIdle1}</span>
                  <span className="text-emerald-900">{t.demoManagement.logIdle2}</span>
                </div>
              ) : (
                log.map((line, idx) => (
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={idx}
                    className="flex gap-2"
                  >
                    <span className="text-emerald-900 shrink-0 select-none">[{idx.toString().padStart(3, '0')}]</span>
                    <span className="text-emerald-400/90 leading-tight">{line}</span>
                  </motion.div>
                ))
              )}
              {status === 'seeding' && (
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="text-emerald-400 font-bold"
                >
                  _
                </motion.div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-emerald-900/30 flex justify-between items-center text-[8px] text-emerald-900 font-bold uppercase tracking-widest">
              <span>{t.demoManagement.statusLabel}: {statusLabel}</span>
              <span>{t.demoManagement.bufferLabel.replace('{count}', String(log.length))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
