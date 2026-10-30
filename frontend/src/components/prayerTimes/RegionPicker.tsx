import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { REGIONS, regionLabel } from '../../utils/constants';
import { REGION_COORDS, cityLabel } from './clock';
import { useI18n } from '../../i18n';

const COLUMNS = 2;

interface Props {
  value: string;
  onChange: (region: string) => void;
  /** hero — qorong'i fon ustida (namoz vaqtlari sahifasi), compact — header uchun */
  variant?: 'hero' | 'compact';
  /** hero: panel tugmaning qaysi chetiga tekislanadi (tugma o'ngda tursa — right, ekrandan chiqmasin) */
  align?: 'left' | 'right';
}

function PinIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-5.1-7-11a7 7 0 1 1 14 0c0 5.9-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

/** Viloyat tanlash: yumaloq "chip"lardan iborat ochiladigan panel (listbox) */
export function RegionPicker({ value, onChange, variant = 'hero', align = 'left' }: Props) {
  const compact = variant === 'compact';
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, REGIONS.indexOf(value as (typeof REGIONS)[number])));
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const listId = useId();
  const { t, lang } = useI18n();
  const city = REGION_COORDS[value] ? cityLabel(value, lang) : undefined;
  const shown = regionLabel(value, lang);

  // Ochilganda tanlangan viloyatga fokus
  useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, REGIONS.indexOf(value as (typeof REGIONS)[number]));
    setActive(idx);
    requestAnimationFrame(() => optionRefs.current[idx]?.focus());
  }, [open, value]);

  // Tashqariga bosilganda yopiladi
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const choose = (region: string) => {
    onChange(region);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const move = (to: number) => {
    const idx = (to + REGIONS.length) % REGIONS.length;
    setActive(idx);
    optionRefs.current[idx]?.focus();
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => move(active + 1),
      ArrowLeft: () => move(active - 1),
      ArrowDown: () => move(active + COLUMNS),
      ArrowUp: () => move(active - COLUMNS),
      Home: () => move(0),
      End: () => move(REGIONS.length - 1),
      Enter: () => choose(REGIONS[active]),
      ' ': () => choose(REGIONS[active]),
      Escape: () => {
        setOpen(false);
        buttonRef.current?.focus();
      },
    };
    if (e.key === 'Tab') {
      setOpen(false);
      return;
    }
    const action = keys[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  };

  return (
    <div ref={rootRef} className={compact ? 'relative' : 'relative min-w-0 sm:min-w-[240px]'}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-label={compact ? `${t('Hudud', 'Регион')}: ${shown}` : undefined}
        className={
          compact
            ? `flex items-center gap-2 rounded-full border bg-white py-1.5 pl-1.5 pr-3 text-left shadow-sm transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:bg-neutral-800 ${
                open
                  ? 'border-primary-400 ring-2 ring-primary-500/20 dark:border-primary-500'
                  : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
              }`
            : `group flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left ring-1 backdrop-blur-sm transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${
                open ? 'bg-white/20 ring-accent-400/70' : 'bg-white/10 ring-white/20 hover:bg-white/15 hover:ring-white/35'
              }`
        }
      >
        <span
          className={
            compact
              ? 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-900 text-accent-400'
              : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-400/15 text-accent-400 ring-1 ring-accent-400/30'
          }
        >
          <PinIcon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </span>
        {compact ? (
          <span className="max-w-[6.5rem] truncate text-sm font-semibold sm:max-w-[7.5rem] text-neutral-800 dark:text-neutral-100">{shown}</span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-white/60">{t('Hudud', 'Регион')}</span>
            <span className="block truncate font-semibold text-white">{shown}</span>
          </span>
        )}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-4 w-4 transition-transform duration-300 ${compact ? 'text-neutral-400' : 'text-white/70'} ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className={`top-full z-50 mt-2 rounded-3xl ${
            compact
              ? // Mobilda header kengligida (header backdrop-blur — fixed uchun o'rab turuvchi blok), kattada tugma ostida o'ngda
                'fixed inset-x-4 origin-top sm:absolute sm:inset-x-auto sm:right-0 sm:w-[26rem] sm:origin-top-right'
              : align === 'right'
                ? 'absolute inset-x-0 origin-top sm:left-auto sm:w-[26rem] sm:origin-top-right'
                : 'absolute left-0 w-[min(92vw,26rem)] origin-top-left'
          } bg-primary-900/95 p-3 shadow-2xl shadow-black/40 ring-1 ring-white/15 backdrop-blur-md motion-safe:animate-fade-in`}
        >
          <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-white/50">{t('Hududni tanlang', 'Выберите регион')}</p>
          <ul
            id={listId}
            role="listbox"
            aria-label={t('Hududlar', 'Регионы')}
            onKeyDown={onListKey}
            className="grid max-h-[22rem] grid-cols-2 gap-1.5 overflow-y-auto pr-1"
          >
            {REGIONS.map((r, i) => {
              const selected = r === value;
              return (
                <li
                  key={r}
                  id={`${listId}-${i}`}
                  ref={(el) => {
                    optionRefs.current[i] = el;
                  }}
                  role="option"
                  aria-selected={selected}
                  tabIndex={i === active ? 0 : -1}
                  onClick={() => choose(r)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-2xl px-3 py-2.5 outline-none ring-1 transition duration-200 focus-visible:ring-2 focus-visible:ring-accent-400 ${
                    selected
                      ? 'bg-gradient-to-br from-accent-400 to-accent-500 text-primary-900 shadow-lg shadow-accent-500/20 ring-accent-400'
                      : 'bg-white/[0.04] text-white ring-white/10 hover:bg-white/10 hover:ring-emerald-300/40'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      selected ? 'bg-primary-900/15 text-primary-900' : 'bg-emerald-400/10 text-emerald-300'
                    }`}
                  >
                    {selected ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    ) : (
                      <PinIcon className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{regionLabel(r, lang)}</span>
                    {REGION_COORDS[r] && REGION_COORDS[r].city !== r && (
                      <span className={`block truncate text-[11px] ${selected ? 'text-primary-900/70' : 'text-white/50'}`}>
                        {cityLabel(r, lang)}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {city && city !== shown && <span className="sr-only">{t('Markaz', 'Центр')}: {city}</span>}
    </div>
  );
}
