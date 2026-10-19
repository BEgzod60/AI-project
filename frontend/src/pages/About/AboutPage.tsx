import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { TopicIconSvg } from '../../components/namoz/NamozIcons';
import { ContactSection } from '../../components/about/ContactSection';
import { ArrowRightIcon, BookIcon, ClockIcon, CoinsIcon, CompassIcon, CrescentIcon, GraduateIcon, MosqueIcon, SurahIcon } from '../../components/common/Icons';
import { useT } from '../../i18n';

type Pair = [string, string];

const PRINCIPLES: { icon: ReactNode; title: Pair; text: Pair }[] = [
  {
    icon: <TopicIconSvg icon="book" className="h-6 w-6" />,
    title: ['Manbasi ko‘rsatilgan', 'С указанием источника'],
    text: ['Diniy matnlarning har biri O‘zbekiston musulmonlari idorasining rasmiy saytidan olingan va manba havolasi bilan ko‘rsatiladi.', 'Каждый религиозный текст взят с официального сайта Управления мусульман Узбекистана и показан со ссылкой на источник.'],
  },
  {
    icon: <TopicIconSvg icon="mosque" className="h-6 w-6" />,
    title: ['Hanafiy mazhabi', 'Ханафитский мазхаб'],
    text: ['Namoz tartibi, amallar va hukmlar O‘zbekistonda amal qilinadigan Hanafiy mazhabi bo‘yicha beriladi.', 'Порядок намаза, действия и решения даются по ханафитскому мазхабу, которому следуют в Узбекистане.'],
  },
  {
    icon: <TopicIconSvg icon="scroll" className="h-6 w-6" />,
    title: ['Matn o‘zgartirilmaydi', 'Текст не изменяется'],
    text: ['Manbadagi matn aynan ko‘chiriladi. Sun’iy intellekt diniy matn yoki namoz amalini o‘zi yaratmaydi — faqat ovozni tanishda yordam beradi.', 'Текст источника приводится дословно. Искусственный интеллект не создаёт религиозных текстов и действий намаза — он лишь помогает распознавать голос.'],
  },
  {
    icon: <TopicIconSvg icon="shield" className="h-6 w-6" />,
    title: ['Tekshiruv holati ochiq', 'Статус проверки открыт'],
    text: ['Tasdiqlanmagan ma’lumot saytda chop etilmaydi — uning o‘rnida «Tekshirilmoqda» degan belgi turadi.', 'Непроверенные сведения не публикуются — на их месте стоит отметка «На проверке».'],
  },
];

const SECTIONS: { to: string; icon: ReactNode; title: Pair; text: Pair }[] = [
  { to: '/namoz', icon: <MosqueIcon />, title: ['Namoz', 'Намаз'], text: ['Poklanish, tahorat, namozning farz, vojib va sunnatlari, qazo va turli namozlar.', 'Очищение, омовение, фарзы, ваджибы и сунны намаза, восполнение пропущенных и разные намазы.'] },
  { to: '/namoz/namozdagi-xatolar', icon: <TopicIconSvg icon="shield" className="h-5 w-5" />, title: ['Namozdagi xatolar', 'Ошибки в намазе'], text: ['Namozni buzadigan, harom va makruh amallar hamda sajdai sahv.', 'Действия, нарушающие намаз, запретные и нежелательные действия, а также саджда сахв.'] },
  { to: '/namoz-organish', icon: <GraduateIcon />, title: ['Namoz o‘rganish', 'Обучение намазу'], text: ['Har bir namoz rasmlar va audio bilan bosqichma-bosqich; «Birga takrorlash» va «Birga o‘qish» rejimlari.', 'Каждый намаз шаг за шагом с иллюстрациями и аудио; режимы «Повторять вместе» и «Читать вместе».'] },
  { to: '/namoz-vaqtlari', icon: <ClockIcon />, title: ['Namoz vaqtlari', 'Время намаза'], text: ['O‘zbekiston shahar va tumanlari bo‘yicha kunlik va oylik namoz vaqtlari.', 'Ежедневное и месячное расписание намазов по городам и районам Узбекистана.'] },
  { to: '/iymon', icon: <BookIcon />, title: ['Iymon', 'Иман'], text: ['Iymon asoslari, aqida va iymon shartlari haqidagi mavzular.', 'Темы об основах имана, акыде и условиях веры.'] },
  { to: '/roza', icon: <CrescentIcon />, title: ['Ro‘za', 'Пост'], text: ['Ro‘za qanday ibodat ekani va ro‘zaning darajalari.', 'Что такое пост как поклонение и степени поста.'] },
  { to: '/zakot', icon: <CoinsIcon />, title: ['Zakot', 'Закят'], text: ['Zakotning hukmlari: chorva, tilla-kumush, naqd pul va tijorat molining zakoti.', 'Положения закята: со скота, золота и серебра, наличных и товаров.'] },
  { to: '/suralar', icon: <SurahIcon />, title: ['Suralar', 'Суры'], text: ['114 sura: arabcha matn, o‘zbekcha ma’no, lotincha o‘qilishi va oyatma-oyat tilovat.', '114 сур: арабский текст, перевод смыслов (рус. — Кулиев), транскрипция и чтение по аятам.'] },
  { to: '/qibla', icon: <CompassIcon />, title: ['Qibla va masjidlar', 'Кибла и мечети'], text: ['Joylashuvingiz bo‘yicha qibla yo‘nalishi va yaqin atrofdagi masjidlar.', 'Направление киблы по вашему местоположению и ближайшие мечети.'] },
];

const SOURCES: { area: Pair; name: string; url: string; note?: Pair }[] = [
  { area: ['Namoz, Iymon, Namoz o‘rganish, Namozdagi xatolar', 'Намаз, Иман, Обучение намазу, Ошибки в намазе'], name: 'O‘zbekiston musulmonlari idorasi — muslim.uz', url: 'https://muslim.uz/uz/c/prayer' },
  { area: ['Zakot', 'Закят'], name: 'O‘zbekiston musulmonlari idorasi — muslim.uz («Zakot» bo‘limi)', url: 'https://muslim.uz/uz/c/zakot' },
  { area: ['Ro‘za', 'Пост'], name: 'O‘zbekiston musulmonlari idorasi — muslim.uz («Ro‘za» bo‘limi)', url: 'https://muslim.uz/uz/c/fasting' },
  { area: ['Qur’on matni (arabcha) va oyatma-oyat tilovat', 'Текст Корана (арабский) и чтение по аятам'], name: 'Tanzil Project — tanzil.net', url: 'https://tanzil.net', note: ['CC BY 3.0', 'CC BY 3.0'] },
  { area: ['Suralarning o‘zbekcha ma’nosi', 'Узбекский перевод смыслов'], name: 'Muhammad Sodiq Muhammad Yusuf — ma’nolar tarjimasi', url: 'https://tanzil.net/trans/', note: ['notijoriy foydalanish uchun', 'для некоммерческого использования'] },
  { area: ['Suralarning ruscha ma’nosi', 'Русский перевод смыслов'], name: 'Эльмир Кулиев — перевод смыслов (Tanzil)', url: 'https://tanzil.net/trans/', note: ['notijoriy foydalanish uchun', 'для некоммерческого использования'] },
  { area: ['Namoz vaqtlari', 'Время намаза'], name: 'islom.uz (namoz-vaqtlari.more-info.uz)', url: 'https://islom.uz' },
  { area: ['Masjidlar katalogi', 'Каталог мечетей'], name: 'masjid.uz', url: 'https://masjid.uz' },
  { area: ['Xarita va masjid joylashuvi', 'Карта и расположение мечетей'], name: 'OpenStreetMap', url: 'https://www.openstreetmap.org', note: ['ODbL', 'ODbL'] },
  { area: ['Masjid rasmlari', 'Фотографии мечетей'], name: 'Wikimedia Commons', url: 'https://commons.wikimedia.org' },
];

const TECH = ['Django 5', 'Django REST Framework', 'React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'Leaflet', 'Web Speech API', 'Web Audio API'];

function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return <h2 id={id} className="font-display text-xl font-bold text-neutral-900 sm:text-2xl md:text-3xl dark:text-white">{children}</h2>;
}

export function AboutPage() {
  const t = useT();
  /** Telefonda manbalar ro'yxati yig'ilgan holda (desktopda doim ochiq) */
  const [sourcesOpen, setSourcesOpen] = useState(false);
  return (
    <div className="page">
      {/* ===== Hero ===== */}
      <section className="hero motion-safe:animate-fade-in-up">
        <div aria-hidden className="absolute inset-0 bg-cover bg-[position:70%_center]" style={{ backgroundImage: 'url(/images/namoz/13.webp)' }} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/90 to-primary-900/30" />
        <div className="relative p-4 sm:p-6 md:p-10">
          <Breadcrumb items={[{ label: t('Bosh sahifa', 'Главная'), to: '/' }, { label: t('Loyiha haqida', 'О проекте') }]} />
          <div className="mt-3 flex items-center gap-3 md:mt-5 md:gap-4">
            <img src="/images/iymon-logo.webp" alt="" width={56} height={56} className="h-10 w-10 rounded-xl shadow-lg md:h-14 md:w-14 md:rounded-2xl" />
            <h1 className="hero-title">
              {t('Loyiha', 'О')} <span className="text-accent-400">{t('haqida', 'проекте')}</span>
            </h1>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base sm:leading-relaxed md:mt-4 md:text-lg">
            <strong className="font-semibold text-white">Iymon</strong> — {t('namoz o‘rganish, iymon mavzulari, namoz vaqtlari, Qur’on suralari va qibla topishni bir joyda jamlagan islomiy ta’lim platformasi.', 'исламская образовательная платформа, где в одном месте собраны обучение намазу, темы об имане, время намаза, суры Корана и определение киблы.')}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2 md:mt-6">
            {[t('Hanafiy mazhabi', 'Ханафитский мазхаб'), t('O‘zbek tilida', 'На узбекском и русском'), t('Manbasi ko‘rsatilgan', 'С указанием источника')].map((x) => (
              <li key={x} className="rounded-full bg-white/10 px-3 py-1 text-[13px] ring-1 sm:text-sm ring-white/15 backdrop-blur-sm">{x}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Maqsad ===== */}
      <section className="mt-3 grid gap-3 sm:mt-4 sm:gap-4 md:mt-8 md:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6 md:rounded-3xl md:p-8 dark:bg-neutral-900 dark:ring-white/10">
          <SectionTitle>{t('Maqsadimiz', 'Наша цель')}</SectionTitle>
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-700 md:text-base dark:text-neutral-300">
            {t('Namozni endi o‘rganayotgan yoki bilimini mustahkamlamoqchi bo‘lgan har bir kishiga ishonchli, tushunarli va o‘zbek tilidagi ma’lumotni bir joyda berish. Har bir namoz rasmlar, tilovat va lotin yozuvidagi o‘qilishi bilan bosqichma-bosqich ko‘rsatiladi.', 'Дать каждому, кто только учится намазу или хочет укрепить знания, надёжные и понятные сведения в одном месте. Каждый намаз показан шаг за шагом с иллюстрациями, чтением и транскрипцией латиницей.')}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-700 md:text-base dark:text-neutral-300">
            {t('Ma’lumotlar o‘zimizdan yozilmaydi — ular O‘zbekiston musulmonlari idorasi kabi rasmiy manbalardan olinadi va har birining manbasi ko‘rsatiladi.', 'Мы не пишем сведения от себя — они берутся из официальных источников, таких как Управление мусульман Узбекистана, и у каждого указан источник. Религиозные материалы muslim.uz доступны только на узбекском языке.')}
          </p>
        </div>
        <div className="rounded-2xl bg-primary-900 p-4 text-white shadow-sm sm:p-6 md:rounded-3xl md:p-8">
          <h2 className="font-display text-xl font-bold sm:text-2xl">{t('Namozni birga o‘rganamiz', 'Учим намаз вместе')}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/80">
            {t('«Namoz o‘rganish» bo‘limida ikki yordamchi rejim bor:', 'В разделе «Обучение намазу» есть два режима-помощника:')} <strong className="text-white">{t('Birga takrorlash', 'Повторять вместе')}</strong> — {t('namunani tinglab, ovoz chiqarib mashq qilish;', 'тренировка вслух после прослушивания образца;')} <strong className="text-white">{t('Birga o‘qish', 'Читать вместе')}</strong> — {t('namoz davomida qo‘l tegizmasdan ko‘rinadigan vizual ko‘rsatmalar. Sayt ovozingizni yozib olmaydi va saqlamaydi; so‘zlarni tanish Chrome yoki Edge brauzerining xizmati orqali ishlaydi.', 'визуальные подсказки во время намаза без касаний экрана. Сайт не записывает и не хранит ваш голос; распознавание слов работает через службу браузера Chrome или Edge.')}
          </p>
          <Link to="/namoz-organish" className="tap-press mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent-400 md:mt-5 lg:min-h-0 px-4 py-2.5 text-sm font-bold text-primary-900 transition hover:bg-accent-500">
            {t('Namoz o‘rganishni boshlash', 'Начать обучение намазу')} <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ===== Tamoyillar ===== */}
      <section className="mt-5 md:mt-10" aria-labelledby="tamoyillar">
        <SectionTitle id="tamoyillar">{t('Tamoyillarimiz', 'Наши принципы')}</SectionTitle>
        {/* Telefonda 2 ustunli ixcham kartalar */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-4 md:mt-5 lg:grid-cols-4">
          {PRINCIPLES.map((p) => (
            <div key={p.title[0]} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 sm:p-5 md:rounded-3xl dark:bg-neutral-900 dark:ring-white/10">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 sm:h-11 sm:w-11 sm:rounded-2xl text-primary-700 dark:bg-primary-900/40 dark:text-emerald-300">{p.icon}</span>
              <h3 className="mt-2 font-display text-[15px] font-bold leading-snug text-neutral-900 sm:mt-4 sm:text-lg dark:text-white">{t(...p.title)}</h3>
              <p className="mt-1 text-[13px] leading-snug text-neutral-600 sm:mt-1.5 sm:text-sm sm:leading-relaxed dark:text-neutral-400">{t(...p.text)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Bo'limlar ===== */}
      <section className="mt-5 md:mt-10" aria-labelledby="bolimlar">
        <SectionTitle id="bolimlar">{t('Platformada nimalar bor', 'Что есть на платформе')}</SectionTitle>
        {/* Telefonda — 2 ustunli ixcham havolalar (izoh sm+ da) */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 md:mt-5 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="tap-press group flex min-h-[56px] items-center gap-2.5 rounded-2xl bg-white p-3 shadow-sm sm:items-start sm:gap-4 sm:p-4 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primary-500/40 dark:bg-neutral-900 dark:ring-white/10"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white sm:h-10 sm:w-10 [&>svg]:h-5 [&>svg]:w-5">{s.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 font-display text-[14px] font-bold leading-snug text-neutral-900 sm:text-base sm:leading-normal dark:text-white">
                  {t(...s.title)}
                  <ArrowRightIcon className="hidden h-4 w-4 shrink-0 text-primary-600 transition group-hover:translate-x-0.5 sm:block" />
                </span>
                <span className="mt-0.5 hidden text-sm leading-snug sm:block text-neutral-600 dark:text-neutral-400">{t(...s.text)}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Manbalar ===== */}
      <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6 md:mt-10 md:rounded-3xl md:p-8 dark:bg-neutral-900 dark:ring-white/10" aria-labelledby="manbalar">
        <SectionTitle id="manbalar">{t('Manbalar', 'Источники')}</SectionTitle>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{t('Platformadagi ma’lumotlar quyidagi manbalardan olinadi. Har bir sahifada aniq bo‘lim havolasi ham ko‘rsatilgan.', 'Сведения на платформе берутся из следующих источников. На каждой странице также указана ссылка на конкретный раздел.')}</p>
        <button
          type="button"
          onClick={() => setSourcesOpen((o) => !o)}
          aria-expanded={sourcesOpen}
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-between rounded-xl bg-neutral-50 px-3 text-sm font-semibold text-primary-800 lg:hidden dark:bg-white/5 dark:text-emerald-200"
        >
          {sourcesOpen ? t('Manbalarni yashirish', 'Скрыть источники') : t(`Manbalarni ko‘rsatish (${SOURCES.length})`, `Показать источники (${SOURCES.length})`)}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-5 w-5 transition-transform ${sourcesOpen ? 'rotate-180' : ''}`} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <ul className={`mt-2 divide-y divide-neutral-100 lg:mt-5 lg:block dark:divide-neutral-800 ${sourcesOpen ? '' : 'hidden'}`}>
          {SOURCES.map((s) => (
            <li key={s.name} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{t(...s.area)}</span>
              <span className="text-sm text-neutral-600 sm:text-right dark:text-neutral-400">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-800 dark:text-emerald-300">
                  {s.name} ↗
                </a>
                {s.note && <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-white/10 dark:text-neutral-300">{t(...s.note)}</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-neutral-500">
          O‘zbekiston musulmonlari idorasi{' '}
          <a href="https://muslim.uz/uz" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-primary-600">rasmiy veb-portali</a>{' '}
          xabar beradi.
        </p>
      </section>

      {/* ===== Eslatma ===== */}
      <section className="mt-3 rounded-2xl bg-accent-100 p-4 ring-1 ring-accent-400/40 sm:p-6 md:mt-6 md:rounded-3xl md:p-8 dark:bg-accent-500/10" aria-labelledby="eslatma">
        <h2 id="eslatma" className="flex items-center gap-2 font-display text-lg font-bold sm:text-xl text-neutral-900 dark:text-white">
          <TopicIconSvg icon="lantern" className="h-5 w-5 text-accent-500" />
          {t('Muhim eslatma', 'Важное замечание')}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          {t('Platforma ta’lim uchun yordamchi vosita bo‘lib, fatvo bermaydi. Diniy masalalarda, ayniqsa o‘z holatingizga oid savollarda, masjid imomi yoki diniy mutaxassisga murojaat qiling. Namoz ichida ekrandan qarab qiroat qilish masalasi alohida hukmga ega — «Birga o‘qish» rejimidan foydalanishdan oldin mutaxassis bilan maslahatlashing.', 'Платформа — вспомогательное учебное средство и не выносит фетв. По религиозным вопросам, особенно касающимся вашей ситуации, обращайтесь к имаму мечети или религиозному специалисту. Чтение с экрана во время намаза имеет отдельное решение — посоветуйтесь со специалистом, прежде чем пользоваться режимом «Читать вместе».')}
        </p>
      </section>

      {/* ===== Aloqa ===== */}
      <ContactSection />

      {/* ===== Texnologiyalar ===== */}
      <section className="mt-5 md:mt-10" aria-labelledby="texnologiyalar">
        <SectionTitle id="texnologiyalar">{t('Texnologiyalar', 'Технологии')}</SectionTitle>
        <ul className="mt-3 flex flex-wrap gap-2 md:mt-4">
          {TECH.map((tech) => (
            <li key={tech} className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-white/10">{tech}</li>
          ))}
        </ul>
      </section>

      <div className="mt-5 flex justify-center md:mt-10">
        <Link
          to="/"
          className="group inline-flex items-center gap-3 rounded-2xl bg-primary-700 px-6 py-3.5 text-sm font-bold text-white shadow-sm ring-1 ring-primary-600 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-primary-800 hover:shadow-lg"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-primary-600 group-hover:text-white">
            <ArrowRightIcon className="h-4 w-4 rotate-180" />
          </span>
          {t('Bosh sahifaga qaytish', 'Вернуться на главную')}
        </Link>
      </div>
    </div>
  );
}
