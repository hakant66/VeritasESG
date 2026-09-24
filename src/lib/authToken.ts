export const AUTH_TOKEN_STORAGE_KEY = 'authToken';
const LEGACY_OTP_TOKEN_KEY = 'otpFallbackToken';

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || localStorage.getItem(LEGACY_OTP_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  localStorage.removeItem(LEGACY_OTP_TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(LEGACY_OTP_TOKEN_KEY);
}
