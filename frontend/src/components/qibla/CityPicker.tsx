import { useEffect, useRef } from 'react';
import { REGIONS } from '../../utils/constants';
import { REGION_COORDS } from '../prayerTimes/clock';

interface Props {
  /** Tanlangan hudud (GPS ishlatilgan bo'lsa — null) */
  value: string | null;
  onChange: (region: string) => void;
  onClose: () => void;
}

function PinIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-5.1-7-11a7 7 0 1 1 14 0c0 5.9-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

/**
 * Shaharni qo'lda tanlash: viloyat panelidagi kabi chiplar. Kartaning o'zida (oqimda) ochiladi —
 * ekrandan tashqariga chiqmaydi. Escape bilan yopiladi.
 */
export function CityPicker({ value, onChange, onClose }: Props) {
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="rounded-2xl bg-primary-900 p-3 shadow-lg ring-1 ring-white/10 motion-safe:animate-fade-in">
      <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-white/55">Shaharni tanlang</p>
      <div role="radiogroup" aria-label="Shahar" className="grid grid-cols-2 gap-1.5">
        {REGIONS.map((region, i) => {
          const c = REGION_COORDS[region];
          if (!c) return null;
          const active = region === value;
          return (
            <button
              key={region}
              ref={i === 0 ? firstRef : undefined}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(region)}
              className={`flex min-h-[3rem] min-w-0 items-center gap-2 rounded-xl px-2 py-2 min-[400px]:px-2.5 text-left ring-1 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${
                active
                  ? 'bg-gradient-to-br from-accent-400 to-accent-500 text-primary-900 shadow-lg shadow-accent-500/20 ring-accent-400'
                  : 'bg-white/[0.05] text-white ring-white/10 hover:bg-white/10 hover:ring-emerald-300/40'
              }`}
            >
              <span
                className={`hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg min-[400px]:flex ${
                  active ? 'bg-primary-900/15 text-primary-900' : 'bg-emerald-400/10 text-emerald-300'
                }`}
              >
                {active ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                ) : (
                  <PinIcon className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-tight">{c.city}</span>
                {c.city !== region && (
                  <span className={`block text-[10px] leading-tight min-[400px]:text-[11px] ${active ? 'text-primary-900/70' : 'text-white/50'}`}>{region}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
