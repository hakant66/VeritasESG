import { useMemo } from 'react';
import { useTranslation } from './useTranslation';
import { getPersistedLoginLanguage } from '../lib/loginLanguage';
import { getComplianceStrings, type ComplianceStrings } from '../lib/complianceI18n';
import type { Language } from '../lib/i18n';

/** Compliance tab defaults to Turkish unless the app language is explicitly English. */
function resolveComplianceLanguage(appLang: Language): Language {
  if (appLang === 'en') return 'en';
  if (appLang === 'tr') return 'tr';
  const persisted = getPersistedLoginLanguage();
  if (persisted === 'en') return 'en';
  if (persisted === 'tr') return 'tr';
  const envRaw = (import.meta.env.VITE_LOGIN_LANG || '').trim().toLowerCase();
  if (envRaw === 'en') return 'en';
  return 'tr';
}

export function useComplianceTranslation(): { ct: ComplianceStrings; lang: Language } {
  const { lang } = useTranslation();
  const complianceLang = useMemo(() => resolveComplianceLanguage(lang), [lang]);
  const ct = useMemo(() => getComplianceStrings(complianceLang), [complianceLang]);
  return { ct, lang: complianceLang };
}
