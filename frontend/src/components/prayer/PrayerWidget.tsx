import { useEffect, useMemo, useState } from 'react';
import { usePrayerTimes } from '../../hooks/usePrayerTimes';
import { useNextPrayer } from '../../hooks/useNextPrayer';
import { useApi } from '../../hooks/useApi';
import { getMonthlyPrayerTimes, getYearlyPrayerTimes } from '../../services/prayerService';
import { PrayerCard } from './PrayerCard';
import { PrayerTimer } from './PrayerTimer';
import { MonthTable } from './MonthTable';
import { Loading } from '../common/Loading';
import { MosqueIcon } from '../common/Icons';
import { PRAYER_LABELS, monthName, monthsShort, prayerLabel, prayerTag, regionLabel, weekdays } from '../../utils/constants';
import { formatDate } from '../../utils/formatTime';
import { useI18n, type Lang } from '../../i18n';
import type { PrayerTimings } from '../../types/prayer';

interface PrayerWidgetProps {
  region: string;
}

/** Bugungi sana: '15-oktabr 2026 · chorshanba' / '15 октября 2026 · среда' */
function todayLabel(lang: Lang): string {
  const d = new Date();
  return `${formatDate(d, lang)} · ${weekdays(lang)[d.getDay()].toLowerCase()}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const TABS = ['Bugun', 'Oylik', 'Yillik'] as const;
type Tab = (typeof TABS)[number];
const TAB_RU: Record<Tab, string> = { Bugun: 'Сегодня', Oylik: 'Месяц', Yillik: 'Год' };

export function PrayerWidget({ region }: PrayerWidgetProps) {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<Tab>('Bugun');
  const dateLabel = useMemo(() => todayLabel(lang), [lang]);
  const now = new Date();

  const subtitle =
    tab === 'Bugun'
      ? dateLabel
      : tab === 'Oylik'
        ? `${capitalize(monthName(now.getMonth(), lang))} ${now.getFullYear()}`
        : t(`${now.getFullYear()}-yil`, `${now.getFullYear()} год`);

  return (
    <div className="w-full rounded-2xl bg-primary-800 p-3 text-white shadow-2xl shadow-primary-900/30 sm:p-4 lg:rounded-3xl">
      {/* Shahar va sana */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-700 text-accent-400">
          <MosqueIcon />
        </span>
        <div>
          <p className="font-display text-base font-bold">{regionLabel(region, lang)}</p>
          <p className="text-xs text-primary-100">{subtitle}</p>
        </div>
      </div>

      {/* Tab tugmalari: Bugun / Oylik / Yillik */}
      <div role="tablist" className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-primary-900/60 p-1 text-xs font-semibold">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-[40px] rounded-xl py-2 text-[13px] transition lg:min-h-0 lg:text-xs ${tab === id ? 'bg-primary-600 text-white' : 'text-primary-100 hover:bg-primary-700/60'}`}
          >
            {lang === 'ru' ? TAB_RU[id] : id}
          </button>
        ))}
      </div>

      {/* Barcha tablar uchun bir xil balandlik — tab almashganda sahifa siljimasligi uchun (telefonda «Bugun» ixcham) */}
      <div key={tab} role="tabpanel" className={`flex flex-col motion-safe:animate-fade-in lg:h-[23rem] ${tab === 'Bugun' ? 'min-h-[13rem]' : 'h-[23rem]'}`}>
        {tab === 'Bugun' && <DailyView region={region} />}
        {tab === 'Oylik' && <MonthlyView region={region} />}
        {tab === 'Yillik' && <YearlyView region={region} />}
      </div>

      <p className="mt-2 text-center text-[10px] text-primary-100/70">{t('Manba', 'Источник')}: islom.uz</p>
    </div>
  );
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loading label={label} className="text-primary-100" />
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="my-auto rounded-2xl bg-rose-500/15 p-4 text-center">
      <p className="text-sm text-rose-100">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
      >
        {t('Qayta urinish', 'Повторить')}
      </button>
    </div>
  );
}

function DailyView({ region }: { region: string }) {
  const { data, loading, error, retry } = usePrayerTimes(region);
  const { t } = useI18n();

  if (loading) return <PanelLoading label={t('Namoz vaqtlari yuklanmoqda...', 'Загрузка времени намаза...')} />;
  if (error) return <ErrorBox message={error} onRetry={retry} />;
  if (!data) return null;
  return <PrayerTimesBody timings={data.timings} />;
}

function MonthlyView({ region }: { region: string }) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const { data, loading, error, retry } = useApi(
    () => getMonthlyPrayerTimes(region, month, year),
    [region, month, year],
  );
  const { t } = useI18n();

  if (loading) return <PanelLoading label={t('Oylik jadval yuklanmoqda...', 'Загрузка расписания на месяц...')} />;
  if (error) return <ErrorBox message={error} onRetry={retry} />;
  if (!data) return null;
  return <MonthTable days={data.days} />;
}

function YearlyView({ region }: { region: string }) {
  const now = new Date();
  const year = now.getFullYear();
  const { data, loading, error, retry } = useApi(() => getYearlyPrayerTimes(region, year), [region, year]);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { t, lang } = useI18n();

  // Tanlangan oy hali e'lon qilinmagan bo'lsa — oxirgi mavjud oyni ko'rsatamiz
  useEffect(() => {
    if (data && !data.months.some((m) => m.month === month)) {
      setMonth(data.months[data.months.length - 1].month);
    }
  }, [data, month]);

  if (loading) return <PanelLoading label={t('Yillik jadval yuklanmoqda...', 'Загрузка расписания на год...')} />;
  if (error) return <ErrorBox message={error} onRetry={retry} />;
  if (!data) return null;

  const available = new Set(data.months.map((m) => m.month));
  const selected = data.months.find((m) => m.month === month);

  return (
    <>
      {/* Oylar: e'lon qilinmaganlari o'chirilgan */}
      <div className="mt-3 grid grid-cols-6 gap-1">
        {monthsShort(lang).map((short, i) => {
          const m = i + 1;
          const name = monthName(i, lang);
          const enabled = available.has(m);
          return (
            <button
              key={name}
              type="button"
              disabled={!enabled}
              onClick={() => setMonth(m)}
              title={enabled ? capitalize(name) : `${capitalize(name)} — ${t('hali e’lon qilinmagan', 'ещё не опубликовано')}`}
              className={`rounded-lg py-1.5 text-[11px] font-semibold transition ${
                m === month
                  ? 'bg-accent-400 text-primary-900'
                  : enabled
                    ? 'bg-white/5 text-white/85 hover:bg-white/15'
                    : 'cursor-not-allowed text-white/25'
              }`}
            >
              {short}
            </button>
          );
        })}
      </div>
      {selected && <MonthTable days={selected.days} />}
    </>
  );
}

function PrayerTimesBody({ timings }: { timings: PrayerTimings }) {
  const next = useNextPrayer(timings);
  const { lang } = useI18n();

  return (
    <>
      {/* Keyingi namoz taymeri */}
      <div className="mt-3 rounded-2xl bg-gradient-to-br from-accent-400/90 to-accent-500/90 py-2 lg:py-3">
        <PrayerTimer
          name={prayerLabel(next.key, lang)}
          remaining={next.remaining}
        />
      </div>

      {/* Namozlar ro'yxati */}
      <ul className="mt-2 grid grid-cols-3 gap-1.5 lg:block lg:space-y-1">
        {PRAYER_LABELS.map(({ key }) => (
          <PrayerCard
            key={key}
            name={prayerLabel(key, lang)}
            time={timings[key as keyof PrayerTimings]}
            tag={prayerTag(key, lang)}
            active={next.key === key}
          />
        ))}
      </ul>
    </>
  );
}
