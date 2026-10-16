import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { getMonthlyPrayerTimes } from '../../services/prayerService';
import { MONTHS_UZ, PRAYER_LABELS, WEEKDAYS_UZ } from '../../utils/constants';
import type { PrayerTimings } from '../../types/prayer';
import { ArrowRightIcon } from '../common/Icons';
import { Spinner } from '../common/Loading';
import { weekdayOf } from './WeekTable';

const WEEK_HEADER = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sh', 'Ya'];

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Props {
  region: string;
  todayIso: string;
}

export function MonthCalendar({ region, todayIso }: Props) {
  const [ty, tm] = todayIso.split('-').map(Number);
  const [view, setView] = useState({ y: ty, m: tm });
  const [selected, setSelected] = useState(todayIso);
  const { data, loading, error, retry } = useApi(
    () => getMonthlyPrayerTimes(region, view.m, view.y),
    [region, view.y, view.m],
  );

  // Boshqa oyga o'tganda — o'sha oyning birinchi kuni (yoki bugun) tanlanadi
  useEffect(() => {
    setSelected(view.y === ty && view.m === tm ? todayIso : iso(view.y, view.m, 1));
  }, [view.y, view.m, ty, tm, todayIso]);

  const shift = (delta: number) =>
    setView(({ y, m }) => {
      const idx = y * 12 + (m - 1) + delta;
      return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
    });

  const daysInMonth = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
  const prevMonthDays = new Date(Date.UTC(view.y, view.m - 1, 0)).getUTCDate();
  const lead = (weekdayOf(iso(view.y, view.m, 1)) + 6) % 7; // dushanbadan boshlanadi
  const byDate = new Map((data?.days ?? []).map((d) => [d.date, d.timings]));
  const selectedTimings = byDate.get(selected);
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;

  return (
    <section className="flex flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-neutral-900 dark:text-white">Oylik taqvim</h2>
        <div className="flex items-center gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Oldingi oy"
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-600 transition hover:bg-white hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" />
          </button>
          <span className="min-w-[7.5rem] text-center text-xs font-semibold text-neutral-700 dark:text-neutral-200" aria-live="polite">
            {capitalize(MONTHS_UZ[view.m - 1])} {view.y}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Keyingi oy"
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-600 transition hover:bg-white hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-neutral-500">
          {WEEK_HEADER.map((d) => (
            <span key={d} className={`py-1 ${d === 'Ju' ? 'text-accent-500' : ''}`}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: cells }, (_, i) => {
            const day = i - lead + 1;
            if (day < 1 || day > daysInMonth) {
              const shown = day < 1 ? prevMonthDays + day : day - daysInMonth;
              return (
                <span key={i} aria-hidden className="flex aspect-square items-center justify-center rounded-lg text-xs text-neutral-300 dark:text-neutral-600">
                  {shown}
                </span>
              );
            }
            const date = iso(view.y, view.m, day);
            const has = byDate.has(date);
            const isToday = date === todayIso;
            const isSelected = date === selected;
            const isFriday = weekdayOf(date) === 5;
            return (
              <button
                key={i}
                type="button"
                disabled={!has}
                onClick={() => setSelected(date)}
                aria-pressed={isSelected}
                aria-label={`${day}-${MONTHS_UZ[view.m - 1]}${isToday ? ', bugun' : ''}`}
                className={`relative flex aspect-square items-center justify-center rounded-lg text-xs font-semibold tabular-nums transition ${
                  isSelected
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-900/20'
                    : isToday
                      ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-500 dark:bg-primary-900/40 dark:text-emerald-300'
                      : has
                        ? 'bg-neutral-50 text-neutral-700 hover:bg-primary-50 hover:text-primary-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-primary-900/40'
                        : 'cursor-not-allowed text-neutral-300 dark:text-neutral-600'
                }`}
              >
                {day}
                {isFriday && (
                  <span aria-hidden className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-accent-400'}`} />
                )}
              </button>
            );
          })}
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/60 dark:bg-neutral-900/60">
            <Spinner className="h-6 w-6" />
          </div>
        )}
      </div>

      {/* Tanlangan kun vaqtlari */}
      <div className="mt-4 rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-800/60">
        {error && !loading ? (
          <div className="text-center text-xs text-neutral-500">
            {error}{' '}
            <button type="button" onClick={retry} className="font-semibold text-primary-700 underline dark:text-emerald-300">
              Qayta urinish
            </button>
          </div>
        ) : selectedTimings ? (
          <>
            <p className="text-xs font-semibold text-neutral-500">
              {Number(selected.slice(8))}-{MONTHS_UZ[view.m - 1]}, {WEEKDAYS_UZ[weekdayOf(selected)].toLowerCase()}
            </p>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
              {PRAYER_LABELS.map((p) => (
                <div key={p.key} className="rounded-xl bg-white py-1.5 dark:bg-neutral-900">
                  <dt className="text-[10px] text-neutral-500">{p.label}</dt>
                  <dd className="text-sm font-bold tabular-nums text-neutral-900 dark:text-white">
                    {selectedTimings[p.key as keyof PrayerTimings]}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          !loading && <p className="text-center text-xs text-neutral-500">Kunni tanlang.</p>
        )}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-500">
        <span className="h-1.5 w-1.5 rounded-full bg-accent-400" /> Juma kunlari
      </p>
    </section>
  );
}
