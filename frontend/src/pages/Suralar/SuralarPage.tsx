import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { Loading } from '../../components/common/Loading';
import { NumberBadge, SurahView } from '../../components/quran/SurahView';
import { useSavedList } from '../../components/quran/useSavedList';
import { useApi } from '../../hooks/useApi';
import { getSurah, getSurahs } from '../../services/quranService';
import type { SurahSummary } from '../../types/quran';

type Filter = 'all' | 'prayer' | 'zam' | 'memorized' | 'saved';
type Sort = 'order' | 'short' | 'long';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Barchasi' },
  { id: 'prayer', label: 'Namozda o‘qiladigan' },
  { id: 'zam', label: 'Zam suralar' },
  { id: 'memorized', label: 'Yodlanganlar' },
  { id: 'saved', label: 'Saqlanganlar' },
];

const SORT_OPTIONS: { id: Sort; label: string; shortLabel: string }[] = [
  { id: 'order', label: 'Sura tartibi (1–114)', shortLabel: 'Sura tartibi' },
  { id: 'short', label: 'Qisqasidan uzuniga', shortLabel: 'Qisqasidan' },
  { id: 'long', label: 'Uzunidan qisqasiga', shortLabel: 'Uzunidan' },
];

function SortPicker({ value, onChange }: { value: Sort; onChange: (value: Sort) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = SORT_OPTIONS.find((option) => option.id === value) ?? SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center gap-2 rounded-full border bg-white py-1.5 pl-1.5 pr-3 text-left shadow-sm transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:bg-neutral-800 ${open ? 'border-primary-400 ring-2 ring-primary-500/20 dark:border-primary-500' : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'}`}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-900 text-accent-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
            <path strokeLinecap="round" d="M7 5h10M9 10h6M11 15h2" />
          </svg>
        </span>
        <span className="max-w-[8.5rem] truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100 sm:max-w-none">{selected.shortLabel}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-4 w-4 text-neutral-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-[min(88vw,19rem)] origin-top-right rounded-3xl bg-primary-900/95 p-3 shadow-2xl shadow-black/40 ring-1 ring-white/15 backdrop-blur-md motion-safe:animate-fade-in">
          <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-white/50">Saralashni tanlang</p>
          <ul id={listId} role="listbox" aria-label="Saralash" className="space-y-1.5">
            {SORT_OPTIONS.map((option) => {
              const active = option.id === value;
              return (
                <li
                  key={option.id}
                  role="option"
                  aria-selected={active}
                  tabIndex={0}
                  onClick={() => { onChange(option.id); setOpen(false); }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onChange(option.id);
                      setOpen(false);
                    }
                  }}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-2xl px-3 py-2.5 outline-none ring-1 transition duration-200 focus-visible:ring-2 focus-visible:ring-accent-400 ${active ? 'bg-gradient-to-br from-accent-400 to-accent-500 text-primary-900 shadow-lg shadow-accent-500/20 ring-accent-400' : 'bg-white/[0.04] text-white ring-white/10 hover:bg-white/10 hover:ring-emerald-300/40'}`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-primary-900/15 text-primary-900' : 'bg-emerald-400/10 text-emerald-300'}`}>
                    {active ? '✓' : '↕'}
                  </span>
                  <span className="text-sm font-semibold">{option.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[‘’ʻʼ'`-]/g, '').replace(/\s+/g, ' ').trim();
}

export function SuralarPage() {
  const [params, setParams] = useSearchParams();
  const selected = Number(params.get('sura')) || null;
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('order');
  const [query, setQuery] = useState('');
  const saved = useSavedList('iymon-saved-surahs');
  const memorized = useSavedList('iymon-memorized-surahs');
  const detailRef = useRef<HTMLDivElement>(null);
  const list = useApi(() => getSurahs(), []);
  const detail = useApi(() => (selected ? getSurah(selected) : Promise.resolve(null)), [selected]);

  const surahs = useMemo(() => {
    let items: SurahSummary[] = list.data?.surahs ?? [];
    if (filter === 'prayer') items = items.filter((surah) => surah.in_prayer);
    if (filter === 'zam') items = items.filter((surah) => surah.is_zam);
    if (filter === 'saved') items = items.filter((surah) => saved.has(surah.number));
    if (filter === 'memorized') items = items.filter((surah) => memorized.has(surah.number));
    const search = normalize(query);
    if (search) items = items.filter((surah) => String(surah.number) === search || normalize(surah.name_uz).includes(search) || normalize(surah.name_simple).includes(search) || surah.name_arabic.includes(query.trim()));
    if (sort === 'short') items = [...items].sort((a, b) => a.verses_count - b.verses_count);
    if (sort === 'long') items = [...items].sort((a, b) => b.verses_count - a.verses_count);
    return items;
  }, [filter, list.data, memorized, query, saved, sort]);

  useEffect(() => {
    if (!selected && list.data && window.matchMedia('(min-width: 1024px)').matches) setParams({ sura: '1' }, { replace: true });
  }, [list.data, selected, setParams]);

  const choose = (number: number) => {
    setParams({ sura: String(number) });
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div
      className="mx-auto max-w-7xl select-none space-y-6 px-4 py-6 md:px-6"
      onCopy={(event) => event.preventDefault()}
      onCut={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <section className="relative overflow-hidden rounded-3xl bg-primary-900 text-white motion-safe:animate-fade-in-up">
        <div aria-hidden className="absolute inset-0 bg-cover bg-[position:70%_center] md:bg-right" style={{ backgroundImage: 'url(/images/suralar/hero.webp)' }} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/85 to-primary-900/10 md:via-primary-900/65" />
        <div className="relative px-5 py-8 md:px-10 md:py-12">
          <Breadcrumb items={[{ label: 'Bosh sahifa', to: '/' }, { label: 'Suralar va zam suralar' }]} />
          <h1 className="mt-4 font-display text-4xl font-extrabold md:text-5xl">Suralar va <span className="text-accent-400">zam suralar</span></h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-white/85">Qur’ondagi 114 surani o‘qing va ma’nolarini o‘rganing. Namozda o‘qiladigan qisqa suralar alohida jamlangan.</p>
          <label className="relative mt-5 block max-w-md">
            <span className="sr-only">Sura qidirish</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sura nomi yoki raqami bo‘yicha qidirish..." className="min-h-[3rem] w-full select-text rounded-2xl bg-white pl-11 pr-4 text-sm text-neutral-800 shadow-lg outline-none ring-1 ring-black/5 placeholder:text-neutral-400 focus:ring-2 focus:ring-accent-400" />
          </label>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5 dark:bg-neutral-900 dark:ring-white/10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div role="tablist" aria-label="Suralar filtri" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {FILTERS.map((item) => {
              const count = item.id === 'saved' ? saved.items.length : item.id === 'memorized' ? memorized.items.length : undefined;
              return (
                <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)} className={`min-h-[2.75rem] shrink-0 whitespace-nowrap rounded-2xl px-4 text-sm font-semibold ring-1 transition ${filter === item.id ? 'bg-primary-700 text-white ring-primary-700' : 'bg-white text-neutral-700 ring-black/10 hover:ring-primary-500/40 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-white/15'}`}>
                  {item.label}
                  {count !== undefined && count > 0 && <span className="ml-1.5 rounded-full bg-black/10 px-1.5 text-xs">{count}</span>}
                </button>
              );
            })}
          </div>
          <SortPicker value={sort} onChange={setSort} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)]">
          <div className={`min-w-0 ${selected ? 'hidden lg:block' : ''}`}>
            {list.loading && <Loading label="Suralar yuklanmoqda..." />}
            {list.error && <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{list.error}</p>}
            {list.data && surahs.length === 0 && (
              <p className="rounded-2xl bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:bg-white/5">
                {filter === 'saved' ? 'Hali sura saqlanmagan.' : filter === 'memorized' ? 'Hali yodlangan deb belgilangan sura yo‘q.' : 'Hech narsa topilmadi.'}
              </p>
            )}
            <ul className="-mx-1 space-y-2 px-1 py-1 lg:max-h-[48rem] lg:overflow-y-auto lg:pr-2" aria-label="Suralar ro‘yxati">
              {surahs.map((surah) => (
                <li key={surah.number}>
                  <button type="button" onClick={() => choose(surah.number)} aria-current={surah.number === selected ? 'true' : undefined} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 transition ${surah.number === selected ? 'bg-accent-100/60 ring-2 ring-accent-400 dark:bg-accent-500/10' : 'bg-white ring-black/5 hover:ring-primary-500/30 dark:bg-neutral-900 dark:ring-white/10'}`}>
                    <NumberBadge n={surah.number} />
                    <span className="min-w-0 flex-1"><span className="block font-display font-bold text-neutral-900 dark:text-white">{surah.name_uz}</span><span className="block truncate text-xs text-neutral-500">{surah.name_simple} · {surah.verses_count} oyat · {surah.revelation}</span></span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-quran text-lg text-primary-800 dark:text-accent-400" lang="ar" dir="rtl">{surah.name_arabic}</span>
                      <span className="flex gap-1">
                        {surah.is_zam && <span className="rounded-full bg-primary-50 px-1.5 text-[10px] font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-emerald-300">zam</span>}
                        {saved.has(surah.number) && <span className="text-[10px] text-accent-500" aria-label="saqlangan">●</span>}
                        {memorized.has(surah.number) && <span className="text-[10px] font-bold text-primary-600" aria-label="yodlangan">✓</span>}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div ref={detailRef} className={`scroll-mt-20 ${selected ? '' : 'hidden lg:block'}`}>
            {selected && <button type="button" onClick={() => setParams({})} className="mb-3 min-h-[2.75rem] rounded-xl px-2 text-sm font-semibold text-primary-700 lg:hidden dark:text-emerald-300">← Suralar ro‘yxatiga qaytish</button>}
            {detail.loading && <Loading label="Sura yuklanmoqda..." />}
            {detail.error && <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{detail.error}</p>}
            {!detail.loading && detail.data && <SurahView key={detail.data.number} surah={detail.data} saved={saved.has(detail.data.number)} memorized={memorized.has(detail.data.number)} onToggleSaved={() => saved.toggle(detail.data!.number)} onToggleMemorized={() => memorized.toggle(detail.data!.number)} />}
          </div>
        </div>

        <div className="mt-5 space-y-1 text-[11px] leading-relaxed text-neutral-400">
          <p>O‘zbekiston musulmonlari idorasi <a href="https://muslim.uz/uz" target="_blank" rel="noopener noreferrer" className="underline">rasmiy veb-portali</a> <a href="https://muslim.uz/uz/quran-app" target="_blank" rel="noopener noreferrer" className="underline">xabar beradi</a>.</p>
          <p>Qur’on matni: <a href="https://tanzil.net" target="_blank" rel="noopener noreferrer" className="underline">Tanzil Project</a> (CC BY 3.0). O‘zbekcha ma’no tarjimasi: Muhammad Sodiq Muhammad Yusuf (`uz.sodik`), notijoriy foydalanish uchun.</p>
        </div>
      </section>
    </div>
  );
}
