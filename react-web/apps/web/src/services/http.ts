/**
 * Cliente HTTP base contra la API /v1 desplegada (API Gateway + Lambda + DynamoDB).
 * La URL se toma de VITE_API_BASE_URL. El tenant de la demo es fijo (t-demo)
 * hasta que se integre Cognito y el tenant venga del token.
 */

import { getIdToken, clearTokens } from '@/auth/cognito';

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? '';
export const TENANT_ID = (import.meta.env.VITE_TENANT_ID as string | undefined) ?? 't-demo';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  if (!BASE) {
    throw new ApiError(0, 'VITE_API_BASE_URL no está configurada. Define la URL del API en .env');
  }
  const token = getIdToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { Authorization: token } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401: token expirado o ausente -> limpiar sesión para forzar login.
  if (res.status === 401) {
    clearTokens();
    throw new ApiError(401, 'Sesión expirada. Inicia sesión de nuevo.');
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail = data?.detail || data?.title || `Error ${res.status}`;
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

/** Genera una clave de idempotencia para operaciones de pago. */
export function idempotencyKey(): string {
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>('POST', path, body, headers),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  del: (path: string) => request<void>('DELETE', path),
};
