import type { ReactNode } from 'react';
import { useApi } from '../../hooks/useApi';
import { getPrayerCategories } from '../../services/learningService';
import { SkeletonCard } from '../../components/common/Loading';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { TopicIconSvg } from '../../components/namoz/NamozIcons';
import { LessonCard } from '../../components/learning/LessonCard';
import { ContentLanguageNote } from '../../components/common/ContentLanguageNote';
import { useT } from '../../i18n';
import { PageGuide, type GuideStep } from '../../components/common/PageGuide';

const FEATURES: { icon: ReactNode; label: [string, string] }[] = [
  { icon: <TopicIconSvg icon="mosque" className="h-5 w-5" />, label: ['Hanafiy mazhabi', 'Ханафитский мазхаб'] },
  { icon: <TopicIconSvg icon="book" className="h-5 w-5" />, label: ['Manbasi ko‘rsatilgan', 'С источниками'] },
  { icon: <TopicIconSvg icon="scroll" className="h-5 w-5" />, label: ['Lotin yozuvida', 'Латиницей'] },
  { icon: <TopicIconSvg icon="shield" className="h-5 w-5" />, label: ['Tekshiruv holati ochiq', 'Статус проверки открыт'] },
];

/** Sahifa tagidagi «Bu sahifada nima qilasiz?» qadamlari */
const GUIDE: GuideStep[] = [
  {
    title: ['Namozni tanlang', 'Выберите намаз'],
    text: ['Darslar ro‘yxatidan o‘rganmoqchi bo‘lgan namozingiz kartochkasini bosing.', 'Нажмите на карточку намаза, который хотите изучить.'],
  },
  {
    title: ['Qadamma-qadam o‘rganing', 'Изучайте пошагово'],
    text: ['Har bir qadam rasm, o‘qiladigan sura va duolar bilan; o‘zlashtirganingizni «O‘rganildi» deb belgilang.', 'Каждый шаг — с иллюстрацией, сурами и дуа; отмечайте усвоенное кнопкой «Изучено».'],
  },
  {
    title: ['Erkak yoki ayol uchun ko‘rinishni tanlang', 'Выберите вариант для мужчин или женщин'],
    text: ['Farqi bor qadamlarda tegishli rasm va ko‘rsatma chiqadi.', 'В шагах, где есть различия, покажутся соответствующие иллюстрации и указания.'],
  },
  {
    title: ['Birga mashq qiling', 'Практикуйтесь вместе'],
    text: ['«Birga takrorlash» yoki «Birga o‘qish» rejimida namozni ovoz bilan mashq qiling.', 'Тренируйтесь вслух в режиме «Повторять вместе» или «Читать вместе».'],
  },
];

export function LearningPage() {
  const { data, loading, error, retry } = useApi(getPrayerCategories, []);

  const t = useT();
  return (
    <div className="page">
      {/* ===== Hero ===== */}
      <section className="hero motion-safe:animate-fade-in-up">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-[position:70%_center]"
          style={{ backgroundImage: 'url(/images/namoz/hero-organish.webp)' }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/85 to-primary-900/20" />
        <div className="relative p-4 sm:p-6 md:p-10">
          <Breadcrumb items={[{ label: t('Bosh sahifa', 'Главная'), to: '/' }, { label: t('Namoz o‘rganish', 'Обучение намазу') }]} />
          <h1 className="hero-title mt-3 md:mt-5">
            {t('Namozni', 'Обучение')} <span className="text-accent-400">{t('o‘rganish', 'намазу')}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base sm:leading-relaxed md:mt-3">
            {t('O‘rganmoqchi bo‘lgan namozni tanlang. Har bir kartada rakatlar soni manbasi bilan ko‘rsatilgan; batafsil bosqichma-bosqich darslar tayyorlanmoqda.',
              'Выберите намаз для изучения. На каждой карточке указано число ракаатов с источником; подробные пошаговые уроки — внутри.')}
          </p>
          {/* Telefonda 2×2 ixcham panjara */}
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-3 md:mt-6">
            {FEATURES.map((f) => (
              <li key={f.label[0]} className="flex min-w-0 items-center gap-2 text-[13px] leading-tight text-white/90 sm:text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-accent-400 ring-1 ring-white/15">
                  {f.icon}
                </span>
                {t(...f.label)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Darslar ro'yxati ===== */}
      <section aria-labelledby="darslar" className="mt-4 md:mt-8">
        <h2 id="darslar" className="font-display text-xl font-bold text-neutral-900 md:text-2xl dark:text-white">
          {t('Darslar ro‘yxati', 'Список уроков')}
        </h2>
        <ContentLanguageNote className="mt-3 md:mt-4" />

        {error && (
          <div className="mt-4 rounded-3xl bg-rose-50 p-6 text-center ring-1 ring-rose-200 dark:bg-rose-500/10 dark:ring-rose-500/30">
            <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
            <button type="button" onClick={retry} className="mt-3 rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700">
              {t('Qayta urinish', 'Повторить')}
            </button>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 md:mt-4 md:grid-cols-3 lg:gap-5">
          {loading && Array.from({ length: 10 }, (_, i) => <SkeletonCard key={i} className="h-[170px] rounded-2xl lg:h-[250px] lg:rounded-3xl" />)}
          {data?.map((c, i) => (
            <div key={c.slug} className="motion-safe:animate-fade-in-up" style={{ animationDelay: `${100 + i * 50}ms` }}>
              <LessonCard category={c} />
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-neutral-500 md:mt-6">
          {t('Rakatlar soni O‘zbekiston musulmonlari idorasi sayti (muslim.uz) dagi ma’lumotlarga asoslangan. «Tekshirilmoqda» belgisi bor kartalar ma’lumoti hali tasdiqlanmagan.',
            'Число ракаатов указано по данным сайта Управления мусульман Узбекистана (muslim.uz). Данные карточек с пометкой «На проверке» ещё не подтверждены.')}
        </p>
      </section>

      <PageGuide steps={GUIDE} className="mt-3 sm:mt-4 md:mt-8" />
    </div>
  );
}
