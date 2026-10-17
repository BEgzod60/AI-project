import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { TopicIconSvg } from '../../components/namoz/NamozIcons';
import { ContactSection } from '../../components/about/ContactSection';
import { ArrowRightIcon, BookIcon, ClockIcon, CompassIcon, GraduateIcon, MosqueIcon, SurahIcon } from '../../components/common/Icons';

const PRINCIPLES: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <TopicIconSvg icon="book" className="h-6 w-6" />,
    title: 'Manbasi ko‘rsatilgan',
    text: 'Diniy matnlarning har biri O‘zbekiston musulmonlari idorasining rasmiy saytidan olingan va manba havolasi bilan ko‘rsatiladi.',
  },
  {
    icon: <TopicIconSvg icon="mosque" className="h-6 w-6" />,
    title: 'Hanafiy mazhabi',
    text: 'Namoz tartibi, amallar va hukmlar O‘zbekistonda amal qilinadigan Hanafiy mazhabi bo‘yicha beriladi.',
  },
  {
    icon: <TopicIconSvg icon="scroll" className="h-6 w-6" />,
    title: 'Matn o‘zgartirilmaydi',
    text: 'Manbadagi matn aynan ko‘chiriladi. Sun’iy intellekt diniy matn yoki namoz amalini o‘zi yaratmaydi — faqat ovozni tanishda yordam beradi.',
  },
  {
    icon: <TopicIconSvg icon="shield" className="h-6 w-6" />,
    title: 'Tekshiruv holati ochiq',
    text: 'Tasdiqlanmagan ma’lumot saytda chop etilmaydi — uning o‘rnida «Tekshirilmoqda» degan belgi turadi.',
  },
];

const SECTIONS: { to: string; icon: ReactNode; title: string; text: string }[] = [
  { to: '/namoz', icon: <MosqueIcon />, title: 'Namoz', text: 'Poklanish, tahorat, namozning farz, vojib va sunnatlari, qazo va turli namozlar.' },
  { to: '/namoz/namozdagi-xatolar', icon: <TopicIconSvg icon="shield" className="h-5 w-5" />, title: 'Namozdagi xatolar', text: 'Namozni buzadigan, harom va makruh amallar hamda sajdai sahv.' },
  { to: '/namoz-organish', icon: <GraduateIcon />, title: 'Namoz o‘rganish', text: 'Har bir namoz rasmlar va audio bilan bosqichma-bosqich; «Birga takrorlash» va «Birga o‘qish» rejimlari.' },
  { to: '/namoz-vaqtlari', icon: <ClockIcon />, title: 'Namoz vaqtlari', text: 'O‘zbekiston shahar va tumanlari bo‘yicha kunlik va oylik namoz vaqtlari.' },
  { to: '/iymon', icon: <BookIcon />, title: 'Iymon', text: 'Iymon asoslari, aqida va iymon shartlari haqidagi mavzular.' },
  { to: '/suralar', icon: <SurahIcon />, title: 'Suralar', text: '114 sura: arabcha matn, o‘zbekcha ma’no, lotincha o‘qilishi va oyatma-oyat tilovat.' },
  { to: '/qibla', icon: <CompassIcon />, title: 'Qibla va masjidlar', text: 'Joylashuvingiz bo‘yicha qibla yo‘nalishi va yaqin atrofdagi masjidlar.' },
];

const SOURCES: { area: string; name: string; url: string; note?: string }[] = [
  { area: 'Namoz, Iymon, Namoz o‘rganish, Namozdagi xatolar', name: 'O‘zbekiston musulmonlari idorasi — muslim.uz', url: 'https://muslim.uz/uz/c/prayer' },
  { area: 'Qur’on matni (arabcha) va oyatma-oyat tilovat', name: 'Tanzil Project — tanzil.net', url: 'https://tanzil.net', note: 'CC BY 3.0' },
  { area: 'Suralarning o‘zbekcha ma’nosi', name: 'Muhammad Sodiq Muhammad Yusuf — ma’nolar tarjimasi', url: 'https://tanzil.net/trans/', note: 'notijoriy foydalanish uchun' },
  { area: 'Namoz vaqtlari', name: 'islom.uz ma’lumotlari (namoz-vaqtlari.more-info.uz orqali)', url: 'https://islom.uz' },
  { area: 'Masjidlar katalogi', name: 'masjid.uz', url: 'https://masjid.uz' },
  { area: 'Xarita va masjid joylashuvi', name: 'OpenStreetMap', url: 'https://www.openstreetmap.org', note: 'ODbL' },
  { area: 'Masjid rasmlari', name: 'Wikimedia Commons', url: 'https://commons.wikimedia.org' },
];

const TECH = ['Django 5', 'Django REST Framework', 'React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'Leaflet', 'Web Speech API', 'Web Audio API'];

function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return <h2 id={id} className="font-display text-2xl font-bold text-neutral-900 md:text-3xl dark:text-white">{children}</h2>;
}

export function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden rounded-3xl bg-primary-900 text-white motion-safe:animate-fade-in-up">
        <div aria-hidden className="absolute inset-0 bg-cover bg-[position:70%_center]" style={{ backgroundImage: 'url(/images/namoz/13.webp)' }} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/90 to-primary-900/30" />
        <div className="relative p-6 md:p-10">
          <Breadcrumb items={[{ label: 'Bosh sahifa', to: '/' }, { label: 'Loyiha haqida' }]} />
          <div className="mt-5 flex items-center gap-4">
            <img src="/images/iymon-logo.webp" alt="" width={56} height={56} className="h-14 w-14 rounded-2xl shadow-lg" />
            <h1 className="font-display text-4xl font-extrabold md:text-5xl">
              Loyiha <span className="text-accent-400">haqida</span>
            </h1>
          </div>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
            <strong className="font-semibold text-white">Iymon</strong> — namoz o‘rganish, iymon mavzulari, namoz vaqtlari, Qur’on suralari
            va qibla topishni bir joyda jamlagan islomiy ta’lim platformasi.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {['Hanafiy mazhabi', 'O‘zbek tilida', 'Manbasi ko‘rsatilgan'].map((x) => (
              <li key={x} className="rounded-full bg-white/10 px-3 py-1 text-sm ring-1 ring-white/15 backdrop-blur-sm">{x}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Maqsad ===== */}
      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8 dark:bg-neutral-900 dark:ring-white/10">
          <SectionTitle>Maqsadimiz</SectionTitle>
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-700 md:text-base dark:text-neutral-300">
            Namozni endi o‘rganayotgan yoki bilimini mustahkamlamoqchi bo‘lgan har bir kishiga ishonchli, tushunarli va o‘zbek tilidagi
            ma’lumotni bir joyda berish. Har bir namoz rasmlar, tilovat va lotin yozuvidagi o‘qilishi bilan bosqichma-bosqich ko‘rsatiladi.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-neutral-700 md:text-base dark:text-neutral-300">
            Ma’lumotlar o‘zimizdan yozilmaydi — ular O‘zbekiston musulmonlari idorasi kabi rasmiy manbalardan olinadi va har birining manbasi
            ko‘rsatiladi.
          </p>
        </div>
        <div className="rounded-3xl bg-primary-900 p-6 text-white shadow-sm md:p-8">
          <h2 className="font-display text-2xl font-bold">Namozni birga o‘rganamiz</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/80">
            «Namoz o‘rganish» bo‘limida ikki yordamchi rejim bor: <strong className="text-white">Birga takrorlash</strong> — namunani tinglab,
            ovoz chiqarib mashq qilish; <strong className="text-white">Birga o‘qish</strong> — namoz davomida qo‘l tegizmasdan ko‘rinadigan vizual
            ko‘rsatmalar. Sayt ovozingizni yozib olmaydi va saqlamaydi; so‘zlarni tanish Chrome yoki Edge brauzerining xizmati orqali ishlaydi.
          </p>
          <Link to="/namoz-organish" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent-400 px-4 py-2.5 text-sm font-bold text-primary-900 transition hover:bg-accent-500">
            Namoz o‘rganishni boshlash <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ===== Tamoyillar ===== */}
      <section className="mt-10" aria-labelledby="tamoyillar">
        <SectionTitle id="tamoyillar">Tamoyillarimiz</SectionTitle>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-emerald-300">{p.icon}</span>
              <h3 className="mt-4 font-display text-lg font-bold text-neutral-900 dark:text-white">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Bo'limlar ===== */}
      <section className="mt-10" aria-labelledby="bolimlar">
        <SectionTitle id="bolimlar">Platformada nimalar bor</SectionTitle>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group flex items-start gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primary-500/40 dark:bg-neutral-900 dark:ring-white/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white [&>svg]:h-5 [&>svg]:w-5">{s.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 font-display font-bold text-neutral-900 dark:text-white">
                  {s.title}
                  <ArrowRightIcon className="h-4 w-4 shrink-0 text-primary-600 transition group-hover:translate-x-0.5" />
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-neutral-600 dark:text-neutral-400">{s.text}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== Manbalar ===== */}
      <section className="mt-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 md:p-8 dark:bg-neutral-900 dark:ring-white/10" aria-labelledby="manbalar">
        <SectionTitle id="manbalar">Manbalar</SectionTitle>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Platformadagi ma’lumotlar quyidagi manbalardan olinadi. Har bir sahifada aniq bo‘lim havolasi ham ko‘rsatilgan.</p>
        <ul className="mt-5 divide-y divide-neutral-100 dark:divide-neutral-800">
          {SOURCES.map((s) => (
            <li key={s.name} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{s.area}</span>
              <span className="text-sm text-neutral-600 sm:text-right dark:text-neutral-400">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-2 hover:text-primary-800 dark:text-emerald-300">
                  {s.name} ↗
                </a>
                {s.note && <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-white/10 dark:text-neutral-300">{s.note}</span>}
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
      <section className="mt-6 rounded-3xl bg-accent-100 p-6 ring-1 ring-accent-400/40 md:p-8 dark:bg-accent-500/10" aria-labelledby="eslatma">
        <h2 id="eslatma" className="flex items-center gap-2 font-display text-xl font-bold text-neutral-900 dark:text-white">
          <TopicIconSvg icon="lantern" className="h-5 w-5 text-accent-500" />
          Muhim eslatma
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          Platforma ta’lim uchun yordamchi vosita bo‘lib, fatvo bermaydi. Diniy masalalarda, ayniqsa o‘z holatingizga oid savollarda,
          masjid imomi yoki diniy mutaxassisga murojaat qiling. Namoz ichida ekrandan qarab qiroat qilish masalasi alohida hukmga ega —
          «Birga o‘qish» rejimidan foydalanishdan oldin mutaxassis bilan maslahatlashing.
        </p>
      </section>

      {/* ===== Aloqa ===== */}
      <ContactSection />

      {/* ===== Texnologiyalar ===== */}
      <section className="mt-10" aria-labelledby="texnologiyalar">
        <SectionTitle id="texnologiyalar">Texnologiyalar</SectionTitle>
        <ul className="mt-4 flex flex-wrap gap-2">
          {TECH.map((t) => (
            <li key={t} className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-white/10">{t}</li>
          ))}
        </ul>
      </section>

      <div className="mt-10 flex justify-center">
        <Link
          to="/"
          className="group inline-flex items-center gap-3 rounded-2xl bg-primary-700 px-6 py-3.5 text-sm font-bold text-white shadow-sm ring-1 ring-primary-600 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-primary-800 hover:shadow-lg"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-primary-600 group-hover:text-white">
            <ArrowRightIcon className="h-4 w-4 rotate-180" />
          </span>
          Bosh sahifaga qaytish
        </Link>
      </div>
    </div>
  );
}
