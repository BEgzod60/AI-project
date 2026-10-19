import { useI18n } from '../../i18n';

/**
 * Ruscha interfeysda: diniy matn faqat o'zbekcha ekanini bildiradi.
 * Rasmiy manba (muslim.uz) ruscha versiyani bermaydi — matn o'zimizdan tarjima qilinmaydi.
 */
export function ContentLanguageNote({ className = '' }: { className?: string }) {
  const { lang } = useI18n();
  if (lang !== 'ru') return null;
  return (
    <p role="note" className={`flex items-start gap-2.5 rounded-2xl bg-accent-100/70 px-4 py-3 text-sm leading-relaxed text-neutral-800 ring-1 ring-accent-400/40 dark:bg-accent-500/10 dark:text-neutral-200 ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 5.8 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.8-3.8-9S9.5 5.7 12 3Z" />
      </svg>
      <span>
        Материалы этого раздела опубликованы на <strong>узбекском языке</strong>. Источник — Управление мусульман Узбекистана
        (muslim.uz), у которого нет официальной русской версии; религиозные тексты мы не переводим самостоятельно.
      </span>
    </p>
  );
}
