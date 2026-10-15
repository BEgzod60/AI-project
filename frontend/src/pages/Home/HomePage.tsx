import { Link } from 'react-router-dom';
import { useLayoutRegion } from '../../hooks/useTypedOutlet';
import { PrayerWidget } from '../../components/prayer/PrayerWidget';
import { FeatureCard } from '../../components/prayer/FeatureCard';
import {
  ArrowRightIcon,
  BookIcon,
  ClockIcon,
  CompassIcon,
  GraduateIcon,
  InfoIcon,
  MosqueIcon,
  SurahIcon,
} from '../../components/common/Icons';

const HADITHS = [
  { text: '"Amallar niyatlarga bog\u2018liqdir. Har bir kishi o\u2018z niyatiga ko\u2018ra mukofotlanur."', source: '— Buxoriy, Muslim' },
  { text: '"Sizlardan birortangiz o\u2018zi uchun xohlagan narsani boshqalar uchun ham xohlamaguncha mo\u2018min bo\u2018lolmaydi."', source: '— Buxoriy' },
  { text: '"Eng yaxshingiz — Qur\u2019on o\u2018rganib, uni o\u2018rgatganingizdir."', source: '— Buxoriy' },
];

const FEATURES = [
  { to: '/namoz', icon: <MosqueIcon />, title: 'Namoz', subtitle: "Namozning hukmlari va qoidalari" },
  { to: '/namoz-vaqtlari', icon: <ClockIcon />, title: 'Namoz vaqtlari', subtitle: 'Viloyatlar bo\u2018yicha aniq vaqtlar' },
  { to: '/iymon', icon: <BookIcon />, title: 'Iymon', subtitle: 'Iymon asoslari va aqidaviy masalalar' },
  { to: '/namoz-organish', icon: <GraduateIcon />, title: "Namoz o'rganish", subtitle: 'Rasmlar va audio bilan bosqichma-bosqich' },
  { to: '/qibla', icon: <CompassIcon />, title: 'Qibla', subtitle: 'Qibla yo\u2018nalishini topish (kompas)' },
  { to: '/suralar', icon: <SurahIcon />, title: 'Suralar va zam suralar', subtitle: "Arabcha, o'zbekcha va ma'nosi" },
  { to: '/loyiha-haqida', icon: <InfoIcon />, title: 'Loyiha haqida', subtitle: 'Iymon jamoasi bilan tanishing' },
];

const REASONS = [
  {
    title: 'Ishonchli manbalar',
    text: "Ma'lumotlar Ahli sunna val-jamoa e'tiqodi va O'zbekistonda asrlar davomida amal qilib kelingan Hanafiy mazhabi asosida tayyorlanadi. Oyat va hadislar manbasi bilan keltiriladi.",
  },
  {
    title: 'Bosqichma-bosqich o\u2018rganish',
    text: "Namozni endi o'rganayotganlar uchun tahoratdan boshlab har bir amal ketma-ket, sodda tilda tushuntiriladi. Murakkab masalalar ham tushunarli bo'lishi uchun bo'laklarga ajratib beriladi.",
  },
  {
    title: 'Kundalik ibodat uchun qulay',
    text: "Namoz vaqtlari O'zbekistonning 13 hududi bo'yicha islom.uz ma'lumotlari asosida ko'rsatiladi: kunlik, oylik va yillik jadval. Qibla yo'nalishini ham shu yerda aniqlash mumkin.",
  },
  {
    title: 'Qur\u2019on bilan yaqinlik',
    text: "Namozda o'qiladigan suralar arabcha matni, o'zbekcha o'qilishi va ma'nosi bilan beriladi — nima o'qiyotganingizni tushunib o'qishingiz uchun.",
  },
  {
    title: 'Hamma uchun ochiq',
    text: "Platformadan foydalanish bepul. Telefon va kompyuterda birdek qulay ishlaydi, shuning uchun bilim olish uchun qulay vaqt va joyni kutish shart emas.",
  },
];


export function HomePage() {
  const region = useLayoutRegion();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden rounded-3xl bg-primary-900 text-white motion-safe:animate-fade-in-up">
        {/* Orqa fon: masjid rasmi */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-[position:70%_center]"
          style={{ backgroundImage: 'url(/images/mosque.png)' }}
        />
        {/* Matn o'qilishi uchun chapdan qorong'i gradient */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary-900/90 via-primary-900/50 to-transparent" />
        <div className="relative grid gap-8 p-6 md:p-10 lg:min-h-[420px] lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent-400">Iymon</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight md:text-5xl">
              Islomiy ta'lim{' '}
              <span className="text-accent-400">platformasi</span>
            </h1>
            <p className="mt-4 text-base text-white/85">
              Namozni o'rganing, iymoningizni mustahkamlang. Islam haqida ishonchli
              ma'lumotlarni bir joyda oson va qulay tarzda oling.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/namoz-vaqtlari"
                className="inline-flex items-center gap-2 rounded-xl bg-accent-400 px-5 py-3 text-sm font-bold text-white transition hover:bg-accent-500"
              >
                <ClockIcon className="h-4 w-4" /> Namoz vaqtlari <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                to="/namoz-organish"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20"
              >
                <GraduateIcon className="h-4 w-4" /> Namozni o'rganish <ArrowRightIcon className="h-4 w-4" />
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
      <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
        {FEATURES.map((f, i) => (
          // Animatsiya alohida o'ramda: kartaning hover'dagi siljishi bilan to'qnashmasligi uchun
          <div key={f.to} className="motion-safe:animate-fade-in-up" style={{ animationDelay: `${150 + i * 60}ms` }}>
            <FeatureCard {...f} />
          </div>
        ))}
      </section>

      {/* ===== Nega Iymon ===== */}
      <section className="mt-10 grid gap-6 motion-safe:animate-fade-in-up lg:grid-cols-[1fr_380px]" style={{ animationDelay: '500ms' }}>
        <div className="overflow-hidden rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900">
          <h2 className="font-display text-2xl font-extrabold text-neutral-900 dark:text-white">
            Nega <span className="text-primary-600">Iymon?</span>
          </h2>
          <div className="mt-4 max-w-3xl space-y-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            <p>
              Bugun internetda diniy ma'lumot juda ko'p, lekin ularning hammasi ham ishonchli emas,
              ba'zilari esa bir-biriga zid. Natijada namozni o'rganmoqchi yoki iymonini mustahkamlamoqchi
              bo'lgan inson qaysi manbaga tayanishni bilmay qoladi.
            </p>
            <p>
              <strong className="text-neutral-800 dark:text-neutral-100">Iymon</strong> shu ehtiyojga javob
              sifatida yaratilgan. Platforma namoz, aqida va Qur'on bo'yicha har bir musulmon bilishi zarur
              bo'lgan asosiy bilimlarni bir joyda, tushunarli o'zbek tilida va{' '}
              <strong className="text-neutral-800 dark:text-neutral-100">Hanafiy</strong> mazhabi asosida
              taqdim etadi.
            </p>
          </div>

          <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {REASONS.map((r, i) => (
              <div key={r.title} className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
                <dt className="flex items-baseline gap-3 font-display text-base font-bold text-neutral-900 dark:text-white">
                  <span className="text-xs font-semibold tabular-nums text-primary-600">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {r.title}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{r.text}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ===== Kun hadisi ===== */}
        <HadisiCarousel />
      </section>
    </div>
  );
}

function HadisiCarousel() {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900">
      <h2 className="font-display text-xl font-extrabold text-neutral-900 dark:text-white">
        Kun <span className="text-accent-500">hadisi</span>
      </h2>
      <div className="mt-4 space-y-4">
        {HADITHS.map((h) => (
          <blockquote key={h.text} className="rounded-2xl bg-primary-50 p-4 dark:bg-primary-900/30">
            <p className="text-sm italic text-neutral-700 dark:text-neutral-200">{h.text}</p>
            <cite className="mt-2 block text-xs font-semibold not-italic text-neutral-500">{h.source}</cite>
          </blockquote>
        ))}
      </div>
    </div>
  );
}
