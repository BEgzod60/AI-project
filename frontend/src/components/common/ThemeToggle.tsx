import { useEffect, useState } from 'react';
import { THEME_STORAGE_KEY } from '../../utils/constants';
import { useT } from '../../i18n';

function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Bir nechta tugma (header va mobil menyu) bir-biri bilan sinxron bo'lishi uchun */
const THEME_EVENT = 'iymon:theme';

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const onChange = (e: Event) => setTheme((e as CustomEvent<'light' | 'dark'>).detail);
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }));
  };
  return { theme, toggle };
}

export function ThemeToggle() {
  const t = useT();
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? t('Yorug‘ rejimga o‘tish', 'Светлая тема') : t('Tungi rejimga o‘tish', 'Тёмная тема')}
      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white p-1.5 shadow-sm transition hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800"
    >
      {/* Quyosh */}
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
          isDark ? 'text-neutral-400' : 'bg-accent-400 text-white'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4" />
        </svg>
      </span>
      {/* Oy */}
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
          isDark ? 'bg-primary-700 text-white' : 'text-neutral-400'
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <path strokeLinejoin="round" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        </svg>
      </span>
    </button>
  );
}
