import { useEffect, useRef, useState } from 'react';
import { LANGS, useI18n } from '../../i18n';

/** Til tanlash: O‘zbekcha / Русский */
export function LanguageSelect({ align = 'right' }: { align?: 'left' | 'right' }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGS.find((l) => l.id === lang) ?? LANGS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('Tilni tanlash', 'Выбор языка')}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-primary-500/50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.7 3.8 5.8 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.8-3.8-9S9.5 5.7 12 3Z" />
        </svg>
        <span className="hidden sm:inline">{current.label}</span>
        <span className="sm:hidden">{current.short}</span>
      </button>
      {open && (
        <ul role="listbox" aria-label={t('Til', 'Язык')} className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} z-40 mt-2 w-40 overflow-hidden rounded-2xl bg-white p-1 shadow-xl ring-1 ring-black/10 dark:bg-neutral-800 dark:ring-white/10`}>
          {LANGS.map((l) => (
            <li key={l.id} role="option" aria-selected={l.id === lang}>
              <button
                type="button"
                onClick={() => { setLang(l.id); setOpen(false); }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${l.id === lang ? 'bg-primary-50 font-semibold text-primary-800 dark:bg-primary-900/40 dark:text-emerald-200' : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-white/5'}`}
              >
                {l.label}
                {l.id === lang && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
