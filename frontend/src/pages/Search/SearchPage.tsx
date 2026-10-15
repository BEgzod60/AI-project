import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { SEARCH_PAGES, resultHref, searchContent } from '../../services/searchService';
import type { SearchResponse } from '../../types/search';
import { Loading } from '../../components/common/Loading';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { TopicIconSvg } from '../../components/namoz/NamozIcons';
import { Highlight, normalizeSearch } from '../../components/search/Highlight';

const EMPTY: SearchResponse = { query: '', terms: [], results: [] };
const CATEGORY_LABEL = { namoz: 'Namoz', iymon: 'Iymon' } as const;

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const [draft, setDraft] = useState(q);
  // Header'dan yangi qidiruv qilinganda maydon ham yangilansin
  useEffect(() => setDraft(q), [q]);
  const { data, loading, error, retry } = useApi(
    () => (q.length >= 2 ? searchContent(q) : Promise.resolve(EMPTY)),
    [q],
  );
  const pages = q.length >= 2
    ? SEARCH_PAGES.filter((p) => normalizeSearch(`${p.label} ${p.keywords}`).includes(normalizeSearch(q)))
    : [];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    setParams(value ? { q: value } : {});
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <section className="rounded-3xl bg-primary-900 p-6 text-white motion-safe:animate-fade-in-up md:p-8">
        <Breadcrumb items={[{ label: 'Bosh sahifa', to: '/' }, { label: 'Qidiruv' }]} />
        <h1 className="mt-4 font-display text-3xl font-extrabold">Qidiruv</h1>
        <form onSubmit={submit} role="search" className="mt-4 flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Qidiruv so‘zi</span>
            <input
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus={!q}
              placeholder="Masalan: tahorat, g‘usl farzlari, qadar…"
              className="w-full rounded-2xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/20 placeholder:text-white/50 focus:ring-2 focus:ring-accent-400"
            />
          </label>
          <button type="submit" className="rounded-2xl bg-accent-400 px-5 font-bold text-primary-900 transition hover:bg-accent-500">
            Qidirish
          </button>
        </form>
      </section>

      <div className="mt-6">
        {q.length < 2 && <p className="text-center text-sm text-neutral-500">Qidirish uchun kamida 2 ta harf kiriting.</p>}
        {loading && q.length >= 2 && <Loading label="Qidirilmoqda..." />}
        {error && (
          <p className="text-center text-sm text-rose-600">
            {error}{' '}
            <button type="button" onClick={retry} className="font-semibold underline">Qayta urinish</button>
          </p>
        )}

        {!loading && !error && data && q.length >= 2 && (
          <>
            <p className="text-sm text-neutral-500" aria-live="polite">
              «{q}» bo‘yicha {(data.count ?? data.results.length) + pages.length} ta natija
              {(data.count ?? 0) > data.results.length && ` (eng mos ${data.results.length} tasi ko‘rsatilgan)`}
            </p>

            <ul className="mt-4 space-y-3">
              {pages.map((p) => (
                <li key={p.to}>
                  <Link
                    to={p.to}
                    className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primary-500/40 dark:bg-neutral-900 dark:ring-white/10"
                  >
                    <span className="rounded-full bg-accent-100 px-2.5 py-1 text-[11px] font-semibold text-accent-500">Sahifa</span>
                    <span className="font-display font-bold text-neutral-900 dark:text-white">
                      <Highlight text={p.label} terms={data.terms} />
                    </span>
                  </Link>
                </li>
              ))}
              {data.results.map((r, i) => (
                <li key={`${r.type}:${r.category}:${r.slug}:${r.section_id ?? ''}`} className="motion-safe:animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
                  <Link
                    to={resultHref(r)}
                    className="group flex gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primary-500/40 dark:bg-neutral-900 dark:ring-white/10"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition group-hover:bg-primary-600 group-hover:text-white dark:bg-primary-900/40 dark:text-emerald-300">
                      <TopicIconSvg icon={r.icon} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
                        <span className="font-semibold text-primary-700 dark:text-emerald-300">{CATEGORY_LABEL[r.category]}</span>
                        <span aria-hidden>›</span>
                        <span>{String(r.number).padStart(2, '0')}. {r.topic_title}</span>
                        {r.type === 'topic' && <span className="rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">mavzu</span>}
                      </span>
                      <span className="mt-1 block font-display font-bold text-neutral-900 dark:text-white">
                        <Highlight text={r.title} terms={data.terms} />
                      </span>
                      <span className="mt-1 block text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                        <Highlight text={r.snippet} terms={data.terms} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {data.results.length === 0 && pages.length === 0 && (
              <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 dark:bg-neutral-900">
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">Hech narsa topilmadi</p>
                <p className="mt-1 text-sm text-neutral-500">Boshqa so‘z bilan yoki qisqaroq yozib ko‘ring.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
