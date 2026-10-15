import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  BookIcon,
  ClockIcon,
  CompassIcon,
  GraduateIcon,
  HomeIcon,
  InfoIcon,
  MosqueIcon,
  QuoteIcon,
  SurahIcon,
} from '../common/Icons';

interface NavItem {
  to: string;
  icon: ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/', icon: <HomeIcon />, label: 'Bosh sahifa' },
  { to: '/namoz', icon: <MosqueIcon />, label: 'Namoz' },
  { to: '/namoz-vaqtlari', icon: <ClockIcon />, label: 'Namoz vaqtlari' },
  { to: '/iymon', icon: <BookIcon />, label: 'Iymon' },
  { to: '/namoz-organish', icon: <GraduateIcon />, label: "Namoz o'rganish" },
  { to: '/qibla', icon: <CompassIcon />, label: 'Qibla' },
  { to: '/suralar', icon: <SurahIcon />, label: 'Suralar va zam suralar' },
  { to: '/loyiha-haqida', icon: <InfoIcon />, label: 'Loyiha haqida' },
];

export function Sidebar({ open }: { open?: boolean }) {
  return (
    <aside
      className={`${
        open ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden bg-primary-900 bg-cover bg-center text-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:translate-x-0`}
      style={{ backgroundImage: 'url(/images/quran-sidebar.png)' }}
    >
      {/* Butun sidebar bo'ylab rasm ustida qorong'i qatlam: tepada menyu o'qilishi uchun quyuqroq */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary-900/90 via-primary-900/70 to-black/40" />

      {/* Logotip */}
      <div className="relative flex items-center gap-3 px-5 py-5">
        <img
          src="/images/iymon-logo.png"
          alt="Iymon logotipi"
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-xl object-cover"
        />
        <div>
          <p className="bg-gradient-to-b from-[#f7e3a3] via-[#e9c46a] to-accent-500 bg-clip-text font-brand text-[1.75rem] font-bold leading-none tracking-wide text-transparent drop-shadow-sm">
            Iymon
          </p>
          <p className="mt-1 text-xs text-white/70">Islomiy ta'lim platformasi</p>
        </div>
      </div>

      {/* Navigatsiya */}
      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium ${
                isActive ? 'bg-primary-500 text-white shadow-[0_0_12px_rgb(31_138_76/0.45)]' : 'nav-neon'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Hadis bloki — sidebar foni ustida shaffof panel */}
      <div className="relative mx-3 mb-4 flex flex-col items-center rounded-2xl bg-black/35 p-5 text-center ring-1 ring-white/15 backdrop-blur-sm">
        <QuoteIcon className="h-5 w-5 text-accent-400" />
        <p className="mt-2 text-sm italic leading-relaxed text-white drop-shadow">
          "Albatta, zikr qilish mo'minlarning qalblarini tinchlantiradi."
        </p>
        <p className="mt-2 text-xs text-white/75 drop-shadow">(Ra'd surasi, 28-oyat)</p>
      </div>
    </aside>
  );
}
