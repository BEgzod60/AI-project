import { useEffect, useId, useRef, useState } from 'react';
import type { BirgaRecitation } from '../../types/birga';
import { useT } from '../../i18n';

/** "Ixlos surasi" -> "Ixlos" */
const shortName = (name: string) => name.replace(/\s+surasi$/i, '');

/** O'qilishining boshi: "1. Qul huvallohu ahad 2. ..." -> "Qul huvallohu ahad…" */
function preview(text: string) {
  const first = text.replace(/^\s*1\.\s*/, '').split(/\s+\d+\.\s/)[0].trim();
  return first.length > 34 ? `${first.slice(0, 32).trimEnd()}…` : first;
}

function NumberBadge({ n, active }: { n: number | null; active: boolean }) {
  return (
    <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center text-xs font-bold tabular-nums ${active ? 'text-primary-900' : 'text-accent-400'}`}>
      <svg viewBox="0 0 40 40" className={`absolute inset-0 h-full w-full ${active ? 'text-accent-400' : 'text-accent-400/80'}`} aria-hidden>
        <path fill="currentColor" fillOpacity={active ? 1 : 0.12} stroke="currentColor" strokeWidth="1.6" d="M20 2 25 7h7v7l5 6-5 6v7h-7l-5 5-5-5H8v-7l-5-6 5-6V7h7Z" />
      </svg>
      <span className="relative">{n ?? '•'}</span>
    </span>
  );
}

interface Props {
  options: BirgaRecitation[];
  value: string;
  onChange: (slug: string) => void;
  /** Tugma ustidagi kichik yozuv, masalan «1-rakat zam surasi» */
  label?: string;
  /** Ogohlantirish (masalan, boshqa rakatda ham tanlangan) */
  warning?: string;
}

/** Zam sura tanlash (qorong'i rejim uchun). Ro'yxat oqimda ochiladi — telefonda ekrandan chiqmaydi. */
export function ZamSuraSelect({ options, value, onChange, label, warning }: Props) {
  const t = useT();
  label = label ?? t('Zam sura', 'Дополнительная сура');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.slug === value) ?? options[0];

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

  if (!selected) return null;

  return (
    <div ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={listId}
        className={`group flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-transparent p-2 pr-3 text-left ring-1 transition hover:ring-emerald-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${open ? 'ring-emerald-400/70' : 'ring-white/15'}`}
      >
        <NumberBadge n={selected.surah_number} active />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-accent-400/90">{label}</span>
          <span className="block truncate font-display text-base font-bold text-white">{/[А-Яа-я]/.test(selected.name) ? selected.name : `${shortName(selected.name)} surasi`}</span>
          <span className="block truncate text-xs italic text-white/50">{preview(selected.transliteration)}</span>
        </span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/10 transition ${open ? 'rotate-180 bg-emerald-500/20 text-emerald-300' : 'group-hover:text-white'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>
        </span>
      </button>

      {warning && !open && <p className="mt-1 px-1 text-[11px] text-amber-200/90">{warning}</p>}
      {open && (
        <ul id={listId} role="listbox" aria-label={t('Zam surani tanlang', 'Выберите дополнительную суру')} className="mt-2 grid grid-cols-2 gap-1.5 rounded-2xl bg-black/40 p-1.5 ring-1 ring-white/10 motion-safe:animate-fade-in">
          {options.map((r) => {
            const active = r.slug === selected.slug;
            return (
              <li key={r.slug} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(r.slug);
                    setOpen(false);
                    buttonRef.current?.focus();
                  }}
                  className={`flex w-full items-center gap-2 rounded-xl px-1.5 py-1.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${
                    active ? 'bg-emerald-500/15 font-semibold text-white ring-1 ring-emerald-400/70' : 'text-white/75 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <NumberBadge n={r.surah_number} active={active} />
                  <span className="min-w-0 flex-1 truncate">{shortName(r.name)}</span>
                  {active && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
