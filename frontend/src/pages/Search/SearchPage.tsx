import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { CATEGORY_LABEL, searchPages, resultHref, searchContent } from '../../services/searchService';
import type { SearchResponse } from '../../types/search';
import { Loading } from '../../components/common/Loading';
import { Breadcrumb } from '../../components/namoz/Breadcrumb';
import { TopicIconSvg } from '../../components/namoz/NamozIcons';
import { Highlight, normalizeSearch } from '../../components/search/Highlight';
import { useT } from '../../i18n';

const EMPTY: SearchResponse = { query: '', terms: [], results: [] };

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const [draft, setDraft] = useState(q);
  const t = useT();
  // Header'dan yangi qidiruv qilinganda maydon ham yangilansin
  useEffect(() => setDraft(q), [q]);
  const { data, loading, error, retry } = useApi(
    () => (q.length >= 2 ? searchContent(q) : Promise.resolve(EMPTY)),
    [q],
  );
  const pages = q.length >= 2
    ? searchPages().filter((p) => normalizeSearch(`${p.label} ${p.keywords}`).includes(normalizeSearch(q)))
    : [];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    setParams(value ? { q: value } : {});
  };

  return (
    <div className="mx-auto max-w-4xl px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6">
      <section className="rounded-2xl bg-primary-900 p-4 text-white motion-safe:animate-fade-in-up sm:p-6 md:rounded-3xl md:p-8">
        <Breadcrumb items={[{ label: t('Bosh sahifa', 'Главная'), to: '/' }, { label: t('Qidiruv', 'Поиск') }]} />
        <h1 className="mt-3 font-display text-2xl font-extrabold sm:mt-4 sm:text-3xl">{t('Qidiruv', 'Поиск')}</h1>
        <form onSubmit={submit} role="search" className="mt-3 flex gap-2 sm:mt-4">
          <label className="relative flex-1">
            <span className="sr-only">{t('Qidiruv so‘zi', 'Поисковый запрос')}</span>
            <input
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus={!q}
              placeholder={t('Masalan: tahorat, g‘usl farzlari, qadar…', 'Например: tahorat, g‘usl farzlari, qadar…')}
              className="min-h-[48px] w-full min-w-0 rounded-2xl bg-white/10 px-4 py-3 text-white outline-none ring-1 ring-white/20 placeholder:text-white/50 focus:ring-2 focus:ring-accent-400"
            />
          </label>
          <button type="submit" className="tap-press shrink-0 rounded-2xl bg-accent-400 px-4 font-bold sm:px-5 text-primary-900 transition hover:bg-accent-500">
            {t('Qidirish', 'Найти')}
          </button>
        </form>
      </section>

      <div className="mt-3 sm:mt-4 md:mt-6">
        {q.length < 2 && <p className="text-center text-sm text-neutral-500">{t('Qidirish uchun kamida 2 ta harf kiriting.', 'Введите не менее 2 букв для поиска.')}</p>}
        {loading && q.length >= 2 && <Loading label={t('Qidirilmoqda...', 'Поиск...')} />}
        {error && (
          <p className="text-center text-sm text-rose-600">
            {error}{' '}
            <button type="button" onClick={retry} className="font-semibold underline">{t('Qayta urinish', 'Повторить')}</button>
          </p>
        )}

        {!loading && !error && data && q.length >= 2 && (
          <>
            <p className="text-sm text-neutral-500" aria-live="polite">
              {t(`«${q}» bo‘yicha ${(data.count ?? data.results.length) + pages.length} ta natija`, `По запросу «${q}» найдено: ${(data.count ?? data.results.length) + pages.length}`)}
              {(data.count ?? 0) > data.results.length && t(` (eng mos ${data.results.length} tasi ko‘rsatilgan)`, ` (показаны ${data.results.length} самых подходящих)`)}
            </p>

            <ul className="mt-3 space-y-2 sm:space-y-3 md:mt-4">
              {pages.map((p) => (
                <li key={p.to}>
                  <Link
                    to={p.to}
                    className="tap-press flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm sm:gap-4 sm:p-4 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primary-500/40 dark:bg-neutral-900 dark:ring-white/10"
                  >
                    <span className="rounded-full bg-accent-100 px-2.5 py-1 text-[11px] font-semibold text-accent-500">{t('Sahifa', 'Страница')}</span>
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
                    className="tap-press group flex gap-3 rounded-2xl bg-white p-3 shadow-sm sm:gap-4 sm:p-4 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primary-500/40 dark:bg-neutral-900 dark:ring-white/10"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 sm:h-11 sm:w-11 text-primary-600 transition group-hover:bg-primary-600 group-hover:text-white dark:bg-primary-900/40 dark:text-emerald-300">
                      <TopicIconSvg icon={r.icon} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
                        <span className="font-semibold text-primary-700 dark:text-emerald-300">{t(...CATEGORY_LABEL[r.category])}</span>
                        <span aria-hidden>›</span>
                        <span>{String(r.number).padStart(2, '0')}. {r.topic_title}</span>
                        {r.type === 'topic' && <span className="rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">{t('mavzu', 'тема')}</span>}
                      </span>
                      <span className="mt-1 block font-display font-bold text-neutral-900 dark:text-white">
                        <Highlight text={r.title} terms={data.terms} />
                      </span>
                      <span className="mt-1 line-clamp-3 text-sm leading-relaxed text-neutral-600 sm:line-clamp-none sm:block dark:text-neutral-400">
                        <Highlight text={r.snippet} terms={data.terms} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {data.results.length === 0 && pages.length === 0 && (
              <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 dark:bg-neutral-900">
                <p className="font-semibold text-neutral-800 dark:text-neutral-100">{t('Hech narsa topilmadi', 'Ничего не найдено')}</p>
                <p className="mt-1 text-sm text-neutral-500">{t('Boshqa so‘z bilan yoki qisqaroq yozib ko‘ring.', 'Попробуйте другое или более короткое слово. Материалы на узбекском — ищите по-узбекски.')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
