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
import { ContentLanguageNote } from '../common/ContentLanguageNote';
import { useI18n } from '../../i18n';
import type { NamozTopicDetail, TopicNeighbour, TopicSection } from '../../types/namoz';

/** Mavzu sahifasi: sarlavha, tuzilgan bo'limlar, mundarija va qo'shni mavzular */
export function TopicDetailPage({ config }: { config: TopicCategoryConfig }) {
  const { slug = '' } = useParams();
  const { data: topic, loading, error, retry } = useApi(() => getTopic(config.category, slug), [config.category, slug]);
  const { t: tr } = useI18n();

  // Oldingi/keyingi mavzuga o'tganda sahifa boshidan ochilsin
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  return (
    <div className="page">
      {loading && <Loading label={tr('Mavzu yuklanmoqda...', 'Загрузка темы...')} />}

      {!loading && error && (
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 dark:bg-neutral-900">
          <p className="text-neutral-700 dark:text-neutral-200">{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={retry}
              className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200"
            >
              {tr('Qayta urinish', 'Повторить')}
            </button>
            <Link to={config.basePath} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700">
              {tr(`${config.label[0]} bo‘limiga qaytish`, `Вернуться в раздел «${config.label[1]}»`)}
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
  const { t: tr } = useI18n();
  const label = tr(...config.label);
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
      <header className="hero p-4 motion-safe:animate-fade-in-up sm:p-6 md:p-10">
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
          <Breadcrumb items={[{ label: tr('Bosh sahifa', 'Главная'), to: '/' }, { label, to: config.basePath }, { label: topic.title }]} />
          <div className="mt-3 flex items-center gap-3 md:mt-5 md:gap-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl md:h-14 md:w-14 md:rounded-2xl ${t.dark ? t.iconBadge : 'bg-white/10 text-accent-400 ring-1 ring-white/15'}`}>
              <TopicIconSvg icon={topic.icon} className="h-6 w-6 md:h-7 md:w-7" />
            </span>
            <div>
              <p className="font-display text-sm font-bold tabular-nums text-accent-400">{tr(`${topicNumber(topic.number)}-mavzu`, `Тема ${topicNumber(topic.number)}`)}</p>
              <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl md:text-4xl">{topic.title}</h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base sm:leading-relaxed md:mt-4">{topic.summary}</p>
        </div>
      </header>

      <ContentLanguageNote className="mt-3 md:mt-6" />

      {/* Telefon/planshet: bo'limlar bo'yicha yonga suriladigan mundarija (desktopda — o'ngdagi panel) */}
      {hasSections && topic.sections.length > 1 && <MobileToc sections={topic.sections} />}

      {hasSections ? (
        <div className="mt-3 grid gap-8 md:mt-8 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
          <div className="min-w-0 space-y-3 sm:space-y-4 md:space-y-6">
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
        <div className="mt-3 md:mt-8">
          <AwaitingReview />
        </div>
      )}

      {/* ===== Oldingi / keyingi mavzu ===== */}
      {/* Telefonda: oldingi/keyingi yonma-yon, «Bo'limga qaytish» — pastda butun kenglikda */}
      <nav aria-label={tr('Boshqa mavzular', 'Другие темы')} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 md:mt-8 [&>*]:min-w-0">
        {/* Faqat bittasi bo'lsa (birinchi/oxirgi mavzu) — telefonda butun kenglikda */}
        {topic.previous ? (
          <div className={`[&>*]:h-full ${topic.next ? '' : 'col-span-2 sm:col-span-1'}`}>
            <NeighbourLink topic={topic.previous} direction="prev" basePath={config.basePath} />
          </div>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="order-last col-span-2 sm:order-none sm:col-span-1 [&>*]:h-full">
          <NavButton to={config.basePath} label={tr('Bo‘limga qaytish', 'Назад в раздел')} title={label} icon={<TopicIconSvg icon={config.icon} className="h-5 w-5" />} align="center" />
        </div>
        {topic.next && (
          <div className={`[&>*]:h-full ${topic.previous ? '' : 'col-span-2 sm:col-span-1'}`}>
            <NeighbourLink topic={topic.next} direction="next" basePath={config.basePath} />
          </div>
        )}
      </nav>
    </>
  );
}

function scrollToSection(e: MouseEvent<HTMLAnchorElement>, id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  window.history.replaceState(null, '', `#${id}`);
}

/** Telefon mundarijasi: header ostida yopishib turadigan chiplar qatori, faol bo'lim ko'rinishda ushlanadi */
function MobileToc({ sections }: { sections: TopicSection[] }) {
  const ids = sections.map((s) => `bolim-${s.id}`);
  const active = useActiveSection(ids);
  const { t: tr } = useI18n();
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-target="${active}"]`);
    if (!row || !chip) return;
    row.scrollTo({ left: chip.offsetLeft - (row.clientWidth - chip.offsetWidth) / 2, behavior: 'smooth' });
  }, [active]);

  return (
    <nav aria-label={tr('Mundarija', 'Содержание')} className="sticky top-[60px] z-20 -mx-3 mt-3 bg-neutral-50/90 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 md:top-[69px] lg:hidden dark:bg-neutral-950/90">
      <div ref={rowRef} className="snap-row relative">
        {sections.map((s, i) => {
          const id = ids[i];
          const isActive = id === active;
          return (
            <a
              key={s.id}
              href={`#${id}`}
              data-target={id}
              onClick={(e) => scrollToSection(e, id)}
              aria-current={isActive ? 'location' : undefined}
              className={`inline-flex min-h-[40px] max-w-[16rem] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ring-1 transition-colors ${
                isActive
                  ? 'bg-primary-700 text-white ring-primary-700'
                  : 'bg-white text-neutral-700 ring-black/10 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-white/10'
              }`}
            >
              <span className={`tabular-nums ${isActive ? 'text-accent-400' : 'text-neutral-400'}`}>{i + 1}.</span>
              <span className="truncate">{s.title}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function TableOfContents({ sections }: { sections: TopicSection[] }) {
  const ids = sections.map((s) => `bolim-${s.id}`);
  const active = useActiveSection(ids);
  const { t: tr } = useI18n();
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


  return (
    <nav
      aria-label={tr('Mundarija', 'Содержание')}
      className="sticky top-24 hidden max-h-[calc(100vh-7rem)] flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 lg:flex dark:bg-neutral-900 dark:ring-white/10"
    >
      <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">{tr('Mundarija', 'Содержание')}</p>
      <ol ref={listRef} className="relative mt-3 min-h-0 space-y-1 overflow-y-auto pr-1">
        {sections.map((s, i) => {
          const id = ids[i];
          const isActive = id === active;
          return (
            <li key={s.id}>
              <a
                href={`#${id}`}
                data-target={id}
                onClick={(e) => scrollToSection(e, id)}
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
  const { t } = useI18n();
  return (
    <div className={`flex flex-col items-center rounded-3xl bg-white text-center shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10 ${compact ? 'p-6' : 'p-10'}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 text-accent-500">
        <TopicIconSvg icon="clock" />
      </span>
      <h2 className="mt-4 font-display text-lg font-bold text-neutral-900 dark:text-white">
        {compact ? t('Qo‘shimcha bo‘limlar tekshiruvda', 'Дополнительные разделы на проверке') : t('Ma’lumotlar tekshiruvda', 'Материалы на проверке')}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {t('Bu mavzu bo‘yicha ma’lumotlar Hanafiy fiqhi bo‘yicha mutaxassis tekshiruvidan o‘tmoqda. Tekshirilgan va manbasi ko‘rsatilgan ma’lumotlar tez orada joylanadi.',
          'Материалы по этой теме проходят проверку специалистом по ханафитскому фикху. Проверенные материалы с источниками скоро появятся.')}
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
      className={`tap-press group flex min-h-[56px] min-w-0 items-center gap-3 rounded-2xl bg-primary-700 p-3 text-white sm:gap-4 sm:p-4 shadow-sm ring-1 ring-primary-600 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:ring-primary-500/50 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${layout}`}
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
  const { t } = useI18n();
  return (
    <NavButton
      to={`${basePath}/${topic.slug}`}
      label={`${isNext ? t('Keyingi mavzu', 'Следующая тема') : t('Oldingi mavzu', 'Предыдущая тема')} · ${topicNumber(topic.number)}`}
      title={topic.title}
      icon={<ArrowRightIcon className={`h-4 w-4 transition-transform duration-300 ${isNext ? 'group-hover:translate-x-0.5' : 'rotate-180 group-hover:-translate-x-0.5'}`} />}
      align={isNext ? 'right' : 'left'}
    />
  );
}
