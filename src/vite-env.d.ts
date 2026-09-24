/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  /** Optional override for text `generateContent` model (default `gemini-2.5-flash`). */
  readonly VITE_GEMINI_MODEL?: string;
  readonly VITE_LOGIN_TITLE?: string;
  readonly VITE_LOGIN_TAGLINE?: string;
  readonly VITE_LOGIN_LOGO_RECT_URL?: string;
  readonly VITE_LOGIN_LOGO_SQUARE_URL?: string;
  readonly VITE_LOGIN_THEME?: string;
  readonly VITE_LOGIN_DOCUMENT_TITLE?: string;
  /** Default login UI language before sign-in: `en` | `tr`. URL `?lang=` overrides. */
  readonly VITE_LOGIN_LANG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
