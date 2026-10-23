import { Link } from 'react-router-dom';
import { SearchBar } from '../common/SearchBar';
import { RegionPicker } from '../prayerTimes/RegionPicker';
import { LanguageSelect } from '../common/LanguageSelect';
import { ThemeToggle } from '../common/ThemeToggle';
import { SearchIcon } from '../common/Icons';
import { VisitorCounter } from '../common/VisitorCounter';
import { useT } from '../../i18n';

interface HeaderProps {
  region: string;
  onRegionChange: (region: string) => void;
}

const iconBtn =
  'tap-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800';

export function Header({ region, onRegionChange }: HeaderProps) {
  const t = useT();
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/90 px-3 py-2 backdrop-blur sm:px-4 md:px-6 md:py-3 dark:border-neutral-800 dark:bg-neutral-900/90">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
        {/* Telefon/planshet: logotip (desktopda logotip sidebar'da) */}
        <Link to="/" aria-label={t('Bosh sahifa', 'Главная')} className="flex shrink-0 items-center gap-2 rounded-xl py-1 pr-1 lg:hidden">
          <img src="/images/iymon-logo.webp" alt="" width={34} height={34} className="h-[34px] w-[34px] rounded-lg object-cover" />
          <span className="bg-gradient-to-b from-[#c9a24a] via-accent-500 to-[#9a6a12] bg-clip-text font-brand text-2xl font-bold leading-none text-transparent max-[339px]:hidden dark:from-[#f7e3a3] dark:via-[#e9c46a] dark:to-accent-500">
            Iymon
          </span>
        </Link>

        <SearchBar />

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-3">
          {/* Telefon: qidiruv sahifasiga o'tish */}
          <Link to="/qidiruv" aria-label={t('Qidiruv', 'Поиск')} className={`${iconBtn} md:hidden`}>
            <SearchIcon />
          </Link>
          <RegionPicker value={region} onChange={onRegionChange} variant="compact" />
          <VisitorCounter />
          {/* Til va mavzu: faqat kompyuterda */}
          <div className="hidden items-center gap-3 md:flex">
            <LanguageSelect />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
