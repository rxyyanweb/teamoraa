import { getPortal } from '@/lib/portal';
const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
interface Envelope<T> {
  data: T;
  error?: { code: string; message: string };
}
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Teamora-Portal': getPortal(),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Cannot reach Teamora. Check that the backend is running and MongoDB is configured.',
    );
  }
  const body = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok && response.status === 401 && !path.startsWith('/auth/'))
    window.dispatchEvent(new Event('teamora:session-expired'));
  if (!response.ok)
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'REQUEST_FAILED',
      body?.error?.message ?? 'The request failed. Please try again.',
    );
  if (!body || !('data' in body))
    throw new ApiError(
      response.status,
      'INVALID_RESPONSE',
      'The server returned an invalid response.',
    );
  return body.data;
}
let csrfRequest: Promise<{ csrfToken: string }> | null = null;
function csrf() {
  return (csrfRequest ??= request<{ csrfToken: string }>('/auth/csrf').finally(() => {
    csrfRequest = null;
  }));
}
export const api = {
  get: <T>(path: string) => request<T>(path),
  async mutate<T>(
    path: string,
    body: unknown = {},
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'POST',
  ) {
    const { csrfToken } = await csrf();
    return request<T>(path, {
      method,
      body: JSON.stringify(body),
      headers: { 'X-CSRF-Token': csrfToken },
    });
  },
  delete: <T>(path: string) => api.mutate<T>(path, {}, 'DELETE'),
  downloadPdf: async (path: string, filename: string) => {
    const response = await fetch(`${base}${path}`, {
      credentials: 'include',
      headers: {
        'X-Teamora-Portal': getPortal(),
      },
    });
    if (!response.ok) {
      throw new ApiError(response.status, 'DOWNLOAD_FAILED', 'Failed to download PDF.');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};
