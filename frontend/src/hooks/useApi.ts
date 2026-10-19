import { getLang } from '../i18n';
import { useEffect, useState } from 'react';
import { ApiError } from '../services/api';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/** So'rovni bajaradi; deps o'zgarganda qayta yuklaydi */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[]): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError) setError(err.message);
        else setError(getLang() === 'ru' ? 'Непредвиденная ошибка при загрузке данных.' : 'Namoz vaqtlarini yuklashda kutilmagan xatolik yuz berdi.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  return { data, loading, error, retry: () => setAttempt((n) => n + 1) };
}
