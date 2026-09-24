import { useState } from 'react';
import { Zap, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { GRIMaterialityTab } from '../../components/customer/GRIMaterialityTab';

type StandardTab = 'gri' | 'esrs' | 'issb';

export default function MaterialityDesignPage() {
  const [activeTab, setActiveTab] = useState<StandardTab>('gri');

  const STANDARD_TABS: Array<{
    id: StandardTab;
    label: string;
    fullName: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'gri',
      label: 'GRI',
      fullName: 'Global Reporting Initiative',
      description: 'Global raporlama standartları',
      icon: <BarChart3 size={20} />,
    },
    {
      id: 'esrs',
      label: 'ESRS / CRDS',
      fullName: 'European Sustainability Reporting Standards',
      description: 'Avrupa sürdürülebilirlik raporlama standartları',
      icon: <BarChart3 size={20} />,
    },
    {
      id: 'issb',
      label: 'ISSB',
      fullName: 'IFRS Sustainability Standards',
      description: 'IFRS sürdürülebilirlik standartları',
      icon: <BarChart3 size={20} />,
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 flex items-center justify-center shrink-0">
          <Zap size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Önemlilik Kriterleri Yönetimi</h1>
          <p className="text-slate-600 mt-1">
            Farklı raporlama standartlarına göre materiyallik kriterlerini tanımla ve yönet
          </p>
        </div>
      </div>

      {/* Standard Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STANDARD_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative p-4 rounded-xl border-2 transition-all text-left group',
              activeTab === tab.id
                ? 'border-amber-500 bg-amber-50'
                : 'border-slate-200 bg-white hover:border-amber-300',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  activeTab === tab.id
                    ? 'bg-amber-200 text-amber-700'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-amber-100',
                )}
              >
                {tab.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900">{tab.label}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{tab.fullName}</p>
                <p className="text-xs text-slate-600 mt-1">{tab.description}</p>
              </div>
            </div>
            {activeTab === tab.id && (
              <div className="absolute inset-0 rounded-xl ring-2 ring-amber-500 ring-opacity-20" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeTab === 'gri' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <span className="text-sm font-bold text-amber-700">GRI</span>
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Global Reporting Initiative</h2>
                <p className="text-sm text-slate-500">
                  Global raporlama standartları — 24 materiyallik konusu
                </p>
              </div>
            </div>
            <GRIMaterialityTab customerId="_materiality_design_gri" framework="gri" />
          </div>
        )}

        {activeTab === 'esrs' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-bold text-blue-700">ESRS</span>
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  European Sustainability Reporting Standards / CRDS
                </h2>
                <p className="text-sm text-slate-500">
                  Avrupa sürdürülebilirlik raporlama standartları — 57 materiyallik konusu
                </p>
              </div>
            </div>
            <GRIMaterialityTab customerId="_materiality_design_esrs" framework="esrs" />
          </div>
        )}

        {activeTab === 'issb' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <span className="text-sm font-bold text-green-700">ISSB</span>
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">IFRS Sustainability Standards</h2>
                <p className="text-sm text-slate-500">
                  IFRS S1 (Genel) ve S2 (İklim) sürdürülebilirlik standartları — 24 materiyallik konusu
                </p>
              </div>
            </div>
            <GRIMaterialityTab customerId="_materiality_design_issb" framework="issb" />
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-900">
          <strong>💡 İpucu:</strong> Burada tanımlanan önemlilik kriterleri, tüm
          projeler ve müşteriler tarafından referans olarak kullanılabilir. Proje
          düzeyinde müşteri-spesifik önemlilik değerlendirmeleri yapmak için
          Önemlilik Değerlendirmesi (DMA) sayfasını kullanın.
        </p>
      </div>
    </div>
  );
}
