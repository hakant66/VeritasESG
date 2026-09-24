/**
 * Login page language before auth: URL → sessionStorage → Vite env → browser → English.
 * Use HashRouter: `#/login?lang=tr` (or `locale=tr`).
 */

import type { Language } from './i18n';

const STORAGE_KEY = 'governance_login_lang';

/** After login, UI language can use this when the profile has no `language` yet. */
export function getPersistedLoginLanguage(): Language | null {
  try {
    const stored = (sessionStorage.getItem(STORAGE_KEY) || '').trim().toLowerCase();
    if (stored === 'tr' || stored === 'en') return stored as Language;
  } catch {
    /* private mode */
  }
  return null;
}

function persistLang(lang: Language) {
  try {
    sessionStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* private mode */
  }
}

export function resolveLoginLanguage(searchParams: URLSearchParams): Language {
  const raw = (searchParams.get('lang') || searchParams.get('locale') || '').trim().toLowerCase();
  if (raw === 'tr' || raw === 'en') {
    persistLang(raw);
    return raw;
  }

  const envRaw = (import.meta.env.VITE_LOGIN_LANG || '').trim().toLowerCase();
  if (envRaw === 'tr' || envRaw === 'en') {
    return envRaw;
  }

  try {
    const stored = (sessionStorage.getItem(STORAGE_KEY) || '').trim().toLowerCase();
    if (stored === 'tr' || stored === 'en') return stored as Language;
  } catch {
    /* */
  }

  if (typeof navigator !== 'undefined') {
    const nav = navigator.language?.slice(0, 2).toLowerCase();
    if (nav === 'tr') return 'tr';
  }

  return 'en';
}
