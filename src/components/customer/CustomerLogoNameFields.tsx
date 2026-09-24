/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Camera } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

type CustomerLogoNameFieldsProps = {
  defaultName?: string;
  logoUrl?: string | null;
  tempLogo?: string | null;
  onLogoFile: (dataUrl: string) => void;
  onWebsiteBlur?: (url: string) => void;
};

export function CustomerLogoNameFields({
  defaultName,
  logoUrl,
  tempLogo,
  onLogoFile,
}: CustomerLogoNameFieldsProps) {
  const { t } = useTranslation();
  const displayLogo = tempLogo || logoUrl;

  return (
    <div className="flex w-full max-w-full items-start gap-4">
      <div className="min-w-0 flex-1">
        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {t.customers.companyName}
        </label>
        <input name="name" type="text" required className="minimal-input w-full" defaultValue={defaultName} />
      </div>
      <div className="group relative shrink-0">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
          {displayLogo ? (
            <img src={displayLogo} className="h-full w-full object-cover" alt="" />
          ) : (
            <Camera className="text-slate-300" size={24} />
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => onLogoFile(reader.result as string);
              reader.readAsDataURL(file);
            }
          }}
        />
        <div className="absolute bottom-0 right-0 rounded-lg border border-slate-100 bg-white p-1.5 text-slate-400 shadow-sm transition-colors group-hover:text-slate-900">
          <Camera size={14} />
        </div>
      </div>
    </div>
  );
}
