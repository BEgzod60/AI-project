import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useLayoutRegion, useSetLayoutRegion } from '../../hooks/useTypedOutlet';
import { getDailyPrayerTimes, getMonthWithNext } from '../../services/prayerService';
import { weekdays } from '../../utils/constants';
import { formatDate } from '../../utils/formatTime';
import { useI18n } from '../../i18n';
import { Loading } from '../../components/common/Loading';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { addDays, useTashkentClock } from '../../components/prayerTimes/clock';
import { CurrentPrayerPanel } from '../../components/prayerTimes/CurrentPrayerPanel';
import { WeekTable } from '../../components/prayerTimes/WeekTable';
import { MonthCalendar } from '../../components/prayerTimes/MonthCalendar';
import { InfoCards } from '../../components/prayerTimes/InfoCards';
import { RegionPicker } from '../../components/prayerTimes/RegionPicker';
import { PageGuide, type GuideStep } from '../../components/common/PageGuide';

/** Sahifa tagidagi «Bu sahifada nima qilasiz?» qadamlari */
const GUIDE: GuideStep[] = [
  {
    title: ['Hududingizni tanlang', 'Выберите регион'],
    text: ['«Hudud» tugmasi orqali viloyatingizni tanlang — vaqtlar uning markazi uchun beriladi.', 'Выберите свою область кнопкой «Регион» — время указано для её центра.'],
  },
  {
    title: ['Hozirgi va keyingi namozni ko‘ring', 'Смотрите текущий и следующий намаз'],
    text: ['Qaysi namoz vaqti kirgani va keyingisigacha qancha qolgani ko‘rsatiladi.', 'Показано, время какого намаза наступило и сколько осталось до следующего.'],
  },
  {
    title: ['Haftalik yoki oylik ko‘rinishni tanlang', 'Выберите неделю или месяц'],
    text: ['Haftalik jadval yoki oylik taqvim orqali boshqa kunlarning vaqtlarini oldindan biling.', 'Узнавайте время на другие дни заранее по недельной таблице или месячному календарю.'],
  },
  {
    title: ['Qo‘shimcha ma’lumotni ko‘ring', 'Смотрите дополнительные сведения'],
    text: ['Hijriy sana, quyosh chiqishi va qibla yo‘nalishi alohida kartochkalarda berilgan.', 'Хиджрийская дата, восход солнца и направление киблы — в отдельных карточках.'],
  },
];

export function PrayerTimesPage() {
  const region = useLayoutRegion();
  const setRegion = useSetLayoutRegion();
  const now = useTashkentClock();
  const { t, lang } = useI18n();
  const [y, m, d] = now.iso.split('-').map(Number);

  // Sana o'zgarganda (yarim tun) bugungi vaqtlar qayta yuklanadi
  const daily = useApi(() => getDailyPrayerTimes(region), [region, now.iso]);
  const months = useApi(() => getMonthWithNext(region, y, m), [region, y, m]);
  const tomorrowBomdod = months.data?.find((day) => day.date === addDays(now.iso, 1))?.timings.bomdod;
  /** Telefon/planshetda haftalik jadval va oylik taqvim bitta joyda — tabs orqali */
  const [view, setView] = useState<'hafta' | 'oy'>('hafta');

  return (
    <div className="page page-stack">
      {/* ===== Hero ===== */}
      {/* overflow-hidden faqat fon qatlamida — viloyat paneli hero'dan tashqariga chiqa olsin */}
      <section className="relative z-10 rounded-2xl bg-primary-900 text-white motion-safe:animate-fade-in-up md:rounded-3xl">
        <div aria-hidden className="absolute inset-0 overflow-hidden rounded-2xl md:rounded-3xl">
          <div className="absolute inset-0 bg-cover bg-[position:70%_center]" style={{ backgroundImage: 'url(/images/mosque.webp)' }} />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/85 to-primary-900/10" />
        </div>
        <div className="relative p-4 sm:p-6 md:p-10">
          <Breadcrumb items={[{ label: t('Bosh sahifa', 'Главная'), to: '/' }, { label: t('Namoz vaqtlari', 'Время намаза') }]} />
          <h1 className="hero-title mt-3 md:mt-5">
            {t('Namoz', 'Время')} <span className="text-accent-400">{t('vaqtlari', 'намаза')}</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base sm:leading-relaxed md:mt-3">
            {t('O‘z hududingiz uchun namoz vaqtlarini bilib oling. Vaqtlar islom.uz ma’lumotlari asosida O‘zbekistonning 13 ta hududi bo‘yicha ko‘rsatiladi.',
              'Узнайте время намаза для своего региона. Время указано по данным islom.uz для 13 регионов Узбекистана.')}
          </p>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:flex sm:flex-wrap sm:gap-3 md:mt-6">
            {/* Hudud — header'dagi tanlov bilan sinxron */}
            <RegionPicker value={region} onChange={setRegion} />

            <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/20 backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-2.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="hidden h-5 w-5 text-accent-400 min-[400px]:block" aria-hidden>
                <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                <path strokeLinecap="round" d="M3.5 10h17M8 3v4M16 3v4" />
              </svg>
              <div>
                <p className="whitespace-nowrap text-sm font-semibold sm:text-base">{formatDate(new Date(y, m - 1, d), lang)}</p>
                <p className="text-xs text-white/70">{weekdays(lang)[now.weekday]}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Hozirgi vaqt ===== */}
      {daily.loading && !daily.data && <Loading label={t('Namoz vaqtlari yuklanmoqda...', 'Загрузка времени намаза...')} />}
      {daily.error && (
        <div className="rounded-3xl bg-rose-50 p-6 text-center ring-1 ring-rose-200 dark:bg-rose-500/10 dark:ring-rose-500/30">
          <p className="text-sm text-rose-700 dark:text-rose-200">{daily.error}</p>
          <button type="button" onClick={daily.retry} className="mt-3 rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700">
            {t('Qayta urinish', 'Повторить')}
          </button>
        </div>
      )}
      {daily.data && !daily.error && (
        <div className="motion-safe:animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <CurrentPrayerPanel timings={daily.data.timings} now={now} tomorrowBomdod={tomorrowBomdod} />
        </div>
      )}

      {/* ===== Jadval, taqvim va ma'lumotlar ===== */}
      {/* Telefon/planshet: haftalik jadval ↔ oylik taqvim */}
      <div role="tablist" aria-label={t('Jadval turi', 'Вид расписания')} className="seg lg:hidden">
        {(['hafta', 'oy'] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className="seg-btn">
            {v === 'hafta' ? t('Haftalik jadval', 'Неделя') : t('Oylik taqvim', 'Месяц')}
          </button>
        ))}
      </div>
      <div
        className="grid gap-3 motion-safe:animate-fade-in-up sm:gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,0.85fr)]"
        style={{ animationDelay: '200ms' }}
      >
        <div className={`min-w-0 flex-col ${view === 'hafta' ? 'flex' : 'hidden lg:flex'}`}>
        {months.error ? (
          <div className="rounded-3xl bg-white p-6 text-sm text-neutral-600 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:text-neutral-300">
            {months.error}
          </div>
        ) : months.data ? (
          <div className="min-w-0">
            <WeekTable days={months.data} todayIso={now.iso} />
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-center">
            <Loading label={t('Jadval yuklanmoqda...', 'Загрузка расписания...')} />
          </div>
        )}
        </div>
        <div className={`min-w-0 ${view === 'oy' ? '' : 'hidden lg:block'}`}>
          <MonthCalendar region={region} todayIso={now.iso} />
        </div>
        <div className="min-w-0 lg:col-span-2 xl:col-span-1">
          <InfoCards region={region} now={now} />
        </div>
      </div>

      <p className="text-center text-xs text-neutral-500">
        {t('Manba: islom.uz · Vaqtlar hudud markazi uchun Toshkent vaqti (UTC+5) bo‘yicha berilgan.', 'Источник: islom.uz · Время указано для центра региона по ташкентскому времени (UTC+5).')}
      </p>

      <PageGuide steps={GUIDE} />
    </div>
  );
}
