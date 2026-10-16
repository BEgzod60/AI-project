import { Link } from 'react-router-dom';
import { SearchBar } from '../common/SearchBar';
import { RegionPicker } from '../prayerTimes/RegionPicker';
import { LanguageSelect } from '../common/LanguageSelect';
import { ThemeToggle } from '../common/ThemeToggle';

interface HeaderProps {
  region: string;
  onRegionChange: (region: string) => void;
  onMenuClick: () => void;
}

export function Header({ region, onRegionChange, onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/90 px-4 py-3 backdrop-blur md:px-6 dark:border-neutral-800 dark:bg-neutral-900/90">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Mobil menyu tugmasi */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Menyuni ochish"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 lg:hidden dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <SearchBar />
        {/* Mobil: qidiruv sahifasiga o'tish */}
        <Link
          to="/qidiruv"
          aria-label="Qidiruv"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 md:hidden dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <RegionPicker value={region} onChange={onRegionChange} variant="compact" />
          <LanguageSelect />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
