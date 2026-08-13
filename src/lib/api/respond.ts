/** Helper kecil untuk route handler — supaya bentuk respons konsisten. */

import type { ApiError } from '@/types';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  // Data room selalu berubah; jangan pernah di-cache CDN/browser.
  'cache-control': 'no-store',
} as const;

export function jsonResponse<T>(data: T, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...init.headers },
  });
}

export function apiError(status: number, message: string): Response {
  return jsonResponse<ApiError>({ error: message }, { status });
}
