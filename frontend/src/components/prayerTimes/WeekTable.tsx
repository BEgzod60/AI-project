import { useState } from 'react';
import { PRAYER_LABELS, WEEKDAYS_UZ } from '../../utils/constants';
import type { PrayerDay, PrayerTimings } from '../../types/prayer';
import { ArrowRightIcon } from '../common/Icons';

/** '2026-10-15' -> hafta kuni indeksi (0 = yakshanba) */
export function weekdayOf(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/** '2026-10-15' -> '15.10.2026' */
export function dotted(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

interface Props {
  /** Joriy va (bo'lsa) keyingi oy kunlari, sana bo'yicha tartiblangan */
  days: PrayerDay[];
  todayIso: string;
}

export function WeekTable({ days, todayIso }: Props) {
  const [showAll, setShowAll] = useState(false);
  const month = todayIso.slice(0, 7);
  const start = Math.max(0, days.findIndex((d) => d.date >= todayIso));
  const rows = showAll ? days.filter((d) => d.date.startsWith(month)) : days.slice(start, start + 7);

  return (
    <section className="flex flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-neutral-900 dark:text-white">
          {showAll ? 'Oylik namoz vaqtlari' : 'Haftalik namoz vaqtlari'}
        </h2>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-primary-700 ring-1 ring-primary-500/30 transition hover:bg-primary-50 dark:text-emerald-300 dark:hover:bg-primary-900/40"
        >
          {showAll ? 'Faqat 7 kun' : 'Barcha kunlar'}
          <ArrowRightIcon className={`h-3.5 w-3.5 transition-transform ${showAll ? '-rotate-90' : 'rotate-90'}`} />
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">Bu kunlar uchun namoz vaqtlari hali e'lon qilinmagan.</p>
      ) : (
        <div className={`mt-4 overflow-auto rounded-2xl ring-1 ring-black/5 dark:ring-white/10 ${showAll ? 'max-h-[28rem]' : ''}`}>
          <table className="w-full min-w-[560px] text-sm tabular-nums">
            <thead className="sticky top-0 bg-neutral-50 text-left text-xs font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <tr>
                <th scope="col" className="px-3 py-2.5">Sana</th>
                <th scope="col" className="px-3 py-2.5">Kun</th>
                {PRAYER_LABELS.map((p) => (
                  <th key={p.key} scope="col" className="px-2 py-2.5 text-center">{p.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const isToday = d.date === todayIso;
                const wd = weekdayOf(d.date);
                return (
                  <tr
                    key={d.date}
                    aria-current={isToday ? 'date' : undefined}
                    className={`border-t border-neutral-100 dark:border-neutral-800 ${
                      isToday ? 'bg-primary-50 font-semibold text-primary-800 dark:bg-primary-900/40 dark:text-emerald-200' : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <td className="px-3 py-2.5">{dotted(d.date)}</td>
                    <td className={`px-3 py-2.5 ${wd === 5 ? 'text-accent-500' : ''}`}>{WEEKDAYS_UZ[wd]}</td>
                    {PRAYER_LABELS.map((p) => (
                      <td key={p.key} className="px-2 py-2.5 text-center">{d.timings[p.key as keyof PrayerTimings]}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
