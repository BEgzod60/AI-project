import { useEffect, useState } from 'react';
import { apiGet } from '../../services/api';
import { useT } from '../../i18n';

interface StatsData {
  total_unique: number;
  today_unique: number;
  total_views: number;
}

const STORAGE_KEY = 'iymon_vid';
const LOCAL_STATS_KEY = 'iymon_local_stats';

function getOrSetVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let vid = window.localStorage.getItem(STORAGE_KEY);
  if (!vid) {
    vid = 'v_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    try {
      window.localStorage.setItem(STORAGE_KEY, vid);
    } catch {
      // localStorage cheklangan bo'lsa
    }
  }
  return vid;
}

function getLocalStats(): StatsData {
  try {
    const raw = window.localStorage.getItem(LOCAL_STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        total_unique: Math.max(1, Number(parsed.total_unique) || 1),
        today_unique: Math.max(1, Number(parsed.today_unique) || 1),
        total_views: Math.max(1, (Number(parsed.total_views) || 0) + 1),
      };
    }
  } catch {
    // ignore
  }
  return { total_unique: 1, today_unique: 1, total_views: 1 };
}

export function VisitorCounter() {
  const t = useT();
  const [stats, setStats] = useState<StatsData>(() => {
    const initial = getLocalStats();
    try {
      window.localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(initial));
    } catch {
      // ignore
    }
    return initial;
  });

  useEffect(() => {
    const vid = getOrSetVisitorId();
    apiGet<StatsData>('/dev/stats/', { vid })
      .then((data) => {
        if (data && typeof data.total_unique === 'number') {
          setStats(data);
          try {
            window.localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(data));
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {
        // Zaxira: lokal saqlangan statistika doimo ishlaydi
      });
  }, []);

  return (
    <div
      title={t(
        `Jami ko‘rishlar: ${stats.total_views.toLocaleString()} | Bugungi tashriflar: ${stats.today_unique.toLocaleString()}`,
        `Всего просмотров: ${stats.total_views.toLocaleString()} | Сегодня: ${stats.today_unique.toLocaleString()}`
      )}
      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-500/25 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
      </span>
      <span className="tabular-nums">
        {stats.total_unique.toLocaleString()} {t('odam ko‘rgan', 'посетителей')}
      </span>
    </div>
  );
}
