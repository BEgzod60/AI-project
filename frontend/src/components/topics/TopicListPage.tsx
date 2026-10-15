import { useApi } from '../../hooks/useApi';
import { getTopics } from '../../services/namozService';
import { SkeletonCard } from '../common/Loading';
import { Breadcrumb } from '../namoz/Breadcrumb';
import { TopicCard } from '../namoz/TopicCard';
import { TopicIconSvg } from '../namoz/NamozIcons';
import type { TopicCategoryConfig } from './config';

/** Mavzuli bo'limning bosh sahifasi: hero, mavzu kartalari va manba haqida izoh */
export function TopicListPage({ config }: { config: TopicCategoryConfig }) {
  const { data: topics, loading, error, retry } = useApi(() => getTopics(config.category), [config.category]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden rounded-3xl bg-primary-900 text-white motion-safe:animate-fade-in-up">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-[position:75%_center] opacity-70"
          style={{ backgroundImage: `url(${config.heroImage})` }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/85 to-primary-900/20" />

        <div className="relative grid gap-8 p-6 md:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <Breadcrumb items={[{ label: 'Bosh sahifa', to: '/' }, { label: config.label }]} />
            <div className="mt-5 flex items-center gap-4">
              <img src="/images/iymon-logo.png" alt="" width={56} height={56} className="h-14 w-14 rounded-2xl shadow-lg" />
              <h1 className="font-display text-4xl font-extrabold md:text-5xl">{config.label}</h1>
            </div>
            <p className="mt-5 text-base leading-relaxed text-white/85">{config.intro}</p>
          </div>

          {/* Qisqa ma'lumot paneli */}
          <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-black/25 p-2 text-center ring-1 ring-white/15 backdrop-blur-sm lg:w-80">
            {config.stats.map((s, i) => (i === 0 && topics ? { ...s, value: String(topics.length) } : s)).map((s) => (
              <div key={s.label} className="rounded-xl px-2 py-3">
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-base font-bold text-accent-400">{s.value}</dd>
                <dd className="text-[11px] text-white/70">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ===== Mavzular ===== */}
      <section aria-label={`${config.label} mavzulari`} className="mt-8">
        {error && (
          <div className="rounded-3xl bg-rose-50 p-6 text-center ring-1 ring-rose-200 dark:bg-rose-500/10 dark:ring-rose-500/30">
            <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-3 rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
            >
              Qayta urinish
            </button>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading &&
            Array.from({ length: Number(config.stats[0]?.value) || 12 }, (_, i) => <SkeletonCard key={i} className="h-[240px] rounded-3xl" />)}

          {topics?.map((topic, i) => (
            <div
              key={topic.slug}
              className="motion-safe:animate-fade-in-up"
              style={{ animationDelay: `${100 + i * 50}ms` }}
            >
              <TopicCard topic={topic} basePath={config.basePath} />
            </div>
          ))}
        </div>
      </section>

      {/* ===== Ma'lumotlar haqida ===== */}
      <section className="mt-8 flex flex-col gap-4 rounded-3xl bg-primary-900 p-6 text-white md:flex-row md:items-center md:p-8">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-accent-400">
          <TopicIconSvg icon="book" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold">{config.note.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-white/80">{config.note.text}</p>
        </div>
      </section>
    </div>
  );
}
