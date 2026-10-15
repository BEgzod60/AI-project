import { PRAYER_LABELS } from '../../utils/constants';
import type { PrayerTimings } from '../../types/prayer';
import { currentPeriod, formatDuration, hmToSeconds, type ClockNow, type PrayerKey } from './clock';
import { PrayerIcon } from './PrayerIcons';

const label = (k: PrayerKey) => PRAYER_LABELS.find((p) => p.key === k)?.label ?? k;
/** Kartochkalar: quyosh alohida karta emas — bomdod ostida ko'rsatiladi */
const CARDS: PrayerKey[] = ['bomdod', 'peshin', 'asr', 'shom', 'xufton'];

interface Props {
  timings: PrayerTimings;
  now: ClockNow;
  /** Ertangi bomdod (xuftondan keyingi hisob uchun), bo'lmasa bugungisi olinadi */
  tomorrowBomdod?: string;
}

export function CurrentPrayerPanel({ timings, now, tomorrowBomdod }: Props) {
  const period = currentPeriod(timings, now.seconds, tomorrowBomdod);

  return (
    <section className="grid overflow-hidden rounded-3xl bg-primary-900 text-white shadow-sm ring-1 ring-white/5 lg:grid-cols-[220px_minmax(0,300px)_1fr]">
      {/* Rasm */}
      <div
        aria-hidden
        className="hidden bg-cover bg-center lg:block"
        style={{ backgroundImage: 'linear-gradient(to right, transparent 60%, rgb(7 42 22)), url(/images/namoz/03.webp)' }}
      />

      {/* Hozirgi vaqt va taymer */}
      <div className="flex flex-col justify-center p-6">
        <p className="text-sm text-white/70">Hozirgi vaqt</p>
        <p className="font-display text-3xl font-extrabold md:text-4xl">{label(period.current)}</p>
        <p className="mt-3 text-sm text-white/70">{label(period.next)} vaqtigacha:</p>
        <p className="font-display text-4xl font-bold tabular-nums text-emerald-400" aria-live="off">
          {formatDuration(period.remaining)}
        </p>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label={`${label(period.current)} oralig'i`}
          aria-valuenow={Math.round(period.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-1000 ease-linear"
            style={{ width: `${period.progress * 100}%` }}
          />
        </div>
      </div>

      {/* 5 ta namoz kartasi */}
      <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-5 lg:p-5">
        {CARDS.map((k) => {
          const start = hmToSeconds(timings[k]);
          const isCurrent = period.current === k && start <= now.seconds;
          const passed = !isCurrent && start <= now.seconds;
          return (
            <li
              key={k}
              className={`flex flex-col items-center justify-center rounded-2xl px-2 py-4 text-center transition-colors duration-500 ${
                isCurrent
                  ? 'bg-primary-500 shadow-lg shadow-primary-900/40 ring-1 ring-emerald-300/40'
                  : 'bg-white/[0.06] ring-1 ring-white/10'
              } ${passed ? 'opacity-60' : ''}`}
            >
              <PrayerIcon prayer={k} className={`h-8 w-8 ${k === 'xufton' ? 'text-white' : 'text-accent-400'}`} />
              <p className="mt-2 text-sm font-bold">{label(k)}</p>
              <p className="font-display text-2xl font-bold tabular-nums">{timings[k]}</p>
              <p className="mt-1 text-[11px] leading-tight text-white/75">
                {k === 'bomdod' && (
                  <span className="block">Quyosh chiqishi {timings.quyosh}</span>
                )}
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-400" /> Hozir
                  </span>
                ) : passed ? (
                  k !== 'bomdod' && 'O‘tdi'
                ) : (
                  <span className="tabular-nums">{formatDuration(start - now.seconds)} qoldi</span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
