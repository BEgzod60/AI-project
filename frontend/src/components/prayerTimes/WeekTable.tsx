import { useState } from 'react';
import { PRAYER_LABELS, prayerLabel, weekdays } from '../../utils/constants';
import type { PrayerDay, PrayerTimings } from '../../types/prayer';
import { ArrowRightIcon } from '../common/Icons';
import { useI18n } from '../../i18n';

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

/** Qisqa hafta kunlari (0 = yakshanba) — tor ekranda sana ostida */
const WEEKDAYS_SHORT = ['Ya', 'Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sh'];
const WEEKDAYS_SHORT_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function WeekTable({ days, todayIso }: Props) {
  const [showAll, setShowAll] = useState(false);
  const { t, lang } = useI18n();
  const month = todayIso.slice(0, 7);
  const start = Math.max(0, days.findIndex((d) => d.date >= todayIso));
  const rows = showAll ? days.filter((d) => d.date.startsWith(month)) : days.slice(start, start + 7);

  return (
    <section className="flex flex-col rounded-2xl bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5 ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-neutral-900 dark:text-white">
          {showAll ? t('Oylik namoz vaqtlari', 'Время намаза на месяц') : t('Haftalik namoz vaqtlari', 'Время намаза на неделю')}
        </h2>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-primary-700 ring-1 ring-primary-500/30 transition hover:bg-primary-50 dark:text-emerald-300 dark:hover:bg-primary-900/40"
        >
          {showAll ? t('Faqat 7 kun', 'Только 7 дней') : t('Barcha kunlar', 'Все дни')}
          <ArrowRightIcon className={`h-3.5 w-3.5 transition-transform ${showAll ? '-rotate-90' : 'rotate-90'}`} />
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">{t('Bu kunlar uchun namoz vaqtlari hali e’lon qilinmagan.', 'Время намаза на эти дни ещё не опубликовано.')}</p>
      ) : (
        <div className={`mt-4 overflow-auto rounded-2xl ring-1 ring-black/5 dark:ring-white/10 ${showAll ? 'max-h-[28rem]' : ''}`}>
          {/* Telefonda "Kun" ustuni sana ostiga tushadi — 6 ta vaqt aylantirmasdan sig'adi */}
          <table className="w-full text-xs tabular-nums sm:min-w-[560px] sm:text-sm">
            <thead className="sticky top-0 bg-neutral-50 text-left text-xs font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              <tr>
                <th scope="col" className="px-1.5 py-2.5 sm:px-3">{t('Sana', 'Дата')}</th>
                <th scope="col" className="hidden px-3 py-2.5 sm:table-cell">{t('Kun', 'День')}</th>
                {PRAYER_LABELS.map((p) => (
                  <th key={p.key} scope="col" className="px-0 py-2.5 text-center text-[10px] sm:px-2 sm:text-xs">{prayerLabel(p.key, lang)}</th>
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
                    <td className="whitespace-nowrap px-1.5 py-2.5 sm:px-3">
                      <span className="sm:hidden">{dotted(d.date).slice(0, 5)}</span>
                      <span className="hidden sm:inline">{dotted(d.date)}</span>
                      <span className={`block text-[10px] font-normal sm:hidden ${wd === 5 ? 'text-accent-500' : 'text-neutral-500'}`}>
                        {(lang === 'ru' ? WEEKDAYS_SHORT_RU : WEEKDAYS_SHORT)[wd]}
                      </span>
                    </td>
                    <td className={`hidden px-3 py-2.5 sm:table-cell ${wd === 5 ? 'text-accent-500' : ''}`}>{weekdays(lang)[wd]}</td>
                    {PRAYER_LABELS.map((p) => (
                      <td key={p.key} className="px-0 py-2.5 text-center text-[11px] sm:px-2 sm:text-sm">{d.timings[p.key as keyof PrayerTimings]}</td>
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
