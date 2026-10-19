import type { ApiErrorPayload } from '../types/prayer';
import { getLang } from '../i18n';

/** Backend xatosini (ApiErrorPayload) tashiydigan umumiy xato klassi */
export class ApiError extends Error {
  code: string;

  constructor(message: string, code = 'error') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/** Ruscha interfeysda backend xato kodlari ruscha matnga almashtiriladi (backend xabarlari o'zbekcha) */
const RU_ERRORS: Record<string, string> = {
  network: 'Ошибка подключения к серверу. Проверьте интернет и попробуйте снова.',
  bad_response: 'Сервер вернул некорректный ответ.',
  not_found: 'Не найдено.',
  invalid: 'Проверьте введённые данные.',
  rate_limited: 'Слишком много запросов — попробуйте позже.',
  not_configured: 'Форма связи пока не настроена. Свяжитесь по email или телефону.',
  upstream_error: 'Не удалось отправить — попробуйте чуть позже.',
  limit: 'Достигнут лимит активных ключей для этого email.',
};

export function apiError(message: string, code: string): ApiError {
  if (getLang() !== 'ru') return new ApiError(message, code);
  return new ApiError(RU_ERRORS[code] ?? 'Запрос не выполнен.', code);
}

const BASE_URL = '/api';

function buildUrl(path: string, params?: Record<string, string | undefined>): string {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, value);
    }
  }
  // Ruscha interfeysda backend ruscha mazmunni (bor bo'lsa) qaytaradi
  if (getLang() === 'ru' && !url.searchParams.has('lang')) url.searchParams.set('lang', 'ru');
  return url.pathname + url.search;
}

const RETRY_DELAYS = [300, 900, 2000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Qisqa muddatli xatolar (tarmoq uzilishi, 5xx) uchun avtomatik qayta urinish */
async function fetchWithRetry(path: string, attempt = 0): Promise<Response> {
  try {
    const response = await fetch(path, { headers: { Accept: 'application/json' } });
    if (response.status >= 500 && attempt < RETRY_DELAYS.length) {
      await sleep(RETRY_DELAYS[attempt]);
      return fetchWithRetry(path, attempt + 1);
    }
    return response;
  } catch (err) {
    if (attempt < RETRY_DELAYS.length) {
      await sleep(RETRY_DELAYS[attempt]);
      return fetchWithRetry(path, attempt + 1);
    }
    throw err;
  }
}

/** GET so'rovi. Backend {error:{code,message}} qaytarsa — ApiError otadi. */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | undefined>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchWithRetry(buildUrl(path, params));
  } catch {
    throw apiError('Serverga ulanishda xatolik. Internetni tekshirib, qayta urinib ko‘ring.', 'network');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw apiError('Server noto‘g‘ri javob qaytardi.', 'bad_response');
  }

  if (!response.ok) {
    const err = (payload as { error?: ApiErrorPayload }).error;
    throw apiError(err?.message ?? 'So‘rov bajarilmadi.', err?.code ?? 'http_' + response.status);
  }

  return payload as T;
}

/** POST so'rovi (AI chat kabi). */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw apiError('Serverga ulanishda xatolik.', 'network');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw apiError('Server noto‘g‘ri javob qaytardi.', 'bad_response');
  }

  if (!response.ok) {
    const err = (payload as { error?: ApiErrorPayload }).error;
    throw apiError(err?.message ?? 'So‘rov bajarilmadi.', err?.code ?? 'http_' + response.status);
  }

  return payload as T;
}