import { useI18n } from '../../i18n';

/** [o'zbekcha, ruscha] */
type Pair = [string, string];

export interface GuideStep {
  title: Pair;
  text: Pair;
}

/** Sahifa tagidagi «Bu sahifada nima qilasiz?» — foydalanuvchi uchun qisqa yo'riqnoma (diniy hukm emas) */
export function PageGuide({ steps, className = '' }: { steps: GuideStep[]; className?: string }) {
  const { t } = useI18n();
  return (
    <section
      aria-labelledby="page-guide"
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-6 md:rounded-3xl dark:bg-neutral-900 dark:ring-white/10 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-emerald-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 11v5M12 8v.01" />
          </svg>
        </span>
        <h2 id="page-guide" className="font-display text-lg font-bold text-neutral-900 md:text-xl dark:text-white">
          {t('Bu sahifada nima qilasiz?', 'Что можно сделать на этой странице?')}
        </h2>
      </div>
      <ol className={`mt-4 grid gap-3 sm:grid-cols-2 ${steps.length >= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        {steps.map((s, i) => (
          <li key={s.title[0]} className="flex gap-3 rounded-2xl bg-neutral-50 p-3.5 dark:bg-neutral-800/60">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-700 font-display text-sm font-bold text-white">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-neutral-900 dark:text-white">{t(...s.title)}</p>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{t(...s.text)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
