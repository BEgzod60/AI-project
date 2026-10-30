import { Link } from 'react-router-dom';
import { useLayoutRegion } from '../../hooks/useTypedOutlet';
import { PrayerWidget } from '../../components/prayer/PrayerWidget';
import { FeatureCard } from '../../components/prayer/FeatureCard';
import {
  ArrowRightIcon,
  BookIcon,
  ClockIcon,
  CoinsIcon,
  CrescentIcon,
  CompassIcon,
  GraduateIcon,
  MosqueIcon,
  SurahIcon,
  TasbehIcon,
} from '../../components/common/Icons';
import { useT } from '../../i18n';
import { Collapsible } from '../../components/common/Collapsible';
import { PageGuide, type GuideStep } from '../../components/common/PageGuide';

// [o'zbekcha, ruscha] — ruschasi keng tarqalgan standart tarjimalar
const HADITHS: { text: [string, string]; source: [string, string] }[] = [
  {
    text: ['"Amallar niyatlarga bog‘liqdir. Har bir kishi o‘z niyatiga ko‘ra mukofotlanur."', '«Поистине, дела (оцениваются) лишь по намерениям, и, поистине, каждому человеку достанется лишь то, что он намеревался обрести».'],
    source: ['— Buxoriy, Muslim', '— аль-Бухари, Муслим'],
  },
  {
    text: ['"Sizlardan birortangiz o‘zi uchun xohlagan narsani boshqalar uchun ham xohlamaguncha mo‘min bo‘lolmaydi."', '«Не уверует никто из вас, пока не станет желать брату своему того же, чего желает самому себе».'],
    source: ['— Buxoriy', '— аль-Бухари'],
  },
  {
    text: ['"Eng yaxshingiz — Qur’on o‘rganib, uni o‘rgatganingizdir."', '«Лучший из вас тот, кто изучал Коран и обучал ему других».'],
    source: ['— Buxoriy', '— аль-Бухари'],
  },
];

const FEATURES: { to: string; icon: JSX.Element; title: [string, string]; subtitle: [string, string] }[] = [
  { to: '/namoz', icon: <MosqueIcon />, title: ['Namoz', 'Намаз'], subtitle: ['Namozning hukmlari va qoidalari', 'Положения и правила намаза'] },
  { to: '/namoz-vaqtlari', icon: <ClockIcon />, title: ['Namoz vaqtlari', 'Время намаза'], subtitle: ['Viloyatlar bo‘yicha aniq vaqtlar', 'Точное время по регионам'] },
  { to: '/iymon', icon: <BookIcon />, title: ['Iymon', 'Иман'], subtitle: ['Iymon asoslari va aqidaviy masalalar', 'Основы веры и вероучения'] },
  { to: '/roza', icon: <CrescentIcon />, title: ['Ro‘za', 'Пост'], subtitle: ['Ro‘za ibodati va uning darajalari', 'Пост как поклонение и его степени'] },
  { to: '/zakot', icon: <CoinsIcon />, title: ['Zakot', 'Закят'], subtitle: ['Zakot hukmlari, nisob va kimlarga beriladi', 'Положения закята, нисаб и получатели'] },
  { to: '/tasbeh', icon: <TasbehIcon />, title: ['Tasbeh', 'Тасбих'], subtitle: ['Zikrlar, 33/99 hisoblagich va kunlik maqsad', 'Зикры, счётчик 33/99 и дневная цель'] },
  { to: '/namoz-organish', icon: <GraduateIcon />, title: ['Namoz o‘rganish', 'Обучение намазу'], subtitle: ['Rasmlar va audio bilan bosqichma-bosqich', 'Пошагово, с картинками и аудио'] },
  { to: '/qibla', icon: <CompassIcon />, title: ['Qibla', 'Кибла'], subtitle: ['Qibla yo‘nalishini topish (kompas)', 'Направление киблы (компас)'] },
  { to: '/suralar', icon: <SurahIcon />, title: ['Suralar va oyatlar', 'Суры и аяты'], subtitle: ['Arabcha, o‘zbekcha va ma’nosi', 'Арабский текст и смысловой перевод'] },
];

const REASONS: { title: [string, string]; text: [string, string] }[] = [
  {
    title: ['Ishonchli manbalar', 'Надёжные источники'],
    text: ['Ma’lumotlar Ahli sunna val-jamoa e’tiqodi va O‘zbekistonda asrlar davomida amal qilib kelingan Hanafiy mazhabi asosida tayyorlanadi. Oyat va hadislar manbasi bilan keltiriladi.',
      'Материалы основаны на вероучении ахль ас-сунна валь-джамаа и ханафитском мазхабе, которому в Узбекистане следуют веками. Аяты и хадисы приводятся с указанием источника.'],
  },
  {
    title: ['Bosqichma-bosqich o‘rganish', 'Пошаговое обучение'],
    text: ['Namozni endi o‘rganayotganlar uchun tahoratdan boshlab har bir amal ketma-ket, sodda tilda tushuntiriladi. Murakkab masalalar ham tushunarli bo‘lishi uchun bo‘laklarga ajratib beriladi.',
      'Для начинающих каждое действие — начиная с омовения — объясняется по порядку и простым языком. Сложные вопросы разбиты на понятные части.'],
  },
  {
    title: ['Kundalik ibodat uchun qulay', 'Удобно для ежедневного поклонения'],
    text: ['Namoz vaqtlari O‘zbekistonning 13 hududi bo‘yicha islom.uz ma’lumotlari asosida ko‘rsatiladi: kunlik, oylik va yillik jadval. Qibla yo‘nalishini ham shu yerda aniqlash mumkin.',
      'Время намаза по 13 регионам Узбекистана — по данным islom.uz: на день, месяц и год. Здесь же можно определить направление киблы.'],
  },
  {
    title: ['Qur’on bilan yaqinlik', 'Ближе к Корану'],
    text: ['Namozda o‘qiladigan suralar arabcha matni, o‘zbekcha o‘qilishi va ma’nosi bilan beriladi — nima o‘qiyotganingizni tushunib o‘qishingiz uchun.',
      'Суры, читаемые в намазе, даны с арабским текстом, транскрипцией и смысловым переводом — чтобы вы понимали, что читаете.'],
  },
  {
    title: ['Hamma uchun ochiq', 'Открыто для всех'],
    text: ['Platformadan foydalanish bepul. Telefon va kompyuterda birdek qulay ishlaydi, shuning uchun bilim olish uchun qulay vaqt va joyni kutish shart emas.',
      'Платформа бесплатна и одинаково удобна на телефоне и компьютере — учиться можно в любое время и в любом месте.'],
  },
];


/** Sahifa tagidagi «Bu sahifada nima qilasiz?» qadamlari */
const GUIDE: GuideStep[] = [
  {
    title: ['Hududingizni tanlang', 'Выберите регион'],
    text: ['Yuqoridagi hudud tugmasi orqali viloyatingizni tanlang — namoz vaqtlari shunga qarab ko‘rsatiladi.', 'Выберите свою область кнопкой региона вверху — время намаза покажется для неё.'],
  },
  {
    title: ['Keyingi namozni kuzating', 'Следите за ближайшим намазом'],
    text: ['Bugungi vaqtlar va keyingi namozgacha qolgan vaqt bosh sahifada ko‘rinib turadi.', 'Время на сегодня и сколько осталось до следующего намаза видны на главной.'],
  },
  {
    title: ['Bo‘limni tanlang', 'Выберите раздел'],
    text: ['Namoz, Iymon, Ro‘za, Zakot, Namoz o‘rganish, Qibla yoki Suralar — kartochkani yoki menyuni bosing.', 'Намаз, Иман, Пост, Закят, Обучение намазу, Кибла или Суры — нажмите на карточку или пункт меню.'],
  },
  {
    title: ['Qidiruvdan foydalaning', 'Пользуйтесь поиском'],
    text: ['Ctrl+K yoki qidiruv belgisini bosib, mavzu, sura yoki sahifani nomi bo‘yicha toping.', 'Нажмите Ctrl+K или значок поиска, чтобы найти тему, суру или страницу по названию.'],
  },
];

export function HomePage() {
  const region = useLayoutRegion();

  const t = useT();
  return (
    <div className="page">
      {/* ===== Hero ===== */}
      <section className="hero motion-safe:animate-fade-in-up">
        {/* Orqa fon: masjid rasmi */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-[position:70%_center]"
          style={{ backgroundImage: 'url(/images/mosque.webp)' }}
        />
        {/* Matn o'qilishi uchun chapdan qorong'i gradient */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary-900/90 via-primary-900/50 to-transparent" />
        <div className="relative grid gap-4 p-4 sm:p-6 md:gap-8 md:p-10 lg:min-h-[420px] lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="max-w-xl">
            <p className="hidden text-xs font-semibold uppercase tracking-[0.3em] text-accent-400 sm:block">Iymon</p>
            <h1 className="font-display text-[1.75rem] font-extrabold leading-tight sm:mt-3 sm:text-4xl md:text-5xl">
              {t('Islomiy ta’lim', 'Исламская образовательная')}{' '}
              <span className="text-accent-400">{t('platformasi', 'платформа')}</span>
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/85 sm:mt-4 sm:text-base">
              {t('Namozni o‘rganing, iymoningizni mustahkamlang. Islam haqida ishonchli ma’lumotlarni bir joyda oson va qulay tarzda oling.',
                'Изучайте намаз и укрепляйте веру. Надёжные знания об исламе — в одном месте, просто и удобно.')}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
              <Link
                to="/namoz-vaqtlari"
                className="tap-press inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent-400 px-3 py-2.5 text-[13px] font-bold text-white transition hover:bg-accent-500 sm:px-5 sm:py-3 sm:text-sm"
              >
                <ClockIcon className="hidden h-4 w-4 shrink-0 min-[400px]:block" /> {t('Namoz vaqtlari', 'Время намаза')} <ArrowRightIcon className="hidden h-4 w-4 sm:block" />
              </Link>
              <Link
                to="/namoz-organish"
                className="tap-press inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-[13px] font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20 sm:px-5 sm:py-3 sm:text-sm"
              >
                <GraduateIcon className="hidden h-4 w-4 shrink-0 min-[400px]:block" /> {t('Namozni o‘rganish', 'Изучить намаз')} <ArrowRightIcon className="hidden h-4 w-4 sm:block" />
              </Link>
            </div>
          </div>
          {/* Namoz vaqtlari vidjeti: katta ekranda o'ngda, mobilda matn ostida */}
          <div className="lg:w-[380px]">
            <PrayerWidget region={region} />
          </div>
        </div>
      </section>

      {/* ===== Bo'limlar ===== */}
      <section className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3 md:mt-8 md:gap-4">
        {FEATURES.map((f, i) => (
          // Animatsiya alohida o'ramda: kartaning hover'dagi siljishi bilan to'qnashmasligi uchun
          // Telefonda 7-karta ikki ustunni egallaydi — bo'sh joy qolmaydi
          <div key={f.to} className={`motion-safe:animate-fade-in-up ${i === FEATURES.length - 1 ? 'max-sm:col-span-2' : ''}`} style={{ animationDelay: `${150 + i * 60}ms` }}>
            <FeatureCard to={f.to} icon={f.icon} title={t(...f.title)} subtitle={t(...f.subtitle)} />
          </div>
        ))}
      </section>

      {/* ===== Nega Iymon ===== */}
      <section className="mt-3 grid gap-3 motion-safe:animate-fade-in-up sm:mt-4 sm:gap-4 md:mt-10 md:gap-6 lg:grid-cols-[1fr_380px]" style={{ animationDelay: '500ms' }}>
        <div className="light-surface overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6 md:rounded-3xl md:p-8 dark:bg-neutral-900">
          <h2 className="font-display text-xl font-extrabold text-neutral-900 md:text-2xl dark:text-white">
            {t('Nega', 'Почему')} <span className="text-primary-600">Iymon?</span>
          </h2>
          <div className="mt-3 max-w-3xl space-y-3 text-sm leading-relaxed text-neutral-600 md:mt-4 dark:text-neutral-300">
            <p>
              {t('Bugun internetda diniy ma’lumot juda ko‘p, lekin ularning hammasi ham ishonchli emas, ba’zilari esa bir-biriga zid. Natijada namozni o‘rganmoqchi yoki iymonini mustahkamlamoqchi bo‘lgan inson qaysi manbaga tayanishni bilmay qoladi.',
                'Сегодня в интернете много религиозной информации, но не вся она достоверна, а иногда и противоречива. Человек, который хочет изучить намаз или укрепить веру, не знает, на какой источник опереться.')}
            </p>
            <p>
              <strong className="text-neutral-800 dark:text-neutral-100">Iymon</strong>{' '}
              {t('shu ehtiyojga javob sifatida yaratilgan. Platforma namoz, aqida va Qur’on bo‘yicha har bir musulmon bilishi zarur bo‘lgan asosiy bilimlarni bir joyda, tushunarli o‘zbek tilida va',
                'создан как ответ на эту потребность. Платформа собирает в одном месте основные знания о намазе, вероучении и Коране, необходимые каждому мусульманину, — понятным языком и на основе')}{' '}
              <strong className="text-neutral-800 dark:text-neutral-100">{t('Hanafiy', 'ханафитского')}</strong>{' '}
              {t('mazhabi asosida taqdim etadi.', 'мазхаба.')}
            </p>
          </div>

          {/* Telefon/planshetda — yig'iladigan ro'yxat (accordion), desktopda — ochiq 2 ustun */}
          <div className="mt-3 grid gap-x-8 sm:grid-cols-2 md:mt-8 lg:gap-y-6">
            {REASONS.map((r, i) => (
              <Collapsible
                key={r.title[0]}
                className="border-t border-neutral-200 py-1 lg:py-0 lg:pt-4 dark:border-neutral-800"
                title={
                  <span className="flex items-baseline gap-3 font-display text-[15px] font-bold text-neutral-900 lg:text-base dark:text-white">
                    <span className="text-xs font-semibold tabular-nums text-primary-600">{String(i + 1).padStart(2, '0')}</span>
                    {t(...r.title)}
                  </span>
                }
              >
                <p className="pb-3 text-sm leading-relaxed text-neutral-600 lg:mt-2 lg:pb-0 dark:text-neutral-300">{t(...r.text)}</p>
              </Collapsible>
            ))}
          </div>
        </div>

        {/* ===== Kun hadisi ===== */}
        <HadisiCarousel />
      </section>

      <PageGuide steps={GUIDE} className="mt-3 sm:mt-4 md:mt-10" />
    </div>
  );
}

function HadisiCarousel() {
  const t = useT();
  return (
    <div className="light-surface overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6 md:rounded-3xl dark:bg-neutral-900">
      <h2 className="font-display text-lg font-extrabold text-neutral-900 sm:text-xl dark:text-white">
        {t('Kun', 'Хадис')} <span className="text-accent-500">{t('hadisi', 'дня')}</span>
      </h2>
      {/* Telefonda — yonga suriladigan kartalar */}
      <div className="snap-row mt-3 lg:mt-4 lg:space-y-4">
        {HADITHS.map((h) => (
          <blockquote key={h.text[0]} className="w-[82%] rounded-2xl bg-primary-50 p-4 sm:w-[60%] md:w-[45%] lg:w-auto dark:bg-primary-900/30">
            <p className="text-sm italic text-neutral-700 dark:text-neutral-200">{t(...h.text)}</p>
            <cite className="mt-2 block text-xs font-semibold not-italic text-neutral-500">{t(...h.source)}</cite>
          </blockquote>
        ))}
      </div>
    </div>
  );
}
