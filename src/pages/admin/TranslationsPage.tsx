/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Languages, 
  Search, 
  Edit, 
  Clock, 
  Save, 
  X, 
  Plus, 
  RefreshCw,
  Filter,
  Trash2,
  AlertCircle
} from 'lucide-react';
import * as DB from '../../services/db';
import { Translation } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import { translations as staticTranslations } from '../../lib/i18n';
import { PaginationBar, type PageSizeOption } from '../../components/ui/PaginationBar';

export default function TranslationsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<PageSizeOption>(100);
  const [editingItem, setEditingItem] = useState<Translation | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newGroup, setNewGroup] = useState('common');

  useEffect(() => {
    loadTranslations();
  }, []);

  async function loadTranslations() {
    setLoading(true);
    try {
      const items = await DB.translations.list();
      setData(items || []);
    } catch (error) {
      console.error("Failed to load translations:", error);
    } finally {
      setLoading(false);
    }
  }

  const groups = useMemo(() => {
    const g = new Set<string>();
    data.forEach(item => {
      if (item.group) g.add(item.group);
    });
    return Array.from(g).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = 
        item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tr.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGroup = groupFilter === 'all' || item.group === groupFilter;

      return matchesSearch && matchesGroup;
    });
  }, [data, searchTerm, groupFilter]);

  const translationListPage = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
    return Math.min(Math.max(1, currentPage), totalPages);
  }, [filteredData.length, itemsPerPage, currentPage]);

  const paginatedData = useMemo(() => {
    const start = (translationListPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, translationListPage, itemsPerPage]);

  const handleUpdate = async (item: Translation) => {
    try {
      await DB.translations.update(item.id, {
        en: item.en,
        tr: item.tr,
        group: item.group
      });
      setData(prev => prev.map(p => p.id === item.id ? { ...p, ...item, updatedAt: Date.now() } : p));
      setEditingItem(null);
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this translation?")) return;
    try {
      await DB.translations.delete(id);
      setData(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const existingKeys = new Set(data.map(d => d.key));
      const newItems: Omit<Translation, 'id' | 'updatedAt'>[] = [];

      // Helper to flatten nested objects from i18n
      const flatten = (obj: any, prefix = '') => {
        Object.entries(obj).forEach(([key, val]) => {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof val === 'object' && val !== null) {
            flatten(val, fullKey);
          } else {
            if (!existingKeys.has(fullKey)) {
              // Try to find matching value in tr
              const group = fullKey.includes('.') ? fullKey.split('.')[0] : 'common';
              newItems.push({
                key: fullKey,
                en: String(val),
                tr: findInStatic(staticTranslations.tr, fullKey) || '',
                group
              });
            }
          }
        });
      };

      const findInStatic = (obj: any, path: string): string | null => {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
          if (current[part] === undefined) return null;
          current = current[part];
        }
        return typeof current === 'string' ? current : null;
      };

      flatten(staticTranslations.en);

      if (newItems.length === 0) {
        alert(t.translations.syncEmpty);
        return;
      }

      await DB.translations.bulkCreate(newItems);
      
      await loadTranslations();
      alert(t.translations.syncSuccess.replace('{n}', String(newItems.length)));
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreate = async () => {
    if (!newKey) return;
    try {
      await DB.translations.create({
        key: newKey,
        en: '',
        tr: '',
        group: newGroup
      });
      setNewKey('');
      setIsCreating(false);
      loadTranslations();
    } catch (error) {
      console.error("Create failed:", error);
    }
  };

  return (
    <div className="p-4 sm:p-8 w-full max-w-none space-y-8 overflow-x-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Languages className="text-blue-600" size={36} strokeWidth={2.5} />
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">
              {t.translations.title}
            </h1>
          </div>
          <p className="text-slate-500 font-light text-lg mt-1">{t.translations.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            disabled={isSyncing || loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-all disabled:opacity-50"
            title="Import keys from code"
          >
            <RefreshCw size={16} className={cn(isSyncing && "animate-spin")} />
            {t.translations.syncFromCode}
          </button>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 shadow-lg shadow-slate-900/10 transition-all"
          >
            <Plus size={16} />
            {t.translations.addKey}
          </button>
        </div>
      </header>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder={t.translations.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2 border border-slate-200">
          <Filter size={16} className="text-slate-400" />
          <select 
            value={groupFilter}
            onChange={(e) => {
              setGroupFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-sm font-bold uppercase tracking-widest text-slate-600 bg-transparent border-none focus:ring-0 outline-none cursor-pointer"
          >
            <option value="all">{t.translations.allGroups}</option>
            {groups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative min-h-[400px]">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-medium">{t.translations.loading}</p>
          </div>
        ) : (
          <>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-1/4">{t.translations.key}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-1/3">{t.translations.en}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-1/3">{t.translations.tr}</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-16">{t.translations.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length > 0 ? (
                  paginatedData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-mono text-slate-900 break-all">{item.key}</span>
                          {item.group && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                              Group: {item.group}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 line-clamp-2">{item.en || <span className="italic text-slate-300">Empty</span>}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 line-clamp-2">{item.tr || <span className="italic text-slate-300">Empty</span>}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button 
                            onClick={() => setEditingItem(item)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center">
                        <AlertCircle className="text-slate-200 mb-4" size={48} />
                        <p className="text-slate-400">{t.translations.noTranslations}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {filteredData.length > 0 ? (
              <div className="border-t border-slate-100 px-6 py-4">
                <PaginationBar
                  page={translationListPage}
                  pageSize={itemsPerPage}
                  totalItems={filteredData.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => {
                    setItemsPerPage(size);
                    setCurrentPage(1);
                  }}
                  pageSizeOptions={[25, 50, 100, 200, 250]}
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
          </>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{t.translations.editTitle}</h3>
                  <code className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded mt-1 inline-block">
                    {editingItem.key}
                  </code>
                </div>
                <button onClick={() => setEditingItem(null)} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.translations.en}</label>
                  <textarea 
                    value={editingItem.en}
                    onChange={(e) => setEditingItem({ ...editingItem, en: e.target.value })}
                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{t.translations.tr}</label>
                  <textarea 
                    value={editingItem.tr}
                    onChange={(e) => setEditingItem({ ...editingItem, tr: e.target.value })}
                    className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Group</label>
                  <input 
                    type="text"
                    value={editingItem.group || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, group: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  />
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setEditingItem(null)}
                  className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  {t.translations.cancel}
                </button>
                <button 
                  onClick={() => handleUpdate(editingItem)}
                  className="flex items-center gap-2 px-8 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
                >
                  <Save size={16} />
                  {t.translations.saveChanges}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">{t.translations.addTitle}</h3>
                <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Key Path</label>
                  <input 
                    type="text"
                    placeholder="e.g. common.save"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  />
                  <p className="text-[10px] text-slate-400 italic">Use dot notation for grouping (e.g. common.cancel)</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Initial Group</label>
                  <input 
                    type="text"
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  />
                </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  {t.translations.cancel}
                </button>
                <button 
                  onClick={handleCreate}
                  disabled={!newKey}
                  className="flex items-center gap-2 px-8 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  <Plus size={16} />
                  {t.translations.addKey}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
