/**
 * Login screen branding: Vite env (VITE_LOGIN_*) with URL query overrides.
 * Hash routes: use #/login?tagline=...&theme=dark (search is part of the hash in HashRouter).
 */

export type LoginTheme = 'default' | 'dark' | 'slate' | 'brand';

export interface LoginBrandingInput {
  platformName?: string;
  platformLogoSquareUrl?: string;
  platformLogoRectangleUrl?: string;
}

export interface ResolvedLoginBranding {
  title: string;
  tagline: string;
  logoRect: string;
  logoSquare: string;
  theme: LoginTheme;
  documentTitle: string;
}

const THEMES: LoginTheme[] = ['default', 'dark', 'slate', 'brand'];

function firstNonEmpty(...vals: Array<string | undefined | null>): string {
  for (const v of vals) {
    const s = typeof v === 'string' ? v.trim() : '';
    if (s) return s;
  }
  return '';
}

function normalizeTheme(raw: string): LoginTheme {
  const t = raw.toLowerCase().trim();
  return THEMES.includes(t as LoginTheme) ? (t as LoginTheme) : 'default';
}

/**
 * Merge order: URL search params → Vite env → loaded settings → defaults.
 */
export function resolveLoginBranding(
  searchParams: URLSearchParams,
  settings: LoginBrandingInput,
): ResolvedLoginBranding {
  const url = (key: string) => searchParams.get(key)?.trim() || '';

  const env = import.meta.env;

  const title = firstNonEmpty(
    url('loginTitle'),
    url('title'),
    env.VITE_LOGIN_TITLE,
    settings.platformName,
    'GovernanceIQ',
  );

  const tagline = firstNonEmpty(
    url('loginTagline'),
    url('tagline'),
    env.VITE_LOGIN_TAGLINE,
    'Consultancy Governance Platform',
  );

  const logoRect = firstNonEmpty(
    url('logoRect'),
    url('logoRectangle'),
    env.VITE_LOGIN_LOGO_RECT_URL,
    settings.platformLogoRectangleUrl,
  );

  const logoSquare = firstNonEmpty(
    url('logoSquare'),
    env.VITE_LOGIN_LOGO_SQUARE_URL,
    settings.platformLogoSquareUrl,
  );

  const theme = normalizeTheme(
    firstNonEmpty(url('theme'), env.VITE_LOGIN_THEME, 'default'),
  );

  const documentTitle = firstNonEmpty(
    url('docTitle'),
    url('documentTitle'),
    env.VITE_LOGIN_DOCUMENT_TITLE,
  );

  return {
    title,
    tagline,
    logoRect,
    logoSquare,
    theme,
    documentTitle,
  };
}

export function loginPageShellClass(theme: LoginTheme): string {
  switch (theme) {
    case 'dark':
      return 'min-h-screen flex items-center justify-center bg-slate-950 p-4';
    case 'slate':
      return 'min-h-screen flex items-center justify-center bg-slate-200 p-4';
    case 'brand':
      return 'min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4';
    default:
      return 'min-h-screen flex items-center justify-center bg-slate-50 p-4';
  }
}

export function loginCardClass(theme: LoginTheme): string {
  const base = 'max-w-md w-full minimal-card p-10 space-y-8 shadow-2xl';
  switch (theme) {
    case 'dark':
      return `${base} bg-slate-900 border-slate-800 text-slate-100 shadow-black/40`;
    case 'slate':
      return `${base} bg-white shadow-slate-300/80`;
    case 'brand':
      return `${base} bg-white/95 backdrop-blur-sm border-white/20 shadow-black/30`;
    default:
      return `${base} bg-white shadow-slate-200`;
  }
}

export function loginMutedTextClass(theme: LoginTheme): string {
  return theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
}

export function loginHeadingClass(theme: LoginTheme): string {
  return theme === 'dark'
    ? 'text-3xl font-bold tracking-tight text-white font-display'
    : 'text-3xl font-bold tracking-tight text-slate-900 font-display';
}

export function loginInputShellClass(theme: LoginTheme): string {
  return theme === 'dark'
    ? 'w-full pl-11 pr-4 py-3.5 bg-slate-800/80 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/10 focus:bg-slate-800 text-sm text-slate-100 placeholder:text-slate-500'
    : 'w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-all text-sm';
}

export function loginPrimaryButtonClass(theme: LoginTheme): string {
  const base =
    'w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.98] disabled:opacity-50';
  if (theme === 'dark') {
    return `${base} bg-white text-slate-900 hover:bg-slate-100 shadow-white/10`;
  }
  if (theme === 'brand') {
    return `${base} bg-blue-600 text-white hover:bg-blue-700 shadow-blue-900/20`;
  }
  return `${base} bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10`;
}
