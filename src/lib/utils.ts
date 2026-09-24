import { clsx, type ClassValue } from 'clsx';
import { format } from 'date-fns';
import { enUS, tr } from 'date-fns/locale';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Each word starts with an uppercase letter (tr-TR aware). */
export function formatPersonName(value: string): string {
  return (value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLocaleLowerCase('tr-TR');
      if (!lower) return '';
      return lower.charAt(0).toLocaleUpperCase('tr-TR') + lower.slice(1);
    })
    .join(' ');
}

export function toTimestamp(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const ts = new Date(value as string | Date).getTime();
  return Number.isNaN(ts) ? null : ts;
}

export function formatDateTimeAt(
  value: unknown,
  lang: 'en' | 'tr' = 'en',
): string | null {
  const ts = toTimestamp(value);
  if (ts == null) return null;
  return format(ts, 'd MMMM yyyy, HH:mm', {
    locale: lang === 'tr' ? tr : enUS,
  });
}
