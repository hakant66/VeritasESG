import { useCallback, useEffect, useState } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { cn } from '../../lib/utils';
import { MaterialityScoreCsvButtons } from './MaterialityScoreCsvButtons';

interface ESRSScore {
  id: string;
  order: number;
  subject: string;
  griMapping: string;
  disclosures: string;
  notes: string;
  financialImpact: number;
  impactSeverity: number;
  probability: number;
  stakeholderConcern: number;
  isMaterial: boolean;
  hasScore: boolean;
}

interface ESRSScoringTabProps {
  customerId: string;
  year: number;
}

const ScoreButton = ({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        disabled={disabled}
        onClick={() => onChange(n)}
        className={cn(
          'w-7 h-7 text-xs font-bold transition-colors disabled:cursor-not-allowed',
          value >= n
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 text-slate-400 hover:bg-slate-200 disabled:hover:bg-slate-100',
        )}
      >
        {n}
      </button>
    ))}
  </div>
);

export function ESRSScoringTab({ customerId, year }: ESRSScoringTabProps) {
  const [rows, setRows] = useState<ESRSScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await apiRequest<{ rows: ESRSScore[] }>(
        `/api/dma/esrs-assessment?customerId=${encodeURIComponent(customerId)}&year=${year}`,
      );
      setRows(data.rows || []);
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Veriler yüklenemedi.' });
    } finally {
      setLoading(false);
    }
  }, [customerId, year]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateScore = useCallback((rowId: string, field: string, value: number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              [field]: value,
              isMaterial:
                field === 'financialImpact' ||
                field === 'impactSeverity' ||
                field === 'stakeholderConcern' ||
                field === 'probability'
                  ? value >= 4 ||
                    (field === 'financialImpact' ? value : r.financialImpact) >= 4 ||
                    (field === 'impactSeverity' ? value : r.impactSeverity) >= 4 ||
                    (field === 'stakeholderConcern' ? value : r.stakeholderConcern) >= 4
                  : r.isMaterial,
            }
          : r,
      ),
    );
  }, []);

  const saveAll = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const scores = rows.map((r) => ({
        esrsRowId: r.id,
        subject: r.subject,
        financialImpact: r.financialImpact,
        impactSeverity: r.impactSeverity,
        probability: r.probability,
        stakeholderConcern: r.stakeholderConcern,
      }));

      await apiRequest('/api/dma/esrs-assessment/scores', {
        method: 'POST',
        body: JSON.stringify({ customerId, year, scores }),
      });

      setMessage({ ok: true, text: 'Puanlamalar kaydedildi' });
    } catch (err: any) {
      setMessage({ ok: false, text: err?.message || 'Kaydedilemedi.' });
    } finally {
      setSaving(false);
    }
  }, [rows, customerId, year]);

  const handleCsvImported = useCallback(
    async (next: ESRSScore[]) => {
      setRows(next);
      setSaving(true);
      setMessage(null);
      try {
        const scores = next.map((r) => ({
          esrsRowId: r.id,
          subject: r.subject,
          financialImpact: r.financialImpact,
          impactSeverity: r.impactSeverity,
          probability: r.probability,
          stakeholderConcern: r.stakeholderConcern,
        }));
        await apiRequest('/api/dma/esrs-assessment/scores', {
          method: 'POST',
          body: JSON.stringify({ customerId, year, scores }),
        });
      } catch (err: any) {
        setMessage({ ok: false, text: err?.message || 'CSV kaydı başarısız.' });
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [customerId, year],
  );

  const resetScores = useCallback(() => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        financialImpact: 0,
        impactSeverity: 0,
        probability: 0,
        stakeholderConcern: 0,
        isMaterial: false,
      })),
    );
  }, []);

  const materialCount = rows.filter((r) => r.isMaterial).length;

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

      {/* Header Summary */}
      <div className="flex items-center justify-between gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div>
          <p className="text-sm text-blue-900 font-semibold">
            Toplam: {rows.length} konu → {materialCount} Önemli
          </p>
          <p className="text-xs text-blue-700 mt-1">
            1-5 arası puan girerek ESRS/CRDS materiyallik kriterlerini belirleyin. 4 ve üzeri puan "Önemli" olarak işaretler.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MaterialityScoreCsvButtons
            rows={rows}
            framework="esrs"
            customerId={customerId}
            year={year}
            disabled={saving}
            onImported={handleCsvImported}
            onMessage={setMessage}
          />
          <button
            type="button"
            onClick={resetScores}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RotateCcw size={16} /> Sıfırla
          </button>
          <button
            type="button"
            onClick={saveAll}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          >
            <Save size={16} /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      {/* Scoring Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 w-40">
                ESRS KONUSU
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700">
                FİNANSAL<br />ETKİ
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700">
                ETKİ<br />ŞİDDETİ
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700">
                OLASILIK
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700">
                PAYDAŞ<br />ENDİŞESİ
              </th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-700">
                DURUM
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-slate-200 transition-colors',
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50',
                  row.isMaterial && 'bg-amber-50',
                )}
              >
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900 text-sm line-clamp-2">{row.subject}</p>
                    <p className="text-xs text-slate-500">{row.griMapping}</p>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <ScoreButton
                    value={row.financialImpact}
                    onChange={(v) => updateScore(row.id, 'financialImpact', v)}
                  />
                </td>
                <td className="px-3 py-3">
                  <ScoreButton
                    value={row.impactSeverity}
                    onChange={(v) => updateScore(row.id, 'impactSeverity', v)}
                  />
                </td>
                <td className="px-3 py-3">
                  <ScoreButton
                    value={row.probability}
                    onChange={(v) => updateScore(row.id, 'probability', v)}
                  />
                </td>
                <td className="px-3 py-3">
                  <ScoreButton
                    value={row.stakeholderConcern}
                    onChange={(v) => updateScore(row.id, 'stakeholderConcern', v)}
                  />
                </td>
                <td className="px-3 py-3 text-center">
                  {row.isMaterial ? (
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                      ÖNEMLİ
                    </span>
                  ) : (
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                      Değil
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">ESRS konuları yüklenemedi. Lütfen sayfayı yenileyin.</p>
        </div>
      )}
    </div>
  );
}
