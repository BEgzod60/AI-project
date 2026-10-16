import { useEffect, useId, useRef, useState } from 'react';
import type { Recitation } from '../../types/learning';

interface Props {
  options: Recitation[];
  value: string;
  onChange: (slug: string) => void;
}

/** "Ixlos surasi" -> "Ixlos" (chiplarda qisqa nom) */
function shortName(name: string): string {
  return name.replace(/\s+surasi$/i, '');
}

/**
 * Zam sura tanlash: ro'yxat kartaning o'zida (oqimda) ochiladi —
 * tizim <select> oynasidek ekrandan tashqariga chiqib ketmaydi.
 */
export function ZamSuraPicker({ options, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.slug === value);

  // Tashqariga bosilganda yoki Escape'da yopiladi
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (slug: string) => {
    onChange(slug);
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div ref={rootRef}>
      <p className="mb-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300">Zam sura (Fotihadan keyin)</p>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-2.5 text-left shadow-sm ring-1 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-neutral-900 ${
          open ? 'ring-primary-500/60' : 'ring-black/10 hover:ring-primary-500/40 dark:ring-white/15'
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-900 text-accent-400" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5m0-13c2-1.5 5-2 8-1.5v13c-3-.5-6 0-8 1.5m0-13v13" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">Tanlangan sura</span>
          <span className="block truncate font-semibold text-neutral-900 dark:text-white">{selected?.name ?? 'Tanlang'}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          id={listId}
          role="radiogroup"
          aria-label="Zam sura"
          className="mt-2 grid grid-cols-2 gap-1.5 rounded-2xl bg-primary-900 p-2 shadow-lg ring-1 ring-white/10 motion-safe:animate-fade-in"
        >
          {options.map((o) => {
            const active = o.slug === value;
            return (
              <button
                key={o.slug}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(o.slug)}
                className={`flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-semibold ring-1 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${
                  active
                    ? 'bg-gradient-to-br from-accent-400 to-accent-500 text-primary-900 ring-accent-400'
                    : 'bg-white/[0.05] text-white ring-white/10 hover:bg-white/10 hover:ring-emerald-300/40'
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${active ? 'bg-primary-900/15' : 'ring-1 ring-white/25'}`}
                >
                  {active && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </span>
                <span className="truncate">{shortName(o.name)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
