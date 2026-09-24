import { getAuthToken } from './authToken';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export class ApiClientError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    const errorPayload = payload as ApiEnvelope<T> | null;
    throw new ApiClientError(
      errorPayload?.error || response.statusText || 'Request failed',
      response.status,
      errorPayload?.code,
    );
  }

  const envelope = payload as ApiEnvelope<T>;

  if (envelope && envelope.success === false) {
    throw new ApiClientError(envelope.error || 'Request failed', response.status, envelope.code);
  }

  return envelope?.success === true && 'data' in envelope
    ? envelope.data as T
    : payload as T;
}
