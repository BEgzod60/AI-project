import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { getLesson } from '../../services/learningService';
import type { Lesson, LessonStep, LessonTab, Recitation, StepImage } from '../../types/learning';
import { Loading } from '../../components/common/Loading';
import { ArrowRightIcon } from '../../components/common/Icons';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { AudioPlayer } from '../../components/learning/AudioPlayer';
import { ZamSuraPicker } from '../../components/learning/ZamSuraPicker';
import { CategoryIcon, RakatChips } from '../../components/learning/LessonCard';

type Tab = 'tartib' | LessonTab;
type Gender = 'erkak' | 'ayol';

const TABS: { id: Tab; label: string }[] = [
  { id: 'tartib', label: 'Namoz tartibi' },
  { id: 'malumot', label: "Ma'lumot" },
  { id: 'sunnat_farz', label: 'Sunnat va farz' },
  { id: 'vaqti', label: 'Vaqti' },
  { id: 'savol_javob', label: 'Savol-javob' },
];

const PENDING = 'Tekshirilmoqda';

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
  if (slug === 'nafl' || slug === 'hayit') return `${name} namozlari`;
  return `${name} namozi`;
}

export function LessonPage() {
  const { slug = '' } = useParams();
  const { data: lesson, loading, error, retry } = useApi(() => getLesson(slug), [slug]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      {loading && <Loading label="Dars yuklanmoqda..." />}
      {!loading && error && (
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 dark:bg-neutral-900">
          <p className="text-neutral-700 dark:text-neutral-200">{error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button type="button" onClick={retry} className="rounded-xl bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
              Qayta urinish
            </button>
            <Link to="/namoz-organish" className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white">
              Darslar ro‘yxati
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
  const step = steps[current];
  const percent = steps.length ? Math.round((done.length / steps.length) * 100) : 0;

  const goTo = (i: number) => {
    setCurrent(i);
    if (window.innerWidth < 1024) document.getElementById('dars-qadam')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const next = () => {
    if (!step) return;
    setDone((d) => (d.includes(step.order) ? d : [...d, step.order]));
    if (current < steps.length - 1) {
      goTo(current + 1);
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
        className="relative overflow-hidden rounded-3xl bg-primary-900 p-6 text-white motion-safe:animate-fade-in-up md:p-10"
        style={c.image ? { backgroundImage: `linear-gradient(to right, rgb(6 40 24) 35%, rgb(6 40 24 / 0.55)), url("${c.image}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <Breadcrumb items={[{ label: 'Bosh sahifa', to: '/' }, { label: 'Namoz o‘rganish', to: '/namoz-organish' }, { label: prayerTitle(slug, c.name) }]} />
        <div className="mt-5 flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/30 text-accent-400 ring-1 ring-accent-400/40">
            <CategoryIcon icon={c.icon} className="h-8 w-8" />
          </span>
          <h1 className="font-display text-3xl font-extrabold md:text-5xl">{prayerTitle(slug, c.name)}</h1>
        </div>
        {verified ? (
          <>
            <p className="mt-4 max-w-2xl text-white/85">{c.description}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-black/25 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[11px] text-accent-400">Rakatlar</p>
                <div className="mt-1"><RakatChips category={c} /></div>
              </div>
              {c.source_url && (
                <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-black/25 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm transition hover:ring-accent-400/60">
                  <p className="text-[11px] text-accent-400">Manba</p>
                  <p className="mt-1 text-sm font-semibold">muslim.uz ↗</p>
                </a>
              )}
              {steps.length > 0 && (
                <div className="min-w-[180px] rounded-2xl bg-black/25 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
                  <p className="text-[11px] text-accent-400">O‘rganish holati</p>
                  <p className="mt-1 text-sm font-semibold">{done.length} / {steps.length} qadam</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-accent-400 transition-all duration-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="mt-4 inline-block rounded-full bg-amber-400/15 px-3 py-1.5 text-sm font-semibold text-amber-200 ring-1 ring-amber-300/40">
            {PENDING} — ma‘lumot hali tasdiqlanmagan
          </p>
        )}
      </section>

      {/* ===== Tablar ===== */}
      <div role="tablist" aria-label="Dars bo‘limlari" className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.id
                ? 'bg-primary-600 text-white shadow'
                : 'bg-white text-neutral-700 ring-1 ring-black/5 hover:bg-primary-50 dark:bg-neutral-900 dark:text-neutral-300 dark:ring-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 motion-safe:animate-fade-in" key={tab} role="tabpanel">
        {tab === 'tartib' ? (
          steps.length === 0 ? (
            <Pending text="Bu namozning bosqichma-bosqich tartibi manba bilan tekshirilmoqda." />
          ) : (
            <>
              {hasFemale && (
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">Ko‘rsatmalar:</span>
                  <div className="flex rounded-xl bg-white p-1 ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10" role="group" aria-label="Erkak yoki ayol uchun">
                    {(['erkak', 'ayol'] as Gender[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        aria-pressed={gender === g}
                        onClick={() => setGender(g)}
                        className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${gender === g ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10'}`}
                      >
                        {g === 'erkak' ? 'Erkaklar' : 'Ayollar'}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-neutral-500">Farqlar faqat manbada ko‘rsatilgan qadamlarda chiqadi.</span>
                </div>
              )}
              <div id="dars-menyu" className="scroll-mt-24">
                {finished && (
                  <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl bg-primary-600 px-4 py-3 text-white shadow motion-safe:animate-fade-in">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 font-bold">✓</span>
                    <p className="flex-1 text-sm font-semibold">
                      Barcha {steps.length} ta qadam o‘rganildi. Takrorlash uchun istalgan qadamni tanlang.
                    </p>
                    <button type="button" onClick={() => setFinished(false)} aria-label="Xabarni yopish" className="rounded-lg px-2 py-1 text-white/80 hover:bg-white/15">✕</button>
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
                    onPrev={() => goTo(Math.max(0, current - 1))}
                    onNext={next}
                    isDone={!!step && done.includes(step.order)}
                  />
                  <RecitationPanel step={step} lesson={lesson} zam={zam} onZam={setZam} />
                </div>
              </div>
              {done.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm('O‘rganish holati tozalansinmi? Belgilangan qadamlar o‘chiriladi.')) return;
                    setDone([]);
                    setCurrent(0);
                    setFinished(false);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-50 hover:ring-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:bg-neutral-900 dark:text-rose-300 dark:ring-rose-500/30 dark:hover:bg-rose-500/10"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />
                  </svg>
                  O‘rganish holatini tozalash
                </button>
              )}
            </>
          )
        ) : (
          <NotesTab notes={lesson.notes[tab]} />
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          to="/namoz-organish"
          className="group inline-flex items-center gap-3 rounded-2xl bg-primary-700 px-6 py-3.5 text-sm font-bold text-white shadow-sm ring-1 ring-primary-600 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-primary-800 hover:shadow-lg hover:ring-primary-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-primary-600 group-hover:text-white">
            <ArrowRightIcon className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-0.5" />
          </span>
          Namoz o‘rganish bo‘limiga qaytish
        </Link>
      </div>
    </>
  );
}

function Pending({ text }: { text: string }) {
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
      <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">{PENDING}</span>
      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{text}</p>
    </div>
  );
}

function SourceLink({ title, url }: { title: string; url: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 underline decoration-neutral-300 underline-offset-2 hover:text-primary-600">
      Manba: {title || url}
    </a>
  );
}

function StepList({ steps, current, done, onSelect }: { steps: LessonStep[]; current: number; done: number[]; onSelect: (i: number) => void }) {
  return (
    <nav aria-label="Namozning ketma-ketligi" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
      <h2 className="px-1 font-display font-bold text-neutral-900 dark:text-white">Namozning ketma-ketligi</h2>
      <ol className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible">
        {steps.map((s, i) => {
          const active = i === current;
          const isDone = done.includes(s.order);
          return (
            <li key={s.order} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={active ? 'step' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition ${
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
  isDone: boolean;
}

function StepDetail({ step, index, total, image, gender, onPrev, onNext, isDone }: StepDetailProps) {
  if (!step) return null;
  const showFemale = gender === 'ayol' && step.text_female;
  // Ayollar bo'limida — ayollar rasmlari; ayollar varianti yo'q rasm (masalan, duo) ko'rsatilmaydi
  const stepImages =
    gender === 'ayol'
      ? (step.images ?? []).filter((img) => img.src_female).map((img) => ({ ...img, src: img.src_female! }))
      : step.images ?? [];
  return (
    <article id="dars-qadam" className="scroll-mt-24 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
      <header className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white tabular-nums">{index + 1}</span>
        <h2 className="font-display text-xl font-bold text-neutral-900 sm:text-2xl dark:text-white">{step.title}</h2>
        {isDone && <span className="ml-auto rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-emerald-300">O‘rganildi</span>}
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

      <p className="mt-4 max-w-prose text-[17px] leading-8 text-neutral-800 sm:text-lg dark:text-neutral-200">{step.text}</p>

      {showFemale && (
        <div className="mt-4 rounded-2xl border-l-4 border-accent-400 bg-accent-100/60 p-4 dark:bg-accent-500/10">
          <p className="text-xs font-bold uppercase tracking-wide text-accent-500">Ayollar uchun farq</p>
          <p className="mt-1.5 text-base leading-7 text-neutral-800 sm:text-[17px] dark:text-neutral-200">{step.text_female}</p>
          <div className="mt-2"><SourceLink title="muslim.uz" url={step.female_source_url} /></div>
        </div>
      )}

      <div className="mt-3"><SourceLink title={step.source_title} url={step.source_url} /></div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          aria-label="Oldingi qadam"
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold sm:px-4 text-neutral-700 ring-1 ring-black/10 transition hover:bg-neutral-50 disabled:opacity-40 dark:text-neutral-300 dark:ring-white/15 dark:hover:bg-white/5"
        >
          {/* Juda tor ekranda faqat strelka — "Yakunlash" bilan bir qatorga sig'ishi uchun */}
          <ArrowRightIcon className="h-4 w-4 rotate-180" /> <span className="hidden min-[360px]:inline">Oldingi</span>
        </button>
        <span className="whitespace-nowrap text-xs tabular-nums text-neutral-500">{index + 1} / {total}</span>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-primary-700 sm:px-5"
        >
          {index === total - 1 ? 'Yakunlash' : 'Keyingi'} <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

/** Qadam rasmlari: katta asosiy rasm va (bir nechta bo'lsa) harakatlar ketma-ketligi */
function StepGallery({ images, title }: { images: StepImage[]; title: string }) {
  const [active, setActive] = useState(0);
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
          className="aspect-[3/2] w-full object-cover motion-safe:animate-fade-in"
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
        <div role="tablist" aria-label="Harakatlar ketma-ketligi" className="mt-2 flex gap-2 overflow-x-auto pb-1">
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
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 dark:bg-neutral-800/60 dark:ring-white/10">
      <h3 className="font-display font-bold text-neutral-900 dark:text-white">{r.name}</h3>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">O‘qilishi</p>
      <p className="mt-1 whitespace-pre-line text-base leading-7 text-neutral-800 dark:text-neutral-200">{r.transliteration}</p>
      {r.meaning && (
        <>
          <button
            type="button"
            onClick={() => setShowMeaning((v) => !v)}
            aria-expanded={showMeaning}
            className="mt-2 text-xs font-semibold text-primary-700 hover:underline dark:text-emerald-300"
          >
            {showMeaning ? 'Ma’nosini yashirish' : 'Ma’nosi'}
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

  return (
    <aside className="space-y-3 rounded-3xl bg-primary-900/[0.03] p-4 ring-1 ring-black/5 dark:bg-white/[0.03] dark:ring-white/10" aria-label="O‘qiladigan sura va duolar">
      <h2 className="font-display font-bold text-neutral-900 dark:text-white">O‘qiladigan sura va duolar</h2>
      {items.length === 0 && !step.zam_sura_choice && (
        <p className="text-sm text-neutral-500">Bu qadamda alohida sura yoki duo ko‘rsatilmagan.</p>
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
  if (!notes.length) return <Pending text="Bu bo‘lim bo‘yicha tasdiqlangan ma‘lumot hali joylanmagan." />;
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
