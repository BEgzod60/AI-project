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
import { MONTHS_SHORT_UZ, MONTHS_UZ, PRAYER_LABELS, WEEKDAYS_UZ } from '../../utils/constants';
import type { PrayerTimings } from '../../types/prayer';

interface PrayerWidgetProps {
  region: string;
}

/** Bugungi sana: '15-oktabr 2026 · chorshanba' shaklida */
function todayLabel(): string {
  const d = new Date();
  return `${d.getDate()}-${MONTHS_UZ[d.getMonth()]} ${d.getFullYear()} · ${WEEKDAYS_UZ[d.getDay()].toLowerCase()}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const TABS = ['Bugun', 'Oylik', 'Yillik'] as const;
type Tab = (typeof TABS)[number];

export function PrayerWidget({ region }: PrayerWidgetProps) {
  const [tab, setTab] = useState<Tab>('Bugun');
  const dateLabel = useMemo(todayLabel, []);
  const now = new Date();

  const subtitle =
    tab === 'Bugun'
      ? dateLabel
      : tab === 'Oylik'
        ? `${capitalize(MONTHS_UZ[now.getMonth()])} ${now.getFullYear()}`
        : `${now.getFullYear()}-yil`;

  return (
    <div className="w-full rounded-3xl bg-primary-800 p-4 text-white shadow-2xl shadow-primary-900/30">
      {/* Shahar va sana */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-700 text-accent-400">
          <MosqueIcon />
        </span>
        <div>
          <p className="font-display text-base font-bold">{region}</p>
          <p className="text-xs text-primary-100">{subtitle}</p>
        </div>
      </div>

      {/* Tab tugmalari: Bugun / Oylik / Yillik */}
      <div role="tablist" className="mt-3 grid grid-cols-3 gap-1 rounded-2xl bg-primary-900/60 p-1 text-xs font-semibold">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-xl py-2 transition ${tab === t ? 'bg-primary-600 text-white' : 'text-primary-100 hover:bg-primary-700/60'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Barcha tablar uchun bir xil balandlik — tab almashganda sahifa siljimasligi uchun */}
      <div key={tab} role="tabpanel" className="flex h-[23rem] flex-col motion-safe:animate-fade-in">
        {tab === 'Bugun' && <DailyView region={region} />}
        {tab === 'Oylik' && <MonthlyView region={region} />}
        {tab === 'Yillik' && <YearlyView region={region} />}
      </div>

      <p className="mt-2 text-center text-[10px] text-primary-100/70">Manba: islom.uz</p>
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
  return (
    <div className="my-auto rounded-2xl bg-rose-500/15 p-4 text-center">
      <p className="text-sm text-rose-100">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
      >
        Qayta urinish
      </button>
    </div>
  );
}

function DailyView({ region }: { region: string }) {
  const { data, loading, error, retry } = usePrayerTimes(region);

  if (loading) return <PanelLoading label="Namoz vaqtlari yuklanmoqda..." />;
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

  if (loading) return <PanelLoading label="Oylik jadval yuklanmoqda..." />;
  if (error) return <ErrorBox message={error} onRetry={retry} />;
  if (!data) return null;
  return <MonthTable days={data.days} />;
}

function YearlyView({ region }: { region: string }) {
  const now = new Date();
  const year = now.getFullYear();
  const { data, loading, error, retry } = useApi(() => getYearlyPrayerTimes(region, year), [region, year]);
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Tanlangan oy hali e'lon qilinmagan bo'lsa — oxirgi mavjud oyni ko'rsatamiz
  useEffect(() => {
    if (data && !data.months.some((m) => m.month === month)) {
      setMonth(data.months[data.months.length - 1].month);
    }
  }, [data, month]);

  if (loading) return <PanelLoading label="Yillik jadval yuklanmoqda..." />;
  if (error) return <ErrorBox message={error} onRetry={retry} />;
  if (!data) return null;

  const available = new Set(data.months.map((m) => m.month));
  const selected = data.months.find((m) => m.month === month);

  return (
    <>
      {/* Oylar: e'lon qilinmaganlari o'chirilgan */}
      <div className="mt-3 grid grid-cols-6 gap-1">
        {MONTHS_UZ.map((name, i) => {
          const m = i + 1;
          const enabled = available.has(m);
          return (
            <button
              key={name}
              type="button"
              disabled={!enabled}
              onClick={() => setMonth(m)}
              title={enabled ? capitalize(name) : `${capitalize(name)} — hali e'lon qilinmagan`}
              className={`rounded-lg py-1.5 text-[11px] font-semibold transition ${
                m === month
                  ? 'bg-accent-400 text-primary-900'
                  : enabled
                    ? 'bg-white/5 text-white/85 hover:bg-white/15'
                    : 'cursor-not-allowed text-white/25'
              }`}
            >
              {MONTHS_SHORT_UZ[i]}
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

  return (
    <>
      {/* Keyingi namoz taymeri */}
      <div className="mt-3 rounded-2xl bg-gradient-to-br from-accent-400/90 to-accent-500/90 py-3">
        <PrayerTimer
          name={PRAYER_LABELS.find((p) => p.key === next.key)?.label ?? next.key}
          remaining={next.remaining}
        />
      </div>

      {/* Namozlar ro'yxati */}
      <ul className="mt-2 space-y-1">
        {PRAYER_LABELS.map(({ key, label, tag }) => (
          <PrayerCard
            key={key}
            name={label}
            time={timings[key as keyof PrayerTimings]}
            tag={tag}
            active={next.key === key}
          />
        ))}
      </ul>
    </>
  );
}
