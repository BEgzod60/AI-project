import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ClockIcon, CompassIcon, GraduateIcon, HomeIcon, MenuIcon } from '../common/Icons';
import { useT } from '../../i18n';

/** label — tugmadagi qisqa yozuv; title — to'liq nom (ekran o'quvchilar uchun) */
const ITEMS: { to: string; icon: ReactNode; label: [string, string]; title?: [string, string]; end?: boolean }[] = [
  { to: '/', icon: <HomeIcon className="h-[22px] w-[22px]" />, label: ['Bosh sahifa', 'Главная'], end: true },
  { to: '/namoz-organish', icon: <GraduateIcon className="h-[22px] w-[22px]" />, label: ['O‘rganish', 'Обучение'], title: ['Namoz o‘rganish', 'Обучение намазу'] },
  { to: '/namoz-vaqtlari', icon: <ClockIcon className="h-[22px] w-[22px]" />, label: ['Vaqtlar', 'Время'] },
  { to: '/qibla', icon: <CompassIcon className="h-[22px] w-[22px]" />, label: ['Qibla', 'Кибла'] },
];

const itemClass = 'tap-press relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold leading-none transition-colors';

/** Telefon va planshetda (lg dan kichik) pastda doim turadigan asosiy navigatsiya */
export function BottomNav({ menuOpen, onMenuClick }: { menuOpen: boolean; onMenuClick: () => void }) {
  const t = useT();
  return (
    <nav
      aria-label={t('Asosiy navigatsiya', 'Основная навигация')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-primary-900/10 bg-white/95 px-2 pt-1 text-primary-900 shadow-[0_-8px_24px_rgb(7_42_22/0.08)] backdrop-blur-md lg:hidden dark:border-white/10 dark:bg-primary-900/95 dark:text-white dark:shadow-[0_-8px_24px_rgb(0_0_0/0.18)]"
      style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
    >
      <ul className="mx-auto flex max-w-xl items-stretch gap-1">
        {ITEMS.map((item) => (
          <li key={item.to} className="flex flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              aria-label={item.title ? t(...item.title) : undefined}
              className={({ isActive }) => `${itemClass} ${isActive && !menuOpen ? 'bg-primary-50 text-primary-700 dark:bg-transparent dark:text-accent-400' : 'text-neutral-500 hover:text-primary-700 dark:text-white/75 dark:hover:text-white'}`}
            >
              {({ isActive }) => (
                <>
                  {isActive && !menuOpen && <span aria-hidden className="absolute top-1 h-1 w-6 rounded-full bg-accent-400" />}
                  {item.icon}
                  <span className="mt-1">{t(...item.label)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li className="flex flex-1">
          <button
            type="button"
            onClick={onMenuClick}
            aria-expanded={menuOpen}
            className={`${itemClass} ${menuOpen ? 'bg-primary-50 text-primary-700 dark:bg-transparent dark:text-accent-400' : 'text-neutral-500 hover:text-primary-700 dark:text-white/75 dark:hover:text-white'}`}
          >
            {menuOpen && <span aria-hidden className="absolute top-1 h-1 w-6 rounded-full bg-accent-400" />}
            <MenuIcon className="h-[22px] w-[22px]" />
            <span className="mt-1">{t('Menyu', 'Меню')}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
