import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Download, Upload, ChevronDown, GripVertical } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { cn } from '../../lib/utils';
import * as XLSX from 'xlsx';

interface GRIMatrixRow {
  id: string;
  order: number;
  subject: string;
  griMapping: string;
  disclosures: string;
  notes?: string;
}

interface GRIMaterialityTabProps {
  customerId: string;
  framework?: 'gri' | 'esrs' | 'issb';
}

export function GRIMaterialityTab({ customerId, framework = 'gri' }: GRIMaterialityTabProps) {
  const frameworkLabel =
    framework === 'gri' ? 'GRI Eşleşmesi' :
    framework === 'esrs' ? 'ESRS Standartı' :
    'IFRS Standartı';
  const [rows, setRows] = useState<GRIMatrixRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<GRIMatrixRow> | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await apiRequest<{ rows: GRIMatrixRow[] }>(
        `/api/gri-materiality?customerId=${encodeURIComponent(customerId)}`,
      );
      setRows(data.rows || []);
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Veriler yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const addRow = useCallback(async () => {
    setSaving('new');
    setMessage(null);
    try {
      const result = await apiRequest<{ row: GRIMatrixRow }>(
        '/api/gri-materiality',
        {
          method: 'POST',
          body: JSON.stringify({
            customerId,
            subject: 'Yeni Materiality Konusu',
            griMapping: '',
            disclosures: '',
            notes: '',
          }),
        },
      );
      setRows((prev) => [...prev, result.row]);
      setMessage({ ok: true, text: 'Satır eklendi' });
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Satır eklenemedi.' });
    } finally {
      setSaving(null);
    }
  }, [customerId]);

  const deleteRows = useCallback(async (ids: string[]) => {
    setSaving('delete');
    setMessage(null);
    try {
      await Promise.all(
        ids.map((id) =>
          apiRequest(`/api/gri-materiality/${id}`, { method: 'DELETE' }),
        ),
      );
      setRows((prev) => prev.filter((r) => !ids.includes(r.id)));
      setSelected(new Set());
      setMessage({ ok: true, text: `${ids.length} satır silindi` });
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Satırlar silinemedi.' });
    } finally {
      setSaving(null);
    }
  }, []);

  const startEdit = useCallback((row: GRIMatrixRow) => {
    setEditingId(row.id);
    setEditForm(row);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId || !editForm) return;
    setSaving(editingId);
    setMessage(null);
    try {
      const result = await apiRequest<{ row: GRIMatrixRow }>(
        `/api/gri-materiality/${editingId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            subject: editForm.subject,
            griMapping: editForm.griMapping,
            disclosures: editForm.disclosures,
            notes: editForm.notes,
          }),
        },
      );
      setRows((prev) =>
        prev.map((r) => (r.id === editingId ? result.row : r)),
      );
      setEditingId(null);
      setEditForm(null);
      setMessage({ ok: true, text: 'Kaydedildi' });
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Kaydedilemedi.' });
    } finally {
      setSaving(null);
    }
  }, [editingId, editForm]);

  const exportToExcel = useCallback(() => {
    if (rows.length === 0) {
      setMessage({ ok: false, text: 'Dışa aktarılacak satır yok.' });
      return;
    }

    const data = rows.map((row) => ({
      No: row.order + 1,
      'Materiality konusu': row.subject,
      'Ana GRI eşleşmesi': row.griMapping,
      'İlgili GRI disclosure / clause': row.disclosures,
      Not: row.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GRI Materiality');

    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 35 },  // Materiality konusu
      { wch: 30 },  // Ana GRI eşleşmesi
      { wch: 35 },  // İlgili GRI disclosure
      { wch: 40 },  // Not
    ];

    XLSX.writeFile(wb, `GRI-Materiality-Matrix-${customerId}-${new Date().toISOString().split('T')[0]}.xlsx`);
    setMessage({ ok: true, text: 'Excel dosyası indirildi' });
  }, [rows, customerId]);

  const importFromExcel = useCallback(async (file: File) => {
    setSaving('import');
    setMessage(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });

      const importRows = data.map((row) => ({
        subject: row['Materiality konusu'] || row.subject || '',
        griMapping: row['Ana GRI eşleşmesi'] || row.griMapping || '',
        disclosures: row['İlgili GRI disclosure / clause'] || row.disclosures || '',
        notes: row.Not || row.notes || '',
      }));

      if (importRows.some((r) => !r.subject || !r.griMapping || !r.disclosures)) {
        throw new Error('Eksik alanlar: Tüm satırlar "Materiality konusu", "Ana GRI eşleşmesi" ve "İlgili GRI disclosure" alanlarına sahip olmalıdır.');
      }

      await apiRequest('/api/gri-materiality/import', {
        method: 'POST',
        body: JSON.stringify({ customerId, rows: importRows }),
      });

      await loadRows();
      setMessage({ ok: true, text: `${importRows.length} satır içe aktarıldı` });
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'İçe aktarma başarısız oldu.' });
    } finally {
      setSaving(null);
    }
  }, [customerId, loadRows]);

  const handleImportClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) void importFromExcel(file);
    };
    input.click();
  }, [importFromExcel]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  }, [rows, selected.size]);

  if (loading) {
    return <div className="text-sm text-slate-500">Yükleniyor…</div>;
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={cn(
            'rounded-lg px-4 py-2.5 text-sm',
            message.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
          )}
        >
          {message.text}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
        <button
          type="button"
          disabled={saving !== null}
          onClick={addRow}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-900 text-white transition-colors disabled:opacity-50"
        >
          <Plus size={16} /> Satır Ekle
        </button>

        {selected.size > 0 && (
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => deleteRows(Array.from(selected))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} /> {selected.size} Sil
          </button>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={exportToExcel}
          disabled={rows.length === 0 || saving !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors disabled:opacity-50"
        >
          <Download size={16} /> Excel İndir
        </button>

        <button
          type="button"
          onClick={handleImportClick}
          disabled={saving !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors disabled:opacity-50"
        >
          <Upload size={16} /> Excel Yükle
        </button>
      </div>

      {/* Table-like list */}
      {rows.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <p>Henüz satır bulunmamaktadır. Başlamak için bir satır ekleyin.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header row (select all) */}
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={selected.size === rows.length && rows.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 cursor-pointer"
            />
            <div className="w-6" />
            <div className="flex-1">Materiality Konusu</div>
            <div className="w-32">{frameworkLabel}</div>
            <div className="w-20" />
          </div>

          {/* Data rows */}
          {rows.map((row) => (
            <div key={row.id}>
              {editingId === row.id && editForm ? (
                /* Edit mode */
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Materiality Konusu *
                    </label>
                    <input
                      type="text"
                      value={editForm.subject || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, subject: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ana GRI Eşleşmesi *
                    </label>
                    <input
                      type="text"
                      value={editForm.griMapping || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, griMapping: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      İlgili GRI Disclosure / Clause *
                    </label>
                    <textarea
                      value={editForm.disclosures || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, disclosures: e.target.value })
                      }
                      rows={3}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Notlar
                    </label>
                    <textarea
                      value={editForm.notes || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, notes: e.target.value })
                      }
                      rows={2}
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-3 py-1.5 text-sm rounded bg-slate-200 hover:bg-slate-300 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={saving === row.id}
                      className="px-3 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                    >
                      {saving === row.id ? 'Kaydediliyor…' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  <div
                    className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpandedId(
                        expandedId === row.id ? null : row.id,
                      )
                    }
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <div className="w-6 text-slate-400 flex-shrink-0">
                      <GripVertical size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {row.subject}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {row.griMapping}
                      </p>
                    </div>
                    <div className="w-32 text-xs text-slate-500 truncate px-2">
                      {row.disclosures.split(';')[0]}...
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(row);
                      }}
                      className="px-3 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      Düzenle
                    </button>
                    <ChevronDown
                      size={18}
                      className={cn(
                        'text-slate-400 transition-transform',
                        expandedId === row.id ? 'rotate-180' : '',
                      )}
                    />
                  </div>

                  {/* Expanded view */}
                  {expandedId === row.id && (
                    <div className="bg-slate-50 border border-t-0 border-slate-200 rounded-b-lg px-4 py-3 space-y-2 text-sm">
                      <div>
                        <span className="font-semibold text-slate-700">
                          Materiality Konusu:
                        </span>
                        <p className="text-slate-600 mt-1">{row.subject}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">
                          Ana GRI Eşleşmesi:
                        </span>
                        <p className="text-slate-600 mt-1">{row.griMapping}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">
                          İlgili GRI Disclosure / Clause:
                        </span>
                        <p className="text-slate-600 mt-1 whitespace-pre-wrap">
                          {row.disclosures}
                        </p>
                      </div>
                      {row.notes && (
                        <div>
                          <span className="font-semibold text-slate-700">
                            Notlar:
                          </span>
                          <p className="text-slate-600 mt-1 whitespace-pre-wrap">
                            {row.notes}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="px-3 py-1.5 text-xs rounded bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRows([row.id])}
                          className="px-3 py-1.5 text-xs rounded bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
