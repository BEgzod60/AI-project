import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useActiveSection } from '../../hooks/useActiveSection';
import { getTopic } from '../../services/namozService';
import { Loading } from '../common/Loading';
import { ArrowRightIcon } from '../common/Icons';
import { Breadcrumb } from '../namoz/Breadcrumb';
import { SectionBlock } from '../namoz/SectionBlock';
import { TopicIconSvg } from '../namoz/NamozIcons';
import { themeOf, topicNumber } from '../namoz/topicThemes';
import type { TopicCategoryConfig } from './config';
import type { NamozTopicDetail, TopicNeighbour, TopicSection } from '../../types/namoz';

/** Mavzu sahifasi: sarlavha, tuzilgan bo'limlar, mundarija va qo'shni mavzular */
export function TopicDetailPage({ config }: { config: TopicCategoryConfig }) {
  const { slug = '' } = useParams();
  const { data: topic, loading, error, retry } = useApi(() => getTopic(config.category, slug), [config.category, slug]);

  // Oldingi/keyingi mavzuga o'tganda sahifa boshidan ochilsin
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      {loading && <Loading label="Mavzu yuklanmoqda..." />}

      {!loading && error && (
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 dark:bg-neutral-900">
          <p className="text-neutral-700 dark:text-neutral-200">{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={retry}
              className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200"
            >
              Qayta urinish
            </button>
            <Link to={config.basePath} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700">
              {config.label} bo'limiga qaytish
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && topic && <TopicContent key={topic.slug} topic={topic} config={config} />}
    </div>
  );
}

function TopicContent({ topic, config }: { topic: NamozTopicDetail; config: TopicCategoryConfig }) {
  const t = themeOf(topic.theme);
  const hasSections = topic.sections.length > 0;
  const { hash } = useLocation();

  // Qidiruvdan kelganda (#bolim-<id>) — o'sha bo'limga aylantirib, bir lahza ajratib ko'rsatamiz
  useEffect(() => {
    if (!hash.startsWith('#bolim-')) return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      el.classList.add('ring-2', 'ring-accent-400');
    });
    const timer = window.setTimeout(() => el.classList.remove('ring-2', 'ring-accent-400'), 2500);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      el.classList.remove('ring-2', 'ring-accent-400');
    };
  }, [hash, topic.slug]);

  return (
    <>
      {/* ===== Sarlavha ===== */}
      <header className="relative overflow-hidden rounded-3xl bg-primary-900 p-6 text-white motion-safe:animate-fade-in-up md:p-10">
        {topic.image ? (
          /* Mavzu rasmi: mobilda butun fon (quyuq qatlam bilan), katta ekranda o'ng yarmida */
          <div aria-hidden className="pointer-events-none absolute inset-0 md:left-auto md:w-[55%]">
            <img src={topic.image} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-primary-900/75 md:bg-transparent md:bg-gradient-to-r md:from-primary-900 md:via-primary-900/60 md:to-primary-900/10" />
          </div>
        ) : (
          <TopicIconSvg
            icon={topic.icon}
            className="pointer-events-none absolute -bottom-10 -right-6 h-56 w-56 text-white/[0.06] md:h-72 md:w-72"
          />
        )}
        <div className="relative max-w-3xl md:max-w-[55%]">
          <Breadcrumb items={[{ label: 'Bosh sahifa', to: '/' }, { label: config.label, to: config.basePath }, { label: topic.title }]} />
          <div className="mt-5 flex items-center gap-4">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${t.dark ? t.iconBadge : 'bg-white/10 text-accent-400 ring-1 ring-white/15'}`}>
              <TopicIconSvg icon={topic.icon} className="h-7 w-7" />
            </span>
            <div>
              <p className="font-display text-sm font-bold tabular-nums text-accent-400">{topicNumber(topic.number)}-mavzu</p>
              <h1 className="font-display text-3xl font-extrabold leading-tight md:text-4xl">{topic.title}</h1>
            </div>
          </div>
          <p className="mt-4 text-base leading-relaxed text-white/80">{topic.summary}</p>
        </div>
      </header>

      {hasSections ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_260px] lg:items-start">
          <div className="space-y-6">
            {topic.sections.map((section, i) => (
              <div key={section.id} className="motion-safe:animate-fade-in-up" style={{ animationDelay: `${100 + i * 70}ms` }}>
                <SectionBlock section={section} />
              </div>
            ))}
            {topic.awaiting_review > 0 && <AwaitingReview compact />}
          </div>

          {/* Mundarija — faqat katta ekranda; o'qilayotgan bo'lim ajratib ko'rsatiladi */}
          {topic.sections.length > 1 && <TableOfContents sections={topic.sections} />}
        </div>
      ) : (
        <div className="mt-8">
          <AwaitingReview />
        </div>
      )}

      {/* ===== Oldingi / keyingi mavzu ===== */}
      <nav aria-label="Boshqa mavzular" className="mt-8 grid gap-4 sm:grid-cols-3">
        {topic.previous ? <NeighbourLink topic={topic.previous} direction="prev" basePath={config.basePath} /> : <span className="hidden sm:block" />}
        <NavButton to={config.basePath} label="Bo‘limga qaytish" title={config.label} icon={<TopicIconSvg icon={config.icon} className="h-5 w-5" />} align="center" />
        {topic.next && <NeighbourLink topic={topic.next} direction="next" basePath={config.basePath} />}
      </nav>
    </>
  );
}

function TableOfContents({ sections }: { sections: TopicSection[] }) {
  const ids = sections.map((s) => `bolim-${s.id}`);
  const active = useActiveSection(ids);
  const listRef = useRef<HTMLOListElement>(null);

  // Faol bandni mundarija ichida ko'rinishda ushlab turamiz (sahifaning o'zini surmasdan)
  useEffect(() => {
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-target="${active}"]`);
    if (!list || !item) return;
    const top = item.offsetTop; // ol — relative, shuning uchun offsetTop ro'yxatga nisbatan
    if (top < list.scrollTop || top + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: top - list.clientHeight / 2 + item.offsetHeight / 2, behavior: 'smooth' });
    }
  }, [active]);

  const goTo = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
  };

  return (
    <nav
      aria-label="Mundarija"
      className="sticky top-24 hidden max-h-[calc(100vh-7rem)] flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 lg:flex dark:bg-neutral-900 dark:ring-white/10"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Mundarija</p>
      <ol ref={listRef} className="relative mt-3 min-h-0 space-y-1 overflow-y-auto pr-1">
        {sections.map((s, i) => {
          const id = ids[i];
          const isActive = id === active;
          return (
            <li key={s.id}>
              <a
                href={`#${id}`}
                data-target={id}
                onClick={(e) => goTo(e, id)}
                aria-current={isActive ? 'location' : undefined}
                className={`flex gap-2 rounded-lg border-l-[3px] px-2 py-1.5 text-sm transition-colors duration-300 ${
                  isActive
                    ? 'border-primary-500 bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-emerald-300'
                    : 'border-transparent text-neutral-700 hover:bg-primary-50 hover:text-primary-700 dark:text-neutral-300 dark:hover:bg-primary-900/30'
                }`}
              >
                <span className={`tabular-nums ${isActive ? 'text-primary-600 dark:text-emerald-300' : 'text-neutral-400'}`}>{i + 1}.</span>
                {s.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function AwaitingReview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-3xl bg-white text-center shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10 ${compact ? 'p-6' : 'p-10'}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 text-accent-500">
        <TopicIconSvg icon="clock" />
      </span>
      <h2 className="mt-4 font-display text-lg font-bold text-neutral-900 dark:text-white">
        {compact ? "Qo'shimcha bo'limlar tekshiruvda" : "Ma'lumotlar tekshiruvda"}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        Bu mavzu bo'yicha ma'lumotlar Hanafiy fiqhi bo'yicha mutaxassis tekshiruvidan o'tmoqda.
        Tekshirilgan va manbasi ko'rsatilgan ma'lumotlar tez orada joylanadi.
      </p>
    </div>
  );
}

interface NavButtonProps {
  to: string;
  label: string;
  title: string;
  icon: ReactNode;
  /** Ikonka joyi: chapda, o'ngda yoki markazda (ustida) */
  align: 'left' | 'right' | 'center';
}

/** Sahifa pastidagi navigatsiya tugmasi: yashil; hover/fokusda oq bo'ladi */
function NavButton({ to, label, title, icon, align }: NavButtonProps) {
  const layout = {
    left: 'flex-row text-left',
    right: 'flex-row-reverse text-right',
    center: 'flex-col justify-center text-center gap-2',
  }[align];
  return (
    <Link
      to={to}
      className={`group flex items-center gap-4 rounded-2xl bg-primary-700 p-4 text-white shadow-sm ring-1 ring-primary-600 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:ring-primary-500/50 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${layout}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition duration-300 group-hover:bg-primary-600 group-focus-visible:bg-primary-600">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-white/70 transition-colors duration-300 group-hover:text-neutral-500 group-focus-visible:text-neutral-500">
          {label}
        </span>
        <span className="block truncate font-display font-bold transition-colors duration-300 group-hover:text-primary-800 group-focus-visible:text-primary-800">
          {title}
        </span>
      </span>
    </Link>
  );
}

function NeighbourLink({ topic, direction, basePath }: { topic: TopicNeighbour; direction: 'prev' | 'next'; basePath: string }) {
  const isNext = direction === 'next';
  return (
    <NavButton
      to={`${basePath}/${topic.slug}`}
      label={`${isNext ? 'Keyingi mavzu' : 'Oldingi mavzu'} · ${topicNumber(topic.number)}`}
      title={topic.title}
      icon={<ArrowRightIcon className={`h-4 w-4 transition-transform duration-300 ${isNext ? 'group-hover:translate-x-0.5' : 'rotate-180 group-hover:-translate-x-0.5'}`} />}
      align={isNext ? 'right' : 'left'}
    />
  );
}
