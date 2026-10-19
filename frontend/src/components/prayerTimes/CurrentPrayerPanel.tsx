import { prayerLabel } from '../../utils/constants';
import { useI18n } from '../../i18n';
import type { PrayerTimings } from '../../types/prayer';
import { currentPeriod, formatDuration, hmToSeconds, type ClockNow, type PrayerKey } from './clock';
import { PrayerIcon } from './PrayerIcons';

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
  const { t, lang } = useI18n();
  const label = (k: PrayerKey) => prayerLabel(k, lang);

  return (
    <section className="grid overflow-hidden rounded-2xl bg-primary-900 md:rounded-3xl text-white shadow-sm ring-1 ring-white/5 lg:grid-cols-[minmax(0,280px)_1fr] xl:grid-cols-[220px_minmax(0,300px)_1fr]">
      {/* Rasm */}
      <div
        aria-hidden
        // 1024–1279px: rasm yashiriladi — 5 ta karta sig'ishi uchun (avval raqamlar ustma-ust tushardi)
        className="hidden bg-cover bg-center xl:block"
        style={{ backgroundImage: 'linear-gradient(to right, transparent 60%, rgb(7 42 22)), url(/images/namoz/03.webp)' }}
      />

      {/* Hozirgi vaqt va taymer */}
      {/* Telefonda: chapda hozirgi namoz, o'ngda taymer — bitta ixcham qatorda */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 px-4 pb-1 pt-4 lg:flex lg:flex-col lg:justify-center lg:p-6">
        <div className="min-w-0 lg:w-full">
          <p className="text-[13px] text-white/70 lg:text-sm">{t('Hozirgi vaqt', 'Текущий намаз')}</p>
          <p className="truncate font-display text-2xl font-extrabold md:text-4xl">{label(period.current)}</p>
        </div>
        <div className="text-right lg:w-full lg:text-left">
          <p className="text-[13px] text-white/70 lg:mt-3 lg:text-sm">{t(`${label(period.next)} vaqtigacha:`, `До намаза ${label(period.next)}:`)}</p>
          <p className="font-display text-[1.75rem] font-bold leading-tight tabular-nums text-emerald-400 lg:text-4xl" aria-live="off">
            {formatDuration(period.remaining)}
          </p>
        </div>
        <div
          className="col-span-2 mt-2 h-1.5 overflow-hidden rounded-full bg-white/10 lg:mt-3 lg:h-2 lg:w-full"
          role="progressbar"
          aria-label={t(`${label(period.current)} oralig‘i`, `Период ${label(period.current)}`)}
          aria-valuenow={Math.round(period.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-1000 ease-linear"
            style={{ width: `${period.progress * 100}%` }}
          />
        </div>
        {/* Telefonda kartalardagi qo'shimcha qatorlar yashirilgan — quyosh chiqishi shu yerda */}
        <p className="col-span-2 mt-2 text-[13px] text-white/70 sm:hidden">
          {t('Quyosh chiqishi', 'Восход')} <span className="font-semibold tabular-nums text-white">{timings.quyosh}</span>
        </p>
      </div>

      {/* 5 ta namoz kartasi — telefonda ham bitta qatorda */}
      <ul className="grid grid-cols-5 gap-1.5 p-3 sm:gap-3 sm:p-4 lg:p-5">
        {CARDS.map((k) => {
          const start = hmToSeconds(timings[k]);
          const isCurrent = period.current === k && start <= now.seconds;
          const passed = !isCurrent && start <= now.seconds;
          return (
            <li
              key={k}
              className={`flex min-w-0 flex-col items-center justify-center rounded-xl px-0.5 py-2 text-center sm:rounded-2xl sm:px-2 sm:py-4 transition-colors duration-500 ${
                isCurrent
                  ? 'bg-primary-500 shadow-lg shadow-primary-900/40 ring-1 ring-emerald-300/40'
                  : 'bg-white/[0.06] ring-1 ring-white/10'
              } ${passed ? 'opacity-60' : ''}`}
            >
              <PrayerIcon prayer={k} className={`h-5 w-5 sm:h-8 sm:w-8 ${k === 'xufton' ? 'text-white' : 'text-accent-400'}`} />
              <p className="mt-1 w-full truncate text-[12px] font-bold sm:mt-2 sm:w-auto sm:overflow-visible sm:whitespace-normal sm:text-sm">{label(k)}</p>
              <p className="font-display text-[15px] font-bold tabular-nums sm:text-2xl">{timings[k]}</p>
              <p className="mt-1 hidden text-[11px] leading-tight text-white/75 sm:block">
                {k === 'bomdod' && (
                  <span className="block">{t('Quyosh chiqishi', 'Восход')} {timings.quyosh}</span>
                )}
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-400" /> {t('Hozir', 'Сейчас')}
                  </span>
                ) : passed ? (
                  k !== 'bomdod' && t('O‘tdi', 'Прошёл')
                ) : (
                  <span className="tabular-nums">{t(`${formatDuration(start - now.seconds)} qoldi`, `через ${formatDuration(start - now.seconds)}`)}</span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
