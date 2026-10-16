import { useApi } from '../../hooks/useApi';
import { useLayoutRegion, useSetLayoutRegion } from '../../hooks/useTypedOutlet';
import { getDailyPrayerTimes, getMonthlyPrayerTimes } from '../../services/prayerService';
import { MONTHS_UZ, WEEKDAYS_UZ } from '../../utils/constants';
import type { PrayerDay } from '../../types/prayer';
import { Loading } from '../../components/common/Loading';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { useTashkentClock } from '../../components/prayerTimes/clock';
import { CurrentPrayerPanel } from '../../components/prayerTimes/CurrentPrayerPanel';
import { WeekTable } from '../../components/prayerTimes/WeekTable';
import { MonthCalendar } from '../../components/prayerTimes/MonthCalendar';
import { InfoCards } from '../../components/prayerTimes/InfoCards';
import { RegionPicker } from '../../components/prayerTimes/RegionPicker';

/** Joriy va keyingi oy kunlari (keyingi oy hali e'lon qilinmagan bo'lsa — faqat joriy) */
async function fetchTwoMonths(region: string, y: number, m: number): Promise<PrayerDay[]> {
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  const [cur, nxt] = await Promise.allSettled([
    getMonthlyPrayerTimes(region, m, y),
    getMonthlyPrayerTimes(region, next.m, next.y),
  ]);
  if (cur.status === 'rejected') throw cur.reason;
  return [...cur.value.days, ...(nxt.status === 'fulfilled' ? nxt.value.days : [])];
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function PrayerTimesPage() {
  const region = useLayoutRegion();
  const setRegion = useSetLayoutRegion();
  const now = useTashkentClock();
  const [y, m, d] = now.iso.split('-').map(Number);

  // Sana o'zgarganda (yarim tun) bugungi vaqtlar qayta yuklanadi
  const daily = useApi(() => getDailyPrayerTimes(region), [region, now.iso]);
  const months = useApi(() => fetchTwoMonths(region, y, m), [region, y, m]);
  const tomorrowBomdod = months.data?.find((day) => day.date === addDays(now.iso, 1))?.timings.bomdod;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
      {/* ===== Hero ===== */}
      {/* overflow-hidden faqat fon qatlamida — viloyat paneli hero'dan tashqariga chiqa olsin */}
      <section className="relative z-10 rounded-3xl bg-primary-900 text-white motion-safe:animate-fade-in-up">
        <div aria-hidden className="absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-cover bg-[position:70%_center]" style={{ backgroundImage: 'url(/images/mosque.webp)' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/85 to-primary-900/10" />
        </div>
        <div className="relative p-6 md:p-10">
          <Breadcrumb items={[{ label: 'Bosh sahifa', to: '/' }, { label: 'Namoz vaqtlari' }]} />
          <h1 className="mt-5 font-display text-4xl font-extrabold md:text-5xl">
            Namoz <span className="text-accent-400">vaqtlari</span>
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-white/85">
            O'z hududingiz uchun namoz vaqtlarini bilib oling. Vaqtlar islom.uz ma'lumotlari asosida
            O'zbekistonning 13 ta hududi bo'yicha ko'rsatiladi.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {/* Hudud — header'dagi tanlov bilan sinxron */}
            <RegionPicker value={region} onChange={setRegion} />

            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-2.5 ring-1 ring-white/20 backdrop-blur-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 text-accent-400" aria-hidden>
                <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                <path strokeLinecap="round" d="M3.5 10h17M8 3v4M16 3v4" />
              </svg>
              <div>
                <p className="font-semibold">{d}-{MONTHS_UZ[m - 1]} {y}</p>
                <p className="text-xs text-white/70">{WEEKDAYS_UZ[now.weekday]}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Hozirgi vaqt ===== */}
      {daily.loading && !daily.data && <Loading label="Namoz vaqtlari yuklanmoqda..." />}
      {daily.error && (
        <div className="rounded-3xl bg-rose-50 p-6 text-center ring-1 ring-rose-200 dark:bg-rose-500/10 dark:ring-rose-500/30">
          <p className="text-sm text-rose-700 dark:text-rose-200">{daily.error}</p>
          <button type="button" onClick={daily.retry} className="mt-3 rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700">
            Qayta urinish
          </button>
        </div>
      )}
      {daily.data && !daily.error && (
        <div className="motion-safe:animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <CurrentPrayerPanel timings={daily.data.timings} now={now} tomorrowBomdod={tomorrowBomdod} />
        </div>
      )}

      {/* ===== Jadval, taqvim va ma'lumotlar ===== */}
      <div
        className="grid gap-6 motion-safe:animate-fade-in-up lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,0.85fr)]"
        style={{ animationDelay: '200ms' }}
      >
        {months.error ? (
          <div className="rounded-3xl bg-white p-6 text-sm text-neutral-600 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:text-neutral-300">
            {months.error}
          </div>
        ) : months.data ? (
          <div className="min-w-0">
            <WeekTable days={months.data} todayIso={now.iso} />
          </div>
        ) : (
          <Loading label="Jadval yuklanmoqda..." />
        )}
        <div className="min-w-0">
          <MonthCalendar region={region} todayIso={now.iso} />
        </div>
        <div className="min-w-0 lg:col-span-2 xl:col-span-1">
          <InfoCards region={region} now={now} />
        </div>
      </div>

      <p className="text-center text-xs text-neutral-500">
        Manba: islom.uz · Vaqtlar hudud markazi uchun Toshkent vaqti (UTC+5) bo'yicha berilgan.
      </p>
    </div>
  );
}
