# ADR-04: Migrate JWT from localStorage to HttpOnly cookies + CSRF

## Status
Proposed

## Context

`src/lib/authToken.ts` stores the bearer JWT in `localStorage`. `src/lib/apiClient.ts` sends it as `Authorization: Bearer <token>`. `localStorage` is readable by any JavaScript executing on the page origin, so a successful XSS attack exfiltrates the token and enables silent session replay until it expires (default `1d`).

Real XSS surface exists: the app renders Markdown (`MarkdownContent`/`HelpMarkdown` components) and builds HTML email content from user-supplied data. `server.ts` sets manual CORS (lines 135-165) but adds no `helmet` middleware, no CSP, and no `X-Content-Type-Options` headers. There is effectively no XSS mitigation today.

`server.ts:145, 159` already sets `Access-Control-Allow-Credentials: true`, so credentialed cookie requests are supported by the existing CORS setup.

Contact magic-link flows use query-parameter JWTs (server.ts:~1005) — these are a separate concern and should remain as short-lived tokens, not migrated to cookies.

## Decision

1. Issue the auth JWT as an `HttpOnly; Secure; SameSite=Lax` cookie on login/OTP-verify.
2. Add CSRF protection using the double-submit pattern: a non-HttpOnly `csrf-token` cookie + a matching `X-CSRF-Token` request header validated by the server.
3. Add `helmet` with a baseline CSP to reduce the XSS surface regardless.
4. `resolvePlatformUserFromRequest` reads from the cookie OR the `Authorization` header (dual mode during migration).

## Rationale

`HttpOnly` removes token readability from JavaScript, downgrading "full account takeover via any XSS" to "the cookie is sent but not readable." `SameSite=Lax` prevents most CSRF without breaking normal navigation flows. CSP shrinks the XSS attack surface generally. Dual-mode during migration avoids a flag day for API clients.

## Risks

- CORS + credentialed cookies require exact-origin allow-listing (cannot use `*`). Already present: `buildCorsAllowedOriginSet` in server.ts. Wildcards are incompatible and must not be introduced.
- `SameSite=Strict` would block cross-origin navigation (e.g. from an email link). Use `Lax`.
- CSRF tokens require a small client-side change in `apiClient.ts` and a round-trip for the token.
- Contact magic-link tokens use `Authorization: Bearer` via query param — keep separate; do not migrate to cookies.

Mitigation: ship helmet + CSP first (pure header, zero client change), then implement dual-mode before removing `localStorage`.

## Migration Path

1. Add `helmet` to Express with a baseline CSP (no behavior change to auth).
2. On login/OTP-verify success, set `HttpOnly; Secure; SameSite=Lax` cookie AND continue returning the token in the JSON body (dual mode — existing clients keep working).
3. Update `resolvePlatformUserFromRequest` to read the `auth-token` cookie in addition to `Authorization` header.
4. Update `apiClient.ts` to `credentials: 'include'` and add the `X-CSRF-Token` header from the non-HttpOnly csrf cookie.
5. Update server to validate the CSRF header on mutating requests.
6. Stop returning the token in the JSON response body; remove `localStorage` usage from `authToken.ts`.
7. Reduce token TTL to `8h` or `12h` now that silent replay is harder.

## Effort

M (2–5 days).
