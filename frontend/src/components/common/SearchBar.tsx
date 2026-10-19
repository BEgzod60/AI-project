import { useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CATEGORY_LABEL, searchPages, resultHref, searchContent } from '../../services/searchService';
import type { SearchResult } from '../../types/search';
import { Highlight, normalizeSearch } from '../search/Highlight';
import { TopicIconSvg } from '../namoz/NamozIcons';
import { useT } from '../../i18n';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 6;

interface Item {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  result?: SearchResult;
}

export function SearchBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const requestId = useRef(0);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(-1);

  const trimmed = query.trim();
  const t = useT();

  // Ctrl+K — qidiruvga fokus
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('iymon-search')?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Sahifa o'zgarganda ro'yxat yopiladi
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  // Tashqariga bosilganda yopiladi
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Debounce bilan qidiruv; eski javoblar yangisini bosib ketmasligi uchun requestId
  useEffect(() => {
    if (trimmed.length < MIN_CHARS) {
      requestId.current++; // kechikkan javoblar e'tiborsiz qolsin
      setResults([]);
      setTerms([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchContent(trimmed)
        .then((res) => {
          if (id !== requestId.current) return;
          setResults(res.results);
          setTerms(res.terms);
          setTotal(res.count ?? res.results.length);
        })
        .catch(() => {
          if (id === requestId.current) setResults([]);
        })
        .finally(() => {
          if (id === requestId.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [trimmed]);

  const normQuery = normalizeSearch(trimmed);
  const pageItems: Item[] =
    trimmed.length >= MIN_CHARS
      ? searchPages().filter((p) => normalizeSearch(`${p.label} ${p.keywords}`).includes(normQuery)).map((p) => ({
          key: `page:${p.to}`,
          href: p.to,
          title: p.label,
          subtitle: t('Sahifa', 'Страница'),
        }))
      : [];
  const resultItems: Item[] = results.slice(0, MAX_SUGGESTIONS).map((r) => ({
    key: `${r.type}:${r.category}:${r.slug}:${r.section_id ?? ''}`,
    href: resultHref(r),
    title: r.title,
    subtitle: `${t(...CATEGORY_LABEL[r.category])} · ${r.type === 'topic' ? t('mavzu', 'тема') : r.topic_title}`,
    result: r,
  }));
  const items = [...pageItems, ...resultItems];
  const showPanel = open && trimmed.length >= MIN_CHARS;

  const go = (href: string) => {
    setOpen(false);
    setQuery('');
    navigate(href);
  };
  const goToResultsPage = () => {
    if (!trimmed) return;
    setOpen(false);
    navigate(`/qidiruv?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form
      ref={rootRef}
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && items[active]) go(items[active].href);
        else goToResultsPage();
      }}
      className="relative hidden max-w-lg flex-1 md:block"
      role="search"
    >
      <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <input
        id="iymon-search"
        type="search"
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && items.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === 'ArrowUp' && items.length) {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          } else if (e.key === 'Escape') {
            setOpen(false);
            setActive(-1);
          }
        }}
        placeholder={t('Qidiruv... (namoz, sura, duo, mavzu...)', 'Поиск... (намаз, сура, дуа, тема...)')}
        className="w-full rounded-full border border-neutral-200 bg-white py-2 pl-11 pr-16 text-sm shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/30 dark:border-neutral-700 dark:bg-neutral-800"
      />
      <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 sm:block dark:border-neutral-700 dark:bg-neutral-900">
        Ctrl K
      </kbd>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 motion-safe:animate-fade-in dark:bg-neutral-900 dark:ring-white/10">
          <ul id={listId} role="listbox" aria-label={t('Qidiruv natijalari', 'Результаты поиска')} className="max-h-[26rem] overflow-y-auto p-2">
            {items.map((item, i) => (
              <li
                key={item.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(item.href)}
                className={`flex cursor-pointer gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  i === active ? 'bg-primary-50 dark:bg-primary-900/40' : ''
                }`}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-emerald-300">
                  {item.result ? (
                    <TopicIconSvg icon={item.result.icon} className="h-4 w-4" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h10l4 4v12H5zM14 4v5h5" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-white">
                    <Highlight text={item.title} terms={terms} />
                  </span>
                  <span className="block truncate text-[11px] text-neutral-500">{item.subtitle}</span>
                  {item.result?.type === 'section' && (
                    <span className="mt-0.5 line-clamp-2 block text-xs text-neutral-600 dark:text-neutral-400">
                      <Highlight text={item.result.snippet} terms={terms} />
                    </span>
                  )}
                </span>
              </li>
            ))}
            {!loading && items.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-neutral-500">{t(`«${trimmed}» bo‘yicha hech narsa topilmadi.`, `По запросу «${trimmed}» ничего не найдено.`)}</li>
            )}
            {loading && items.length === 0 && <li className="px-3 py-6 text-center text-sm text-neutral-500">{t('Qidirilmoqda…', 'Поиск…')}</li>}
          </ul>
          {total > 0 && (
            <button
              type="button"
              onClick={goToResultsPage}
              onMouseDown={(e) => e.preventDefault()}
              className="flex w-full items-center justify-between border-t border-neutral-100 px-4 py-2.5 text-xs font-semibold text-primary-700 transition hover:bg-primary-50 dark:border-neutral-800 dark:text-emerald-300 dark:hover:bg-primary-900/30"
            >
              {t('Barcha natijalar', 'Все результаты')} ({total})
              <span aria-hidden>↵</span>
            </button>
          )}
        </div>
      )}
    </form>
  );
}
