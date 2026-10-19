import type { ReactNode } from 'react';
import { useApi } from '../../hooks/useApi';
import { getTopics } from '../../services/namozService';
import { SkeletonCard } from '../common/Loading';
import { Breadcrumb } from '../namoz/Breadcrumb';
import { TopicCard } from '../namoz/TopicCard';
import { TopicIconSvg } from '../namoz/NamozIcons';
import type { TopicCategoryConfig } from './config';
import { ContentLanguageNote } from '../common/ContentLanguageNote';
import { PageGuide } from '../common/PageGuide';
import { useI18n } from '../../i18n';

/** Mavzuli bo'limning bosh sahifasi: hero, (bo'limga xos qism), mavzu kartalari va manba haqida izoh */
export function TopicListPage({ config, children }: { config: TopicCategoryConfig; children?: ReactNode }) {
  const { data: topics, loading, error, retry } = useApi(() => getTopics(config.category), [config.category]);
  const { t, lang } = useI18n();
  const label = t(...config.label);

  return (
    <div className="page">
      {/* ===== Hero ===== */}
      <section className="hero motion-safe:animate-fade-in-up">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-[position:75%_center] opacity-70"
          style={{ backgroundImage: `url(${config.heroImage})` }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/85 to-primary-900/20" />

        <div className="relative grid gap-4 p-4 sm:p-6 md:gap-8 md:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <Breadcrumb items={[{ label: t('Bosh sahifa', 'Главная'), to: '/' }, { label }]} />
            <div className="mt-3 flex items-center gap-3 md:mt-5 md:gap-4">
              <img src="/images/iymon-logo.webp" alt="" width={56} height={56} className="h-10 w-10 rounded-xl shadow-lg md:h-14 md:w-14 md:rounded-2xl" />
              <h1 className="hero-title">{label}</h1>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/85 md:mt-5 md:text-base md:leading-relaxed">{config.intro[lang]}</p>
          </div>

          {/* Qisqa ma'lumot paneli */}
          <dl className="grid grid-cols-3 gap-1 rounded-2xl bg-black/25 p-2 text-center ring-1 ring-white/15 backdrop-blur-sm lg:w-80">
            {config.stats.map((s, i) => ({ value: i === 0 && topics ? String(topics.length) : t(...s.value), label: t(...s.label) })).map((s) => (
              <div key={s.label} className="rounded-xl px-1 py-2 sm:px-2 md:py-3">
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-sm font-bold text-accent-400 sm:text-base">{s.value}</dd>
                <dd className="text-[11px] text-white/70">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {children && <div className="mt-3 space-y-3 sm:mt-4 sm:space-y-4 md:mt-8 md:space-y-8">{children}</div>}

      {/* ===== Mavzular ===== */}
      <section aria-label={t(`${label} mavzulari`, `Темы раздела «${label}»`)} className="mt-3 sm:mt-4 md:mt-8">
        <ContentLanguageNote className="mb-3 md:mb-5" />
        {error && (
          <div className="rounded-3xl bg-rose-50 p-6 text-center ring-1 ring-rose-200 dark:bg-rose-500/10 dark:ring-rose-500/30">
            <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-3 rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
            >
              {t('Qayta urinish', 'Повторить')}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:gap-5">
          {loading &&
            Array.from({ length: Number(config.stats[0]?.value[0]) || 12 }, (_, i) => <SkeletonCard key={i} className="h-[150px] rounded-2xl lg:h-[240px] lg:rounded-3xl" />)}

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
      <section className="mt-3 flex items-start gap-3 rounded-2xl bg-primary-900 p-4 text-white sm:mt-4 md:mt-8 md:items-center md:gap-4 md:rounded-3xl md:p-8">
        <span className="flex h-10 w-10 shrink-0 md:h-12 md:w-12 items-center justify-center rounded-2xl bg-white/10 text-accent-400">
          <TopicIconSvg icon="book" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold">{t(...config.note.title)}</h2>
          <p className="mt-1 text-sm leading-relaxed text-white/80">{t(...config.note.text)}</p>
        </div>
      </section>

      <PageGuide steps={config.guide} className="mt-3 sm:mt-4 md:mt-8" />
    </div>
  );
}
