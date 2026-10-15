import type { ApiErrorPayload } from '../types/prayer';

/** Backend xatosini (ApiErrorPayload) tashiydigan umumiy xato klassi */
export class ApiError extends Error {
  code: string;

  constructor(message: string, code = 'error') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

const BASE_URL = '/api';

function buildUrl(path: string, params?: Record<string, string | undefined>): string {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, value);
    }
  }
  return url.pathname + url.search;
}

/** GET so'rovi. Backend {error:{code,message}} qaytarsa — ApiError otadi. */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | undefined>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new ApiError('Serverga ulanishda xatolik. Internetni tekshirib, qayta urinib ko\u2018ring.', 'network');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('Server noto\u2018g\u2018ri javob qaytardi.', 'bad_response');
  }

  if (!response.ok) {
    const err = (payload as { error?: ApiErrorPayload }).error;
    throw new ApiError(err?.message ?? 'So\u2018rov bajarilmadi.', err?.code ?? 'http_' + response.status);
  }

  return payload as T;
}
