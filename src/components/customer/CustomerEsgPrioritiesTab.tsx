/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Customer } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';

type CustomerEsgPrioritiesTabProps = {
  customer?: Customer | null;
};

export function CustomerEsgPrioritiesTab({
  customer,
}: CustomerEsgPrioritiesTabProps) {
  const { t } = useTranslation();

  const [materialityFramework, setMaterialityFramework] = useState<'gri' | 'esrs' | 'issb'>(
    (customer?.materialityFramework as 'gri' | 'esrs' | 'issb') || 'gri',
  );

  const frameworks = [
    { id: 'gri', label: 'GRI', fullName: 'Global Reporting Initiative' },
    { id: 'esrs', label: 'ESRS / CRDS', fullName: 'European Sustainability Reporting Standards' },
    { id: 'issb', label: 'ISSB (IFRS S1/S2)', fullName: 'IFRS Sustainability Standards' },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Önemlilik Kriteri</h3>
        <p className="mt-1 text-sm text-slate-500">
          Önemlilik değerlendirmesi için hangi uluslararası standardı kullanacaksınız?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {frameworks.map((fw) => (
          <button
            key={fw.id}
            type="button"
            onClick={() => setMaterialityFramework(fw.id)}
            className={cn(
              'p-4 rounded-lg border-2 transition-all text-left',
              materialityFramework === fw.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-blue-300',
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  materialityFramework === fw.id
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-slate-300 bg-white',
                )}
              >
                {materialityFramework === fw.id && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{fw.label}</p>
                <p className="text-xs text-slate-500">{fw.fullName}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>💡 Bilgi:</strong> Seçilen standardı değiştirdiğinizde, önemlilik değerlendirmeleri sayfasında
          ilgili kriterler gösterilecektir. (GRI, ESRS/CRDS, ISSB)
        </p>
      </div>

      <input
        type="hidden"
        name="materialityFramework"
        value={materialityFramework}
      />
    </div>
  );
}
