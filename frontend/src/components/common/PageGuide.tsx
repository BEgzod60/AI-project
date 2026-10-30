import { useI18n } from '../../i18n';

/** [o'zbekcha, ruscha] */
type Pair = [string, string];

export interface GuideStep {
  title: Pair;
  text: Pair;
}

/** Sahifa tagidagi ixtiyoriy, yopiq holatda ixcham yo'riqnoma. */
export function PageGuide({ steps, className = '' }: { steps: GuideStep[]; className?: string }) {
  const { t } = useI18n();
  return (
    <section
      aria-label={t('Sahifadan foydalanish', 'Как пользоваться страницей')}
      className={`light-surface rounded-2xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10 ${className}`}
    >
      <details className="group">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 [&::-webkit-details-marker]:hidden sm:px-5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-emerald-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 11v5M12 8v.01" />
            </svg>
          </span>
          <span className="flex-1 text-sm font-bold text-neutral-800 dark:text-white">
            {t('Sahifadan foydalanish', 'Как пользоваться страницей')}
          </span>
          <span className="text-xs font-semibold text-primary-700 group-open:hidden dark:text-emerald-300">
            {t('Ko‘rsatish', 'Открыть')}
          </span>
          <span className="hidden text-xs font-semibold text-primary-700 group-open:inline dark:text-emerald-300">
            {t('Yopish', 'Закрыть')}
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-primary-700 transition-transform group-open:rotate-180 dark:text-emerald-300" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <ol className="grid gap-2 border-t border-neutral-100 px-4 pb-4 pt-3 sm:grid-cols-2 sm:px-5 dark:border-white/10">
          {steps.map((s, i) => (
            <li key={s.title[0]} className="flex gap-2.5 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-700 font-display text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">{t(...s.title)}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">{t(...s.text)}</p>
              </div>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}
