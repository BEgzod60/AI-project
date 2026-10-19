import { REGIONS, DEFAULT_REGION, regionLabel } from '../../utils/constants';
import { useI18n } from '../../i18n';

interface RegionSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function RegionSelect({ value, onChange }: RegionSelectProps) {
  const { lang } = useI18n();
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Hudud tanlash</span>
      <span aria-hidden className="pointer-events-none absolute left-3 text-neutral-500">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-5.1-7-11a7 7 0 1 1 14 0c0 5.9-7 11-7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-full border border-neutral-200 bg-white py-2 pl-9 pr-8 text-sm font-medium text-neutral-800 shadow-sm outline-none transition hover:border-neutral-300 focus:ring-2 focus:ring-primary-500/40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
      >
        {[DEFAULT_REGION, ...REGIONS.filter((r) => r !== DEFAULT_REGION)].map((region) => (
          <option key={region} value={region}>
            {regionLabel(region, lang)}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 text-neutral-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </label>
  );
}
