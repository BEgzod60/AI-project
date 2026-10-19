import { useEffect, useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useLayoutRegion, useSetLayoutRegion } from '../../hooks/useTypedOutlet';
import { getMonthlyPrayerTimes, getMonthWithNext } from '../../services/prayerService';
import { MONTHS_RU, MONTHS_UZ, weekdays } from '../../utils/constants';
import { formatDate } from '../../utils/formatTime';
import { useI18n } from '../../i18n';
import type { PrayerDay } from '../../types/prayer';
import { ArrowRightIcon } from '../common/Icons';
import { SkeletonCard } from '../common/Loading';
import { PrayerIcon } from '../prayerTimes/PrayerIcons';
import { RegionPicker } from '../prayerTimes/RegionPicker';
import { addDays, formatDuration, hijriDate, hmToSeconds, useTashkentClock } from '../prayerTimes/clock';
import { dotted, weekdayOf } from '../prayerTimes/WeekTable';
import { monthsBetween, ramadanRange } from './ramadan';

const WEEKDAYS_SHORT = ['Ya', 'Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sh'];
const WEEKDAYS_SHORT_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/**
 * Saharlik va iftorlik: bugungi vaqtlar (hudud bo'yicha), keyingisigacha qolgan vaqt,
 * oylik jadval va Ramazon taqvimi. Saharlik — bomdod vaqti kirguncha, iftorlik — shom vaqti (islom.uz).
 */
export function SaharIftor() {
  const region = useLayoutRegion();
  const setRegion = useSetLayoutRegion();
  const now = useTashkentClock();
  const { t, lang } = useI18n();
  const [y, m] = now.iso.split('-').map(Number);
  const days = useApi(() => getMonthWithNext(region, y, m), [region, y, m]);

  const today = days.data?.find((d) => d.date === now.iso);
  const tomorrow = days.data?.find((d) => d.date === addDays(now.iso, 1));

  let next: 'saharlik' | 'iftorlik' = 'saharlik';
  let remaining = 0;
  if (today) {
    const sahar = hmToSeconds(today.timings.bomdod);
    const iftor = hmToSeconds(today.timings.shom);
    if (now.seconds < sahar) remaining = sahar - now.seconds;
    else if (now.seconds < iftor) (next = 'iftorlik'), (remaining = iftor - now.seconds);
    else remaining = 86400 - now.seconds + hmToSeconds((tomorrow ?? today).timings.bomdod);
  }
  const hijri = hijriDate(now.date, lang);

  const cards = [
    { key: 'saharlik' as const, prayer: 'bomdod' as const, title: t('Saharlik', 'Сухур'), sub: t('og‘iz yopish', 'завершение сухура'), time: today?.timings.bomdod },
    { key: 'iftorlik' as const, prayer: 'shom' as const, title: t('Iftorlik', 'Ифтар'), sub: t('og‘iz ochish', 'разговение'), time: today?.timings.shom },
  ];

  return (
    <>
      <section
        aria-labelledby="sahar-iftor"
        className="relative z-10 rounded-2xl bg-primary-900 p-4 text-white shadow-sm sm:p-6 md:rounded-3xl md:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="sahar-iftor" className="font-display text-xl font-bold md:text-2xl">
              {t('Saharlik va iftorlik', 'Сухур и ифтар')}
            </h2>
            <p className="mt-1 text-sm text-white/75">
              {formatDate(new Date(y, m - 1, Number(now.iso.slice(8))), lang)} · {weekdays(lang)[now.weekday]}
              {hijri && <span className="text-accent-400"> · {hijri}</span>}
            </p>
          </div>
          {/* Telefonda butun kenglikda; panel o'ng chetga tekislanib ochiladi — ekrandan chiqmaydi */}
          <div className="w-full sm:w-auto">
            <RegionPicker value={region} onChange={setRegion} align="right" />
          </div>
        </div>

        {days.error ? (
          <p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm text-white/85">{days.error}</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-4 md:mt-6">
            {cards.map((c) => {
              const isNext = c.key === next && !!today;
              return (
                <div
                  key={c.key}
                  className={`relative overflow-hidden rounded-2xl p-3.5 ring-1 sm:p-5 ${
                    isNext ? 'bg-white/[0.12] ring-accent-400/70' : 'bg-white/[0.06] ring-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent-400 sm:h-11 sm:w-11">
                      <PrayerIcon prayer={c.prayer} className="h-5 w-5 sm:h-6 sm:w-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-sm font-bold sm:text-lg">{c.title}</p>
                      <p className="truncate text-[11px] text-white/65 sm:text-xs">{c.sub}</p>
                    </div>
                  </div>
                  <p className="mt-3 font-display text-3xl font-extrabold tabular-nums sm:text-5xl">
                    {c.time ?? <span className="inline-block h-9 w-24 animate-pulse rounded-lg bg-white/10 align-middle sm:h-12" />}
                  </p>
                  {isNext && (
                    <p className="mt-2 text-xs text-white/80 sm:text-sm">
                      {c.key === 'iftorlik' ? t('Iftorgacha', 'До ифтара') : t('Saharlik tugashiga', 'До конца сухура')}{' '}
                      <span className="font-bold tabular-nums text-accent-400">{formatDuration(remaining)}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-xs leading-relaxed text-white/65">
          {t(
            'Saharlik bomdod vaqti kirishi bilan tugaydi, iftorlik shom vaqti kirishi bilan boshlanadi. Vaqtlar islom.uz ma’lumotlari asosida.',
            'Сухур заканчивается с наступлением времени бомдод, ифтар начинается с наступлением шом. Время — по данным islom.uz.',
          )}
        </p>
      </section>

      <SaharIftorTable region={region} todayIso={now.iso} />
    </>
  );
}

type View = 'oy' | 'ramazon';

function SaharIftorTable({ region, todayIso }: { region: string; todayIso: string }) {
  const { t, lang } = useI18n();
  const [view, setView] = useState<View>('oy');
  const [offset, setOffset] = useState(0);
  const [cy, cm] = todayIso.split('-').map(Number);
  const shown = new Date(Date.UTC(cy, cm - 1 + offset, 1));
  const y = shown.getUTCFullYear();
  const m = shown.getUTCMonth() + 1;
  const ramadan = ramadanRange(todayIso);

  const month = useApi(() => getMonthlyPrayerTimes(region, m, y), [region, y, m]);
  const ramadanDays = useApi(async () => {
    if (!ramadan) return null;
    const results = await Promise.allSettled(monthsBetween(ramadan.start, ramadan.end).map((p) => getMonthlyPrayerTimes(region, p.m, p.y)));
    if (results.some((r) => r.status === 'rejected')) return null; // hali e'lon qilinmagan
    return results
      .flatMap((r) => (r.status === 'fulfilled' ? r.value.days : []))
      .filter((d) => d.date >= ramadan.start && d.date <= ramadan.end);
  }, [region, ramadan?.start, ramadan?.end]);

  const monthName = (lang === 'ru' ? MONTHS_RU : MONTHS_UZ)[m - 1];
  const tabs: { key: View; label: string }[] = [
    { key: 'oy', label: t('Oylik', 'По месяцам') },
    { key: 'ramazon', label: t('Ramazon taqvimi', 'Календарь Рамадана') },
  ];
  const rangeLabel = ramadan && `${dotted(ramadan.start)} – ${dotted(ramadan.end)}`;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:rounded-3xl sm:p-5 dark:bg-neutral-900 dark:ring-white/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-neutral-900 dark:text-white">
          {view === 'oy' ? t('Saharlik va iftorlik jadvali', 'Расписание сухура и ифтара') : t('Ramazon taqvimi', 'Календарь Рамадана')}
        </h2>
        <div role="tablist" className="flex rounded-full bg-neutral-100 p-1 dark:bg-neutral-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={view === tab.key}
              onClick={() => setView(tab.key)}
              className={`min-h-[36px] rounded-full px-3.5 text-xs font-semibold transition sm:text-sm ${
                view === tab.key ? 'bg-primary-700 text-white shadow-sm' : 'text-neutral-600 hover:text-primary-700 dark:text-neutral-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'oy' ? (
        <>
          <div className="mt-4 flex items-center justify-between gap-2">
            <MonthButton direction="prev" onClick={() => setOffset((o) => o - 1)} label={t('Oldingi oy', 'Предыдущий месяц')} />
            <p className="font-display font-bold capitalize text-neutral-800 dark:text-neutral-100">
              {monthName} {y}
            </p>
            <MonthButton direction="next" onClick={() => setOffset((o) => o + 1)} label={t('Keyingi oy', 'Следующий месяц')} />
          </div>
          {month.loading ? (
            <SkeletonCard className="mt-4 h-64 rounded-2xl" />
          ) : month.error ? (
            <p className="mt-4 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{month.error}</p>
          ) : (
            month.data && <DaysTable days={month.data.days} todayIso={todayIso} />
          )}
        </>
      ) : ramadanDays.loading ? (
        <SkeletonCard className="mt-4 h-64 rounded-2xl" />
      ) : ramadanDays.data?.length ? (
        <>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {rangeLabel} · {t('Umm al-Quro taqvimi bo‘yicha; boshlanish sanasi O‘zbekiston musulmonlari idorasi e’loniga ko‘ra bir kunga farq qilishi mumkin.', 'по календарю Умм аль-Кура; дата начала по объявлению Управления мусульман Узбекистана может отличаться на день.')}
          </p>
          <DaysTable days={ramadanDays.data} todayIso={todayIso} numbered />
        </>
      ) : (
        <p className="mt-4 rounded-2xl bg-accent-100 p-4 text-sm leading-relaxed text-neutral-700 ring-1 ring-accent-400/40 dark:bg-accent-500/10 dark:text-neutral-200 dark:ring-accent-500/30">
          {t(
            `Keyingi Ramazon taxminan ${rangeLabel ?? ''} kunlariga to‘g‘ri keladi. Bu kunlar uchun vaqtlar islom.uz tomonidan hali e’lon qilinmagan — e’lon qilingach, Ramazon taqvimi shu yerda chiqadi.`,
            `Следующий Рамадан ожидается примерно ${rangeLabel ?? ''}. Время на эти дни ещё не опубликовано islom.uz — после публикации календарь Рамадана появится здесь.`,
          )}
        </p>
      )}
    </section>
  );
}

function MonthButton({ direction, onClick, label }: { direction: 'prev' | 'next'; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="tap-press inline-flex h-10 w-10 items-center justify-center rounded-full text-primary-700 ring-1 ring-primary-500/30 transition hover:bg-primary-50 dark:text-emerald-300 dark:hover:bg-primary-900/40"
    >
      <ArrowRightIcon className={`h-4 w-4 ${direction === 'prev' ? 'rotate-180' : ''}`} />
    </button>
  );
}

function DaysTable({ days, todayIso, numbered = false }: { days: PrayerDay[]; todayIso: string; numbered?: boolean }) {
  const { t, lang } = useI18n();
  const boxRef = useRef<HTMLDivElement>(null);

  // Bugungi qatorni jadval ichida ko'rinishga olib kelamiz (sahifaning o'zini surmasdan)
  useEffect(() => {
    const box = boxRef.current;
    const row = box?.querySelector<HTMLElement>('tr[aria-current="date"]');
    if (box && row) box.scrollTop = row.offsetTop - box.clientHeight / 3;
  }, [days, todayIso]);

  return (
    <div ref={boxRef} className="relative mt-4 max-h-[32rem] overflow-auto rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
      <table className="w-full text-sm tabular-nums">
        <thead className="sticky top-0 bg-neutral-50 text-left text-xs font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          <tr>
            {numbered && <th scope="col" className="px-3 py-2.5 text-center">{t('Kun', 'День')}</th>}
            <th scope="col" className="px-3 py-2.5">{t('Sana', 'Дата')}</th>
            <th scope="col" className="px-3 py-2.5 text-center">{t('Saharlik', 'Сухур')}</th>
            <th scope="col" className="px-3 py-2.5 text-center">{t('Iftorlik', 'Ифтар')}</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d, i) => {
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
                {numbered && <td className="px-3 py-2.5 text-center font-bold text-accent-500">{i + 1}</td>}
                <td className="whitespace-nowrap px-3 py-2.5">
                  {dotted(d.date).slice(0, 5)}
                  <span className={`ml-2 text-xs ${wd === 5 ? 'text-accent-500' : 'text-neutral-500'}`}>
                    {(lang === 'ru' ? WEEKDAYS_SHORT_RU : WEEKDAYS_SHORT)[wd]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center font-semibold">{d.timings.bomdod}</td>
                <td className="px-3 py-2.5 text-center font-semibold">{d.timings.shom}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
