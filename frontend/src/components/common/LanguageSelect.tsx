/** Til tanlash — hozircha faqat o'zbekcha (static). Kelajakda ko'paytiriladi. */
export function LanguageSelect() {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 sm:inline-flex">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 5.8 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.8-3.8-9S9.5 5.7 12 3Z" />
      </svg>
      <span>O'zbekcha</span>
    </div>
  );
}
