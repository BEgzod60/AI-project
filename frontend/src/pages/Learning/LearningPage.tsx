import type { ReactNode } from 'react';
import { useApi } from '../../hooks/useApi';
import { getPrayerCategories } from '../../services/learningService';
import { SkeletonCard } from '../../components/common/Loading';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { TopicIconSvg } from '../../components/namoz/NamozIcons';
import { LessonCard } from '../../components/learning/LessonCard';

const FEATURES: { icon: ReactNode; label: string }[] = [
  { icon: <TopicIconSvg icon="mosque" className="h-5 w-5" />, label: 'Hanafiy mazhabi' },
  { icon: <TopicIconSvg icon="book" className="h-5 w-5" />, label: 'Manbasi ko‘rsatilgan' },
  { icon: <TopicIconSvg icon="scroll" className="h-5 w-5" />, label: 'Lotin yozuvida' },
  { icon: <TopicIconSvg icon="shield" className="h-5 w-5" />, label: 'Tekshiruv holati ochiq' },
];

export function LearningPage() {
  const { data, loading, error, retry } = useApi(getPrayerCategories, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden rounded-3xl bg-primary-900 text-white motion-safe:animate-fade-in-up">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-[position:70%_center]"
          style={{ backgroundImage: 'url(/images/namoz/hero-organish.webp)' }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/85 to-primary-900/20" />
        <div className="relative p-6 md:p-10">
          <Breadcrumb items={[{ label: 'Bosh sahifa', to: '/' }, { label: 'Namoz o‘rganish' }]} />
          <h1 className="mt-5 font-display text-4xl font-extrabold md:text-5xl">
            Namozni <span className="text-accent-400">o‘rganish</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">
            O‘rganmoqchi bo‘lgan namozni tanlang. Har bir kartada rakatlar soni manbasi bilan ko‘rsatilgan;
            batafsil bosqichma-bosqich darslar tayyorlanmoqda.
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-2 text-sm text-white/90">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-accent-400 ring-1 ring-white/15">
                  {f.icon}
                </span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Darslar ro'yxati ===== */}
      <section aria-labelledby="darslar" className="mt-8">
        <h2 id="darslar" className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
          Darslar ro‘yxati
        </h2>

        {error && (
          <div className="mt-4 rounded-3xl bg-rose-50 p-6 text-center ring-1 ring-rose-200 dark:bg-rose-500/10 dark:ring-rose-500/30">
            <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
            <button type="button" onClick={retry} className="mt-3 rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700">
              Qayta urinish
            </button>
          </div>
        )}

        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading && Array.from({ length: 10 }, (_, i) => <SkeletonCard key={i} className="h-[250px] rounded-3xl" />)}
          {data?.map((c, i) => (
            <div key={c.slug} className="motion-safe:animate-fade-in-up" style={{ animationDelay: `${100 + i * 50}ms` }}>
              <LessonCard category={c} />
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500">
          Rakatlar soni O‘zbekiston musulmonlari idorasi sayti (muslim.uz) dagi ma‘lumotlarga asoslangan.
          «Tekshirilmoqda» belgisi bor kartalar ma‘lumoti hali tasdiqlanmagan.
        </p>
      </section>
    </div>
  );
}
