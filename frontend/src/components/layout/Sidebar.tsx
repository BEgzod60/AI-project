import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  BookIcon,
  ClockIcon,
  CoinsIcon,
  CrescentIcon,
  CompassIcon,
  GraduateIcon,
  HomeIcon,
  InfoIcon,
  CodeIcon,
  CloseIcon,
  MosqueIcon,
  QuoteIcon,
  SurahIcon,
} from '../common/Icons';
import { useT } from '../../i18n';
import { LanguageSelect } from '../common/LanguageSelect';
import { ThemeToggle } from '../common/ThemeToggle';

interface NavItem {
  to: string;
  icon: ReactNode;
  label: [string, string];
}

const navItems: NavItem[] = [
  { to: '/', icon: <HomeIcon />, label: ['Bosh sahifa', 'Главная'] },
  { to: '/namoz', icon: <MosqueIcon />, label: ['Namoz', 'Намаз'] },
  { to: '/namoz-vaqtlari', icon: <ClockIcon />, label: ['Namoz vaqtlari', 'Время намаза'] },
  { to: '/iymon', icon: <BookIcon />, label: ['Iymon', 'Иман'] },
  { to: '/roza', icon: <CrescentIcon />, label: ['Ro‘za', 'Пост'] },
  { to: '/zakot', icon: <CoinsIcon />, label: ['Zakot', 'Закят'] },
  { to: '/namoz-organish', icon: <GraduateIcon />, label: ['Namoz o‘rganish', 'Обучение намазу'] },
  { to: '/qibla', icon: <CompassIcon />, label: ['Qibla', 'Кибла'] },
  { to: '/suralar', icon: <SurahIcon />, label: ['Suralar va oyatlar', 'Суры и аяты'] },
  { to: '/dasturchilar', icon: <CodeIcon />, label: ['API (dasturchilar)', 'API (разработчикам)'] },
  { to: '/loyiha-haqida', icon: <InfoIcon />, label: ['Loyiha haqida', 'О проекте'] },
];

export function Sidebar({ open, onNavigate, onClose }: { open?: boolean; onNavigate?: () => void; onClose?: () => void }) {
  const t = useT();
  return (
    <aside
      // Telefonda — chapdan chiquvchi drawer; desktopda — doimiy sidebar
      aria-label={t('Menyu', 'Меню')}
      className={`${
        open ? 'translate-x-0 shadow-2xl shadow-black/50' : '-translate-x-full max-lg:invisible'
      } fixed inset-y-0 left-0 z-40 flex w-[min(18rem,86vw)] flex-col overflow-hidden bg-primary-900 bg-cover bg-center text-white transition-[transform,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:visible lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:self-start lg:translate-x-0 lg:shadow-none`}
      style={{ backgroundImage: 'url(/images/quran-sidebar.webp)' }}
    >
      {/* Butun sidebar bo'ylab rasm ustida qorong'i qatlam: tepada menyu o'qilishi uchun quyuqroq */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary-900/90 via-primary-900/70 to-black/40" />

      {/* Logotip */}
      <div className="relative flex items-center gap-3 px-5 py-4 lg:py-5">
        <img
          src="/images/iymon-logo.webp"
          alt={t('Iymon logotipi', 'Логотип Iymon')}
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-xl object-cover"
        />
        <div>
          <p className="bg-gradient-to-b from-[#f7e3a3] via-[#e9c46a] to-accent-500 bg-clip-text font-brand text-[1.75rem] font-bold leading-none tracking-wide text-transparent drop-shadow-sm">
            Iymon
          </p>
          <p className="mt-1 text-xs text-white/70">{t('Islomiy ta’lim platformasi', 'Исламская образовательная платформа')}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('Menyuni yopish', 'Закрыть меню')}
          className="tap-press -mr-2 ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 lg:hidden"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Telefon: til va mavzu (desktopda — header'da) */}
      <div className="relative mx-3 mb-2 flex items-center justify-between gap-2 rounded-2xl bg-black/25 p-2 ring-1 ring-white/10 md:hidden">
        <LanguageSelect align="left" />
        <ThemeToggle />
      </div>

      {/* Navigatsiya */}
      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium lg:min-h-0 ${
                isActive ? 'bg-primary-500 text-white shadow-[0_0_12px_rgb(31_138_76/0.45)]' : 'nav-neon'
              }`
            }
          >
            {item.icon}
            <span>{t(...item.label)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Hadis bloki — sidebar foni ustida shaffof panel; past ekranlarda (telefon) menyuga joy qoldirish uchun yashiriladi */}
      <div className="relative mx-3 mb-4 flex shrink-0 flex-col [@media(max-height:700px)]:hidden items-center rounded-2xl bg-black/35 p-5 text-center ring-1 ring-white/15 backdrop-blur-sm">
        <QuoteIcon className="h-5 w-5 text-accent-400" />
        <p className="mt-2 text-sm italic leading-relaxed text-white drop-shadow">
          {t('"Albatta, zikr qilish mo‘minlarning qalblarini tinchlantiradi."', '«Разве не поминанием Аллаха утешаются сердца?»')}
        </p>
        <p className="mt-2 text-xs text-white/75 drop-shadow">{t('(Ra’d surasi, 28-oyat)', '(Сура «Гром», 13:28, пер. Э. Кулиева)')}</p>
      </div>
    </aside>
  );
}
