import { useT } from '../../i18n';
export type BirgaMode = 'birga-oqish' | 'birga-takrorlash';

/** Dars sahifasidagi ikki rejim kartasi (dizayndagi «Birga takrorlash» / «Birga o'qish») */
export function BirgaModeCards({ onOpen }: { onOpen: (mode: BirgaMode) => void }) {
  const t = useT();
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 md:mt-4">
      <button
        type="button"
        onClick={() => onOpen('birga-takrorlash')}
        className="tap-press group flex items-center gap-2.5 rounded-2xl bg-white p-3 text-left shadow-sm sm:gap-4 sm:p-4 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primary-500/40 dark:bg-neutral-900 dark:ring-white/10"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary-700 sm:h-12 sm:w-12 ring-2 ring-primary-600/70 dark:text-emerald-300">
          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-5 w-5" aria-hidden><path d="M7 4v16l13-8z" /></svg>
        </span>
        <span className="min-w-0">
          <span className="block font-display text-[15px] font-bold leading-snug text-neutral-900 sm:text-lg dark:text-white">{t('Birga takrorlash', 'Повторять вместе')}</span>
          <span className="line-clamp-2 text-[12px] leading-snug text-neutral-500 sm:block sm:text-sm">{t('AI tushuntiradi, mashq rejimi', 'Режим тренировки с ИИ')}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onOpen('birga-oqish')}
        className="tap-press group flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-primary-600 to-emerald-500 p-3 text-left sm:gap-4 sm:p-4 text-white shadow-md ring-1 ring-primary-500 transition hover:-translate-y-0.5 hover:shadow-lg"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/15 sm:h-12 sm:w-12">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2Zm16 0a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2Z" /></svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-bold leading-snug sm:text-lg">{t('Birga o‘qish', 'Читать вместе')}</span>
          <span className="line-clamp-2 text-[12px] leading-snug text-white/85 sm:block sm:text-sm">{t('Haqiqiy namoz rejimi · qo‘l tegizmasdan', 'Режим настоящего намаза · без касаний')}</span>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="hidden h-5 w-5 shrink-0 transition group-hover:translate-x-0.5 sm:block" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" /></svg>
      </button>
    </div>
  );
}
