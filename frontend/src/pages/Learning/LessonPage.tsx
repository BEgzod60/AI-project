import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { getLesson } from '../../services/learningService';
import type { Lesson, LessonStep, LessonTab, Recitation, StepImage } from '../../types/learning';
import { Loading } from '../../components/common/Loading';
import { ArrowRightIcon } from '../../components/common/Icons';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { AudioPlayer } from '../../components/learning/AudioPlayer';
import { ZamSuraPicker } from '../../components/learning/ZamSuraPicker';
import { CategoryIcon, RakatChips } from '../../components/learning/LessonCard';
import { BirgaModeCards, type BirgaMode } from '../../components/birga/BirgaModeCards';
import { ContentLanguageNote } from '../../components/common/ContentLanguageNote';
import { getLang, useI18n } from '../../i18n';
import { prayerTitle as titleFor } from '../../utils/prayerNames';

// «Birga o'qish / takrorlash» rejimlari faqat ochilganda yuklanadi
const BirgaModeView = lazy(() => import('../../components/birga/BirgaModeView'));
const MODES: BirgaMode[] = ['birga-oqish', 'birga-takrorlash'];

type Tab = 'tartib' | LessonTab;
type Gender = 'erkak' | 'ayol';

const TABS: { id: Tab; label: [string, string] }[] = [
  { id: 'tartib', label: ['Namoz tartibi', 'Порядок намаза'] },
  { id: 'malumot', label: ['Ma’lumot', 'Сведения'] },
  { id: 'sunnat_farz', label: ['Sunnat va farz', 'Сунна и фард'] },
  { id: 'vaqti', label: ['Vaqti', 'Время'] },
  { id: 'savol_javob', label: ['Savol-javob', 'Вопросы и ответы'] },
];

const PENDING: [string, string] = ['Tekshirilmoqda', 'На проверке'];

/** O'rganish holati — faqat shu brauzerda (login yo'q) */
interface Progress {
  done: number[];
  current: number;
  gender: Gender;
  zam: string;
}

function storageKey(slug: string) {
  return `iymon-lesson:${slug}`;
}

function loadProgress(slug: string): Partial<Progress> {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(slug)) ?? '{}') as Partial<Progress>;
  } catch {
    return {};
  }
}

function saveProgress(slug: string, p: Progress) {
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(p));
  } catch {
    /* saqlab bo'lmasa — sahifa baribir ishlaydi */
  }
}

function prayerTitle(slug: string, name: string) {
  return titleFor(slug, name, getLang());
}

export function LessonPage() {
  const { slug = '' } = useParams();
  const { data: lesson, loading, error, retry } = useApi(() => getLesson(slug), [slug]);
  const { t } = useI18n();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  return (
    <div className="page">
      {loading && <Loading label={t('Dars yuklanmoqda...', 'Загрузка урока...')} />}
      {!loading && error && (
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 dark:bg-neutral-900">
          <p className="text-neutral-700 dark:text-neutral-200">{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button type="button" onClick={retry} className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
              {t('Qayta urinish', 'Повторить')}
            </button>
            <Link to="/namoz-organish" className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white">
              {t('Darslar ro‘yxati', 'Список уроков')}
            </Link>
          </div>
        </div>
      )}
      {!loading && !error && lesson && <LessonView key={slug} slug={slug} lesson={lesson} />}
    </div>
  );
}

function LessonView({ slug, lesson }: { slug: string; lesson: Lesson }) {
  const c = lesson.category;
  const { t } = useI18n();
  const verified = c.review_status === 'published';
  const steps = lesson.steps;
  const hasFemale = steps.some((s) => s.text_female);

  const saved = useMemo(() => loadProgress(slug), [slug]);
  const [tab, setTab] = useState<Tab>('tartib');
  const [current, setCurrent] = useState(() => Math.min(saved.current ?? 0, Math.max(steps.length - 1, 0)));
  const [done, setDone] = useState<number[]>(() => (saved.done ?? []).filter((o) => steps.some((s) => s.order === o)));
  const [gender, setGender] = useState<Gender>(saved.gender === 'ayol' && hasFemale ? 'ayol' : 'erkak');
  const [zam, setZam] = useState(() =>
    saved.zam && lesson.zam_suras.includes(saved.zam) ? saved.zam : lesson.zam_suras.includes('ixlos') ? 'ixlos' : lesson.zam_suras[0] ?? '',
  );

  useEffect(() => {
    saveProgress(slug, { done, current, gender, zam });
  }, [slug, done, current, gender, zam]);

  const [finished, setFinished] = useState(false);
  const [params, setParams] = useSearchParams();
  const modeParam = params.get('rejim') as BirgaMode | null;
  const mode = lesson.birga_supported && modeParam && MODES.includes(modeParam) ? modeParam : null;
  const openMode = (m: BirgaMode) => setParams({ rejim: m });
  const closeMode = () => setParams({});
  const step = steps[current];
  const percent = steps.length ? Math.round((done.length / steps.length) * 100) : 0;

  // Ro'yxatdan tanlanganda (telefonda) — qadam kartasiga o'tiladi
  const goTo = (i: number) => {
    setCurrent(i);
    if (window.innerWidth < 1024) document.getElementById('dars-qadam')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // «Oldingi/Keyingi» bosilganda ekran surilmaydi: tugmalar qatori barmoq ostida o'z joyida qoladi
  // (qadamlar matni uzun-qisqa bo'lgani uchun sahifa shu farqqa to'g'rilanadi)
  const navRef = useRef<HTMLDivElement>(null);
  const navTop = useRef<number | null>(null);
  const stepInPlace = (i: number) => {
    navTop.current = navRef.current?.getBoundingClientRect().top ?? null;
    setCurrent(i);
  };
  useLayoutEffect(() => {
    const before = navTop.current;
    navTop.current = null;
    if (before === null || !navRef.current) return;
    const shift = navRef.current.getBoundingClientRect().top - before;
    if (Math.abs(shift) > 0.5) window.scrollBy({ top: shift, behavior: 'instant' });
  }, [current]);

  const next = () => {
    if (!step) return;
    setDone((d) => (d.includes(step.order) ? d : [...d, step.order]));
    if (current < steps.length - 1) {
      stepInPlace(current + 1);
      return;
    }
    // Yakunlash — qadamlar menyusiga qaytamiz
    setFinished(true);
    setCurrent(0);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() =>
      document.getElementById('dars-menyu')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }),
    );
  };

  return (
    <>
      {/* ===== Hero ===== */}
      <section
        className="hero p-4 motion-safe:animate-fade-in-up sm:p-6 md:p-10"
        style={c.image ? { backgroundImage: `linear-gradient(to right, rgb(6 40 24) 35%, rgb(6 40 24 / 0.55)), url("${c.image}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <Breadcrumb items={[{ label: t('Bosh sahifa', 'Главная'), to: '/' }, { label: t('Namoz o‘rganish', 'Обучение намазу'), to: '/namoz-organish' }, { label: prayerTitle(slug, c.name) }]} />
        <div className="mt-3 flex items-center gap-3 md:mt-5 md:gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/30 md:h-14 md:w-14 md:rounded-2xl text-accent-400 ring-1 ring-accent-400/40">
            <CategoryIcon icon={c.icon} className="h-6 w-6 md:h-8 md:w-8" />
          </span>
          <h1 className="font-display text-2xl font-extrabold sm:text-3xl md:text-5xl">{prayerTitle(slug, c.name)}</h1>
        </div>
        {verified ? (
          <>
            <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base md:mt-4">{c.description}</p>
            {/* Telefonda: rakatlar — butun kenglikda, manba va holat — yonma-yon */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3 md:mt-5">
              <div className="col-span-2 rounded-2xl bg-black/25 px-3 py-2 ring-1 sm:px-4 sm:py-3 ring-white/15 backdrop-blur-sm">
                <p className="text-[11px] text-accent-400">{t('Rakatlar', 'Ракааты')}</p>
                <div className="mt-1"><RakatChips category={c} /></div>
              </div>
              {c.source_url && (
                <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-black/25 px-3 py-2 ring-1 sm:px-4 sm:py-3 ring-white/15 backdrop-blur-sm transition hover:ring-accent-400/60">
                  <p className="text-[11px] text-accent-400">{t('Manba', 'Источник')}</p>
                  <p className="mt-1 text-sm font-semibold">muslim.uz ↗</p>
                </a>
              )}
              {steps.length > 0 && (
                <div className="min-w-0 rounded-2xl bg-black/25 px-3 py-2 ring-1 sm:min-w-[180px] sm:px-4 sm:py-3 ring-white/15 backdrop-blur-sm">
                  <p className="text-[11px] text-accent-400">{t('O‘rganish holati', 'Прогресс')}</p>
                  <p className="mt-1 text-sm font-semibold">{done.length} / {steps.length} {t('qadam', 'шагов')}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-accent-400 transition-all duration-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="mt-4 inline-block rounded-full bg-amber-400/15 px-3 py-1.5 text-sm font-semibold text-amber-200 ring-1 ring-amber-300/40">
            {t(...PENDING)} — {t('ma’lumot hali tasdiqlanmagan', 'данные ещё не подтверждены')}
          </p>
        )}
      </section>

      <ContentLanguageNote className="mt-3 md:mt-4" />
      {verified && lesson.birga_supported && !mode && <BirgaModeCards onOpen={openMode} />}

      {mode ? (
        <div className="mt-4 md:mt-6">
          <Suspense fallback={<Loading label="Rejim yuklanmoqda..." />}>
            <BirgaModeView slug={slug} mode={mode} lesson={lesson} gender={gender} zam={zam} onExit={closeMode} />
          </Suspense>
        </div>
      ) : (
      <>
      {/* ===== Tablar ===== */}
      <div role="tablist" aria-label={t('Dars bo‘limlari', 'Разделы урока')} className="snap-row mt-3 flex gap-2 overflow-x-auto pb-1 md:mt-6">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            type="button"
            role="tab"
            aria-selected={tab === tb.id}
            onClick={() => setTab(tb.id)}
            className={`min-h-[44px] shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition lg:min-h-0 ${
              tab === tb.id
                ? 'bg-primary-600 text-white shadow'
                : 'bg-white text-neutral-700 ring-1 ring-black/5 hover:bg-primary-50 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-white/10'
            }`}
          >
            {t(...tb.label)}
          </button>
        ))}
      </div>

      <div className="mt-3 motion-safe:animate-fade-in md:mt-4" key={tab} role="tabpanel">
        {tab === 'tartib' ? (
          steps.length === 0 ? (
            <Pending text={t('Bu namozning bosqichma-bosqich tartibi manba bilan tekshirilmoqda.', 'Пошаговый порядок этого намаза проверяется по источнику.')} />
          ) : (
            <>
              {hasFemale && (
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">{t('Ko‘rsatmalar:', 'Инструкции:')}</span>
                  <div className="flex rounded-xl bg-white p-1 ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10" role="group" aria-label={t('Erkak yoki ayol uchun', 'Для мужчин или женщин')}>
                    {(['erkak', 'ayol'] as Gender[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        aria-pressed={gender === g}
                        onClick={() => setGender(g)}
                        className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${gender === g ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10'}`}
                      >
                        {g === 'erkak' ? t('Erkaklar', 'Мужчины') : t('Ayollar', 'Женщины')}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-neutral-500">{t('Farqlar faqat manbada ko‘rsatilgan qadamlarda chiqadi.', 'Различия показаны только там, где они указаны в источнике.')}</span>
                </div>
              )}
              <div id="dars-menyu" className="scroll-mt-24">
                {finished && (
                  <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl bg-primary-600 px-4 py-3 text-white shadow motion-safe:animate-fade-in">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 font-bold">✓</span>
                    <p className="flex-1 text-sm font-semibold">
                      {t(`Barcha ${steps.length} ta qadam o‘rganildi. Takrorlash uchun istalgan qadamni tanlang.`, `Все ${steps.length} шагов изучены. Выберите любой шаг для повторения.`)}
                    </p>
                    <button type="button" onClick={() => setFinished(false)} aria-label={t('Xabarni yopish', 'Закрыть сообщение')} className="rounded-lg px-2 py-1 text-white/80 hover:bg-white/15">✕</button>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[250px_minmax(0,1fr)_340px]">
                  <StepList steps={steps} current={current} done={done} onSelect={goTo} />
                  <StepDetail
                    step={step}
                    index={current}
                    total={steps.length}
                    image={c.image}
                    gender={gender}
                    onPrev={() => stepInPlace(Math.max(0, current - 1))}
                    onNext={next}
                    navRef={navRef}
                    isDone={!!step && done.includes(step.order)}
                  />
                  <RecitationPanel step={step} lesson={lesson} zam={zam} onZam={setZam} />
                </div>
              </div>
              {done.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(t('O‘rganish holati tozalansinmi? Belgilangan qadamlar o‘chiriladi.', 'Сбросить прогресс? Отмеченные шаги будут очищены.'))) return;
                    setDone([]);
                    setCurrent(0);
                    setFinished(false);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-50 hover:ring-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:bg-neutral-900 dark:text-rose-300 dark:ring-rose-500/30 dark:hover:bg-rose-500/10"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />
                  </svg>
                  {t('O‘rganish holatini tozalash', 'Сбросить прогресс')}
                </button>
              )}
            </>
          )
        ) : (
          <NotesTab notes={lesson.notes[tab]} />
        )}
      </div>
      </>
      )}

      <div className="mt-4 flex justify-center md:mt-8">
        <Link
          to="/namoz-organish"
          className="group inline-flex items-center gap-3 rounded-2xl bg-primary-700 px-6 py-3.5 text-sm font-bold text-white shadow-sm ring-1 ring-primary-600 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-primary-800 hover:shadow-lg hover:ring-primary-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-primary-600 group-hover:text-white">
            <ArrowRightIcon className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-0.5" />
          </span>
          {t('Namoz o‘rganish bo‘limiga qaytish', 'Назад к разделу «Обучение намазу»')}
        </Link>
      </div>
    </>
  );
}

function Pending({ text }: { text: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
      <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">{t(...PENDING)}</span>
      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{text}</p>
    </div>
  );
}

function SourceLink({ title, url }: { title: string; url: string }) {
  const { t } = useI18n();
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 underline decoration-neutral-300 underline-offset-2 hover:text-primary-600">
      {t('Manba', 'Источник')}: {title || url}
    </a>
  );
}

function StepList({ steps, current, done, onSelect }: { steps: LessonStep[]; current: number; done: number[]; onSelect: (i: number) => void }) {
  const { t } = useI18n();
  return (
    <nav aria-label={t('Namozning ketma-ketligi', 'Последовательность намаза')} className="rounded-2xl bg-white p-3 shadow-sm sm:p-4 lg:rounded-3xl ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
      <h2 className="px-1 font-display text-[15px] font-bold text-neutral-900 lg:text-base dark:text-white">{t('Namozning ketma-ketligi', 'Последовательность намаза')}</h2>
      <ol className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:mt-3 lg:flex-col lg:gap-1 lg:overflow-visible">
        {steps.map((s, i) => {
          const active = i === current;
          const isDone = done.includes(s.order);
          return (
            <li key={s.order} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={active ? 'step' : undefined}
                className={`flex min-h-[44px] w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition lg:min-h-0 lg:gap-3 ${
                  active ? 'bg-primary-600 font-semibold text-white shadow' : 'text-neutral-700 hover:bg-primary-50 dark:text-neutral-300 dark:hover:bg-white/5'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                    active ? 'bg-white text-primary-700' : isDone ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-emerald-300' : 'ring-1 ring-neutral-300 dark:ring-neutral-600'
                  }`}
                >
                  {isDone && !active ? '✓' : i + 1}
                </span>
                <span className="whitespace-nowrap lg:whitespace-normal">{s.title}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface StepDetailProps {
  step: LessonStep | undefined;
  index: number;
  total: number;
  image: string;
  gender: Gender;
  onPrev: () => void;
  onNext: () => void;
  navRef: RefObject<HTMLDivElement>;
  isDone: boolean;
}

function StepDetail({ step, index, total, image, gender, onPrev, onNext, navRef, isDone }: StepDetailProps) {
  const { t } = useI18n();
  if (!step) return null;
  const showFemale = gender === 'ayol' && step.text_female;
  // Ayollar bo'limida — ayollar rasmlari; ayollar varianti yo'q rasm (masalan, duo) ko'rsatilmaydi
  const stepImages =
    gender === 'ayol'
      ? (step.images ?? []).filter((img) => img.src_female).map((img) => ({ ...img, src: img.src_female! }))
      : step.images ?? [];
  return (
    <article id="dars-qadam" className="scroll-mt-20 rounded-2xl bg-white p-4 shadow-sm sm:p-5 lg:scroll-mt-24 lg:rounded-3xl ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
      <header className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white tabular-nums">{index + 1}</span>
        <h2 className="font-display text-lg font-bold text-neutral-900 sm:text-2xl dark:text-white">{step.title}</h2>
        {isDone && <span className="ml-auto rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-emerald-300">{t('O‘rganildi', 'Изучено')}</span>}
      </header>

      {stepImages.length ? (
        // key — qadam yoki jins almashganda tanlangan rasm birinchisiga qaytadi
        <StepGallery key={`${step.order}-${gender}`} images={stepImages} title={`${index + 1}. ${step.title}`} />
      ) : (
        image && (
          <div
            aria-hidden
            className="mt-4 flex h-40 items-end overflow-hidden rounded-2xl bg-cover bg-center p-4 sm:h-52"
            style={{ backgroundImage: `linear-gradient(to top, rgb(6 40 24 / 0.85), rgb(6 40 24 / 0.1)), url("${image}")` }}
          >
            <p className="font-display text-lg font-bold text-white">{index + 1}. {step.title}</p>
          </div>
        )
      )}

      <p className="mt-3 max-w-prose text-[15px] leading-7 text-neutral-800 sm:mt-4 sm:text-lg dark:text-neutral-200">{step.text}</p>

      {showFemale && (
        <div className="mt-4 rounded-2xl border-l-4 border-accent-400 bg-accent-100/60 p-4 dark:bg-accent-500/10">
          <p className="text-xs font-bold uppercase tracking-wide text-accent-500">{t('Ayollar uchun farq', 'Отличие для женщин')}</p>
          <p className="mt-1.5 text-base leading-7 text-neutral-800 sm:text-[17px] dark:text-neutral-200">{step.text_female}</p>
          <div className="mt-2"><SourceLink title="muslim.uz" url={step.female_source_url} /></div>
        </div>
      )}

      <div className="mt-3"><SourceLink title={step.source_title} url={step.source_url} /></div>

      {/* Joyni o'lchash uchun belgi: yopishgan (sticky) tugmalar emas, ularning oqimdagi o'rni */}
      <div ref={navRef} aria-hidden className="h-0" />
      {/* Telefonda «Oldingi/Keyingi» qadam kartasi ichida pastga yopishib turadi (pastki menyu ustida) — doim qo'l ostida */}
      <div
        className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-4 flex items-center justify-between gap-3 border-t border-neutral-100 bg-white/95 px-4 py-2.5 backdrop-blur sm:-mx-5 sm:px-5 lg:static lg:mx-0 lg:mt-5 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none dark:border-neutral-800 dark:bg-neutral-900/95 lg:dark:bg-transparent"
      >
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          aria-label={t('Oldingi qadam', 'Предыдущий шаг')}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold sm:px-4 lg:min-h-0 text-neutral-700 ring-1 ring-black/10 transition hover:bg-neutral-50 disabled:opacity-40 dark:text-neutral-300 dark:ring-white/15 dark:hover:bg-white/5"
        >
          {/* Juda tor ekranda faqat strelka — "Yakunlash" bilan bir qatorga sig'ishi uchun */}
          <ArrowRightIcon className="h-4 w-4 rotate-180" /> <span className="hidden min-[360px]:inline">{t('Oldingi', 'Назад')}</span>
        </button>
        <span className="whitespace-nowrap text-xs tabular-nums text-neutral-500">{index + 1} / {total}</span>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow lg:min-h-0 transition hover:bg-primary-700 sm:px-5"
        >
          {index === total - 1 ? t('Yakunlash', 'Завершить') : t('Keyingi', 'Далее')} <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

/** Qadam rasmlari: katta asosiy rasm va (bir nechta bo'lsa) harakatlar ketma-ketligi */
function StepGallery({ images, title }: { images: StepImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const { t } = useI18n();
  const current = images[active] ?? images[0];
  const many = images.length > 1;

  return (
    <figure className="mt-4">
      <div className="relative overflow-hidden rounded-2xl bg-primary-900">
        <img
          key={current.src}
          src={current.src}
          alt={`${title}: ${current.caption}`}
          width={1264}
          height={843}
          className="aspect-[3/2] w-full object-cover motion-safe:animate-fade-in max-lg:max-h-[42svh]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-2/5 bg-gradient-to-t from-primary-900/90 to-transparent sm:block" />
        <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-end gap-3 p-3 sm:justify-between sm:p-4">
          {/* Telefonda sarlavha rasm ustida takrorlanmaydi — u tepada yozilgan, rasm to'liq ko'rinsin */}
          <span className="hidden font-display text-xl font-bold leading-tight text-white drop-shadow sm:block">{title}</span>
          {many && (
            <span className="shrink-0 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              {current.caption} · {active + 1}/{images.length}
            </span>
          )}
        </figcaption>
      </div>

      {many && (
        <div role="tablist" aria-label={t('Harakatlar ketma-ketligi', 'Последовательность движений')} className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => {
            const selected = i === active;
            return (
              <button
                key={img.src}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(i)}
                className={`group w-24 shrink-0 overflow-hidden rounded-xl text-left ring-2 transition duration-200 focus-visible:outline-none focus-visible:ring-primary-500 sm:w-28 ${
                  selected ? 'ring-accent-400' : 'ring-transparent opacity-75 hover:opacity-100'
                }`}
              >
                <img src={img.src} alt="" loading="lazy" className="aspect-[3/2] w-full object-cover" />
                <span
                  className={`line-clamp-2 min-h-[2.6em] px-2 py-1 text-[11px] font-semibold leading-tight ${
                    selected ? 'bg-accent-400 text-primary-900' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                  }`}
                >
                  {i + 1}. {img.caption}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </figure>
  );
}

function RecitationCard({ r }: { r: Recitation }) {
  const [showMeaning, setShowMeaning] = useState(false);
  const { t } = useI18n();
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 dark:bg-neutral-800/60 dark:ring-white/10">
      <h3 className="font-display font-bold text-neutral-900 dark:text-white">{r.name}</h3>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{t('O‘qilishi', 'Чтение')}</p>
      <p className="mt-1 whitespace-pre-line text-base leading-7 text-neutral-800 dark:text-neutral-200">{r.transliteration}</p>
      {r.meaning && (
        <>
          <button
            type="button"
            onClick={() => setShowMeaning((v) => !v)}
            aria-expanded={showMeaning}
            className="mt-2 text-xs font-semibold text-primary-700 hover:underline dark:text-emerald-300"
          >
            {showMeaning ? t('Ma’nosini yashirish', 'Скрыть смысл') : t('Ma’nosi', 'Смысл')}
          </button>
          {showMeaning && <p className="mt-1 whitespace-pre-line rounded-xl bg-primary-50 p-3 text-[15px] leading-7 text-neutral-700 dark:bg-primary-900/30 dark:text-neutral-300">{r.meaning}</p>}
        </>
      )}
      <div className="mt-3"><AudioPlayer audio={r.audio} label={r.name} reference={r.audio_reference} /></div>
      <div className="mt-2"><SourceLink title="muslim.uz" url={r.source_url} /></div>
    </div>
  );
}

function RecitationPanel({ step, lesson, zam, onZam }: { step: LessonStep | undefined; lesson: Lesson; zam: string; onZam: (s: string) => void }) {
  if (!step) return null;
  const items = step.recitations.map((s) => lesson.recitations[s]).filter(Boolean);
  const zamRec = step.zam_sura_choice ? lesson.recitations[zam] : undefined;
  const { t } = useI18n();

  return (
    <aside className="space-y-3 rounded-3xl bg-primary-900/[0.03] p-4 ring-1 ring-black/5 dark:bg-white/[0.03] dark:ring-white/10" aria-label={t('O‘qiladigan sura va duolar', 'Читаемые суры и дуа')}>
      <h2 className="font-display font-bold text-neutral-900 dark:text-white">{t('O‘qiladigan sura va duolar', 'Читаемые суры и дуа')}</h2>
      {items.length === 0 && !step.zam_sura_choice && (
        <p className="text-sm text-neutral-500">{t('Bu qadamda alohida sura yoki duo ko‘rsatilmagan.', 'На этом шаге отдельная сура или дуа не указаны.')}</p>
      )}
      {items.map((r) => <RecitationCard key={r.slug} r={r} />)}
      {step.zam_sura_choice && lesson.zam_suras.length > 0 && (
        <div className="space-y-2">
          <ZamSuraPicker
            options={lesson.zam_suras.map((s) => lesson.recitations[s]).filter(Boolean)}
            value={zam}
            onChange={onZam}
          />
          {zamRec && <RecitationCard key={zamRec.slug} r={zamRec} />}
        </div>
      )}
    </aside>
  );
}

function NotesTab({ notes }: { notes: Lesson['notes'][LessonTab] }) {
  const { t } = useI18n();
  if (!notes.length) return <Pending text={t('Bu bo‘lim bo‘yicha tasdiqlangan ma’lumot hali joylanmagan.', 'Проверенные материалы по этому разделу ещё не опубликованы.')} />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {notes.map((n, i) => (
        <article key={i} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
          <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-white">{n.title}</h3>
          <p className="mt-2 text-base leading-7 text-neutral-800 sm:text-[17px] sm:leading-8 dark:text-neutral-200">{n.text}</p>
          <div className="mt-3"><SourceLink title={n.source_title} url={n.source_url} /></div>
        </article>
      ))}
    </div>
  );
}
