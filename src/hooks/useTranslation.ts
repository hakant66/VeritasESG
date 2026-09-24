/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { useAuth } from "../lib/AuthContext";
import { getPersistedLoginLanguage } from "../lib/loginLanguage";
import { translations, Language, TranslationKey } from "../lib/i18n";

/** Replaces `{year}` in any nested string so examples stay current without manual edits. */
function applyYearTokenDeep<T>(value: T): T {
  const year = String(new Date().getFullYear());
  if (typeof value === "string") {
    return value.replace(/\{year\}/g, year) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => applyYearTokenDeep(item)) as T;
  }
  if (value !== null && typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(src)) {
      out[key] = applyYearTokenDeep(src[key]);
    }
    return out as T;
  }
  return value;
}

function resolveAppLanguage(profileLanguage: string | undefined | null): Language {
  const raw = (profileLanguage ?? "").toString().trim().toLowerCase();
  if (raw === "tr") return "tr";
  if (raw === "en") return "en";
  return getPersistedLoginLanguage() || "en";
}

export function useTranslation() {
  const { profile } = useAuth();

  const lang: Language = resolveAppLanguage(profile?.language);

  const t: TranslationKey = useMemo(
    () => applyYearTokenDeep(translations[lang] || translations.en),
    [lang],
  );

  return { t, lang };
}
