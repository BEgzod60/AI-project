import { useEffect, useRef, useState } from 'react';
import type { SurahDetail } from '../../types/quran';
import { AyahPlayer } from './AyahPlayer';
import { useI18n } from '../../i18n';

type Tab = 'matn' | 'oqilishi' | 'manosi' | 'malumot';

const TABS: { id: Tab; label: [string, string] }[] = [
  { id: 'matn', label: ['Matn', 'Текст'] },
  { id: 'oqilishi', label: ['O‘qilishi', 'Чтение'] },
  { id: 'manosi', label: ['Ma’nosi', 'Смысл'] },
  { id: 'malumot', label: ['Ma’lumot', 'Сведения'] },
];

function NumberBadge({ n, size = 'md' }: { n: number; size?: 'md' | 'lg' }) {
  const dimensions = size === 'lg' ? 'h-12 w-12 text-base' : 'h-8 w-8 text-xs';
  return (
    <span className={`relative flex shrink-0 items-center justify-center font-bold tabular-nums text-primary-800 dark:text-accent-400 ${dimensions}`}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full text-accent-400" aria-hidden>
        <path fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.6" d="M20 2 25 7h7v7l5 6-5 6v7h-7l-5 5-5-5H8v-7l-5-6 5-6V7h7Z" />
      </svg>
      <span className="relative">{n}</span>
    </span>
  );
}

export { NumberBadge };

function SourceNote({ sources }: { sources: SurahDetail['sources'] }) {
  const { t } = useI18n();
  return (
    <div className="mt-3 space-y-1 rounded-xl bg-neutral-50 px-3 py-2 text-xs leading-relaxed text-neutral-500 ring-1 ring-black/5 dark:bg-white/5 dark:text-neutral-400 dark:ring-white/10">
      <p>
        <span className="font-semibold text-neutral-700 dark:text-neutral-200">{t('Manba', 'Источник')}:</span>{' '}
        O‘zbekiston musulmonlari idorasi{' '}
        <a href="https://muslim.uz/uz" target="_blank" rel="noopener noreferrer" className="underline">rasmiy veb-portali</a>{' '}
        <a href="https://muslim.uz/uz/quran-app" target="_blank" rel="noopener noreferrer" className="underline">xabar beradi</a>.
      </p>
      <p>
        {t('Arabcha matn', 'Арабский текст')} — <a href={sources.url} target="_blank" rel="noopener noreferrer" className="underline">{sources.api}</a> (CC BY 3.0).
        {' '}{t('Ma’nosi', 'Смысловой перевод')}: {sources.translation}; {t('notijoriy foydalanish uchun', 'для некоммерческого использования')}.
      </p>
    </div>
  );
}

interface Props {
  surah: SurahDetail;
  saved: boolean;
  memorized: boolean;
  onToggleSaved: () => void;
  onToggleMemorized: () => void;
}

export function SurahView({ surah, saved, memorized, onToggleSaved, onToggleMemorized }: Props) {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<Tab>('matn');
  const [hideText, setHideText] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [currentAyah, setCurrentAyah] = useState<number | null>(null);
  const [playRequest, setPlayRequest] = useState<{ ayah: number; id: number } | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  // O'qilayotgan oyat ko'rinib turishi uchun unga suriladi.
  useEffect(() => {
    if (!currentAyah) return;
    listRef.current?.querySelector(`[data-ayah="${currentAyah}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentAyah]);

  const playAyah = (ayah: number) => setPlayRequest({ ayah, id: Date.now() });

  const toggleReveal = (number: number) => setRevealed((current) => {
    const next = new Set(current);
    next.has(number) ? next.delete(number) : next.add(number);
    return next;
  });

  return (
    <article className="flex min-w-0 flex-col gap-3 sm:gap-4" aria-labelledby="sura-title">
      <header className="flex items-start gap-3">
        <NumberBadge n={surah.number} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 id="sura-title" className="font-display text-xl font-extrabold text-neutral-900 sm:text-2xl dark:text-white">
            {lang === 'ru'
              ? <><span className="text-base font-semibold text-neutral-500">Сура</span> {surah.name_simple}</>
              : <>{surah.name_uz} <span className="text-base font-semibold text-neutral-500">surasi</span></>}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{lang === 'ru' ? '' : `${surah.name_simple} · `}{surah.verses_count} {t('oyat', 'аятов')} · {surah.revelation}</p>
        </div>
        <p className="font-quran shrink-0 text-2xl text-primary-800 dark:text-accent-400" lang="ar" dir="rtl">{surah.name_arabic}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onToggleSaved} aria-pressed={saved} className={`inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ring-1 transition ${saved ? 'bg-accent-400 text-primary-900 ring-accent-400' : 'bg-white text-neutral-700 ring-black/10 hover:ring-primary-500/40 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-white/15'}`}>
          <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden><path strokeLinejoin="round" d="M6 3h12v18l-6-4-6 4Z" /></svg>
          {saved ? t('Saqlangan', 'Сохранено') : t('Saqlash', 'Сохранить')}
        </button>
        <button type="button" onClick={onToggleMemorized} aria-pressed={memorized} className={`inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ring-1 transition ${memorized ? 'bg-primary-700 text-white ring-primary-700' : 'bg-white text-neutral-700 ring-black/10 hover:ring-primary-500/40 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-white/15'}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          {memorized ? t('Yodlangan', 'Выучено') : t('Yodladim', 'Выучил')}
        </button>
        <button
          type="button"
          onClick={() => setHideText((value) => !value)}
          aria-pressed={hideText}
          title={t('Arabcha matnni yashirib, oyatlarni bosib tekshiring', 'Скройте арабский текст и проверяйте себя, нажимая на аяты')}
          className={`inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ring-1 transition ${hideText ? 'bg-primary-50 text-primary-800 ring-primary-500/40 shadow-sm dark:bg-primary-900/40 dark:text-emerald-200' : 'bg-white text-neutral-700 ring-black/10 hover:-translate-y-0.5 hover:ring-primary-500/40 hover:shadow-sm dark:bg-neutral-800 dark:text-neutral-200 dark:ring-white/15'}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
            {hideText ? (
              <><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.6 9.6 0 0 1 12 5c5 0 9 5 9 7a9 9 0 0 1-2.4 3.4M6.1 6.1C4 7.5 3 10.4 3 12c0 2 4 7 9 7a9.4 9.4 0 0 0 4-.9" /></>
            ) : (
              <><path strokeLinecap="round" strokeLinejoin="round" d="M3 12c0-2 4-7 9-7s9 5 9 7-4 7-9 7-9-5-9-7Z" /><circle cx="12" cy="12" r="2.5" /></>
            )}
          </svg>
          {t('Yodlash rejimi', 'Режим заучивания')}
        </button>
      </div>

      {surah.audio && (
        <div className="rounded-2xl bg-neutral-50 p-3 ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
          <audio controls preload="none" src={surah.audio.url} className="w-full" />
          <p className="mt-1 text-xs text-neutral-500">Qori: {surah.audio.reciter} · Manba: <a href={surah.audio.source_url} target="_blank" rel="noopener noreferrer" className="underline">{surah.audio.source_title}</a></p>
        </div>
      )}
      {surah.ayah_audio && (
        // Telefonda pleer header ostida yopishib turadi — oyatlarni o'qiyotganda boshqaruv doim qo'l ostida
        <div className="sticky top-[60px] z-20 rounded-2xl bg-white shadow-md shadow-black/5 md:top-[69px] lg:static lg:bg-transparent lg:shadow-none dark:bg-neutral-900 lg:dark:bg-transparent">
          <AyahPlayer audio={surah.ayah_audio} surah={surah.number} versesCount={surah.verses_count} current={currentAyah} onCurrentChange={setCurrentAyah} request={playRequest} />
        </div>
      )}
      {surah.ayah_audio && (
        <p className="-mt-1 px-1 text-xs text-neutral-500 lg:hidden">
          {t('Oyatma-oyat tilovat', 'Чтение по аятам')} · {t('Manba', 'Источник')}: <a href={surah.ayah_audio.source_url} target="_blank" rel="noopener noreferrer" className="underline">{surah.ayah_audio.source_title}</a>
        </p>
      )}
      {!surah.audio && !surah.ayah_audio && (
        <p className="rounded-2xl bg-neutral-50 p-3 text-sm text-neutral-600 ring-1 ring-black/5 dark:bg-white/5 dark:text-neutral-300 dark:ring-white/10">{t('Audio hozircha mavjud emas.', 'Аудио пока недоступно.')}</p>
      )}

      <div role="tablist" aria-label={t('Sura bo‘limlari', 'Разделы суры')} className="grid grid-cols-4 gap-1 rounded-2xl bg-neutral-100 p-1 dark:bg-neutral-800">
        {TABS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`min-h-[2.5rem] rounded-xl px-1 text-xs font-semibold transition sm:text-sm ${tab === item.id ? 'bg-primary-700 text-white shadow-sm' : 'text-neutral-600 dark:text-neutral-300'}`}>
            {t(...item.label)}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {(tab === 'matn' || tab === 'manosi') && (
          <ol ref={listRef} className="space-y-2">
            {surah.ayahs.map((ayah) => {
              const hidden = hideText && !revealed.has(ayah.number);
              return (
                <li key={ayah.number} data-ayah={ayah.number} className={`rounded-2xl p-3 ring-1 transition ${currentAyah === ayah.number ? 'bg-primary-50 ring-primary-500/40 dark:bg-primary-900/30' : 'bg-white ring-black/5 dark:bg-neutral-900 dark:ring-white/10'}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <NumberBadge n={ayah.number} />
                      {surah.ayah_audio && (
                        <button type="button" onClick={() => playAyah(ayah.number)} aria-label={t(`${ayah.number}-oyatni tinglash`, `Слушать аят ${ayah.number}`)} className="flex h-10 w-10 items-center justify-center rounded-full text-primary-700 transition hover:bg-primary-50 lg:h-8 lg:w-8 dark:text-accent-400 dark:hover:bg-white/10">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-3.5 w-3.5" aria-hidden><path d="M7 4v16l13-8z" /></svg>
                        </button>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      {tab === 'matn' && <button type="button" onClick={() => hideText && toggleReveal(ayah.number)} className="block w-full text-right"><span lang="ar" dir="rtl" className={`font-quran block text-[1.7rem] leading-[2.6] text-neutral-900 dark:text-neutral-50 ${hidden ? 'select-none blur-md' : ''}`}>{ayah.arabic}</span></button>}
                      <p className="leading-7 text-neutral-700 dark:text-neutral-300">{ayah.meaning}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {tab === 'oqilishi' && (surah.transliteration ? (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
            <p className="whitespace-pre-line text-lg leading-9 text-neutral-800 dark:text-neutral-100">{surah.transliteration.text}</p>
            <p className="mt-3 text-xs text-neutral-500">{t('Manba', 'Источник')}: <a href={surah.transliteration.source_url} target="_blank" rel="noopener noreferrer" className="underline">{t('O‘zbekiston musulmonlari idorasi — muslim.uz', 'Управление мусульман Узбекистана — muslim.uz')}</a>{lang === 'ru' && ' · ' + 'транскрипция в узбекской латинице'}</p>
          </div>
        ) : <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600 dark:bg-white/5 dark:text-neutral-300">{t('Bu suraning lotin harflaridagi o‘qilishi hozircha mavjud emas.', 'Транскрипция этой суры латиницей пока недоступна.')}</p>)}
        {tab === 'malumot' && (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              [t('Qur’ondagi tartibi', 'Порядковый номер'), t(`${surah.number}-sura`, `${surah.number}-я сура`)],
              [t('Oyatlar soni', 'Количество аятов'), t(`${surah.verses_count} ta`, String(surah.verses_count))],
              [t('Nozil bo‘lgan joyi', 'Место ниспослания'), surah.revelation],
            ].map(([key, value]) => (
              <div key={key} className="rounded-2xl bg-accent-100/50 p-3 dark:bg-accent-500/10"><dt className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{key}</dt><dd className="mt-0.5 font-semibold text-neutral-900 dark:text-white">{value}</dd></div>
            ))}
          </dl>
        )}
      </div>
      <SourceNote sources={surah.sources} />
    </article>
  );
}
