import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { DEFAULT_REGION, REGIONS, REGION_STORAGE_KEY } from '../../utils/constants';
import { useT } from '../../i18n';

export function MainLayout() {
  const t = useT();
  const [region, setRegion] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_REGION;
    const stored = window.localStorage.getItem(REGION_STORAGE_KEY);
    // Eski versiyada saqlangan, endi mavjud bo'lmagan hudud nomlarini tashlab yuboramiz
    return stored && (REGIONS as readonly string[]).includes(stored) ? stored : DEFAULT_REGION;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Mobil menyu: sahifa almashganda (ortga tugmasi va h.k.) yopiladi
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Mobil menyu: Escape bilan yopiladi
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Mobil menyu ochiqligida orqadagi sahifa surilmaydi
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  // Hudud tanlovni localStorage'da saqlash
  useEffect(() => {
    window.localStorage.setItem(REGION_STORAGE_KEY, region);
  }, [region]);

  return (
    <div className="flex min-h-screen">
      {/* Mobil qatlam: menyuga bosilganda fon */}
      <button
        type="button"
        tabIndex={menuOpen ? 0 : -1}
        aria-hidden={!menuOpen}
        aria-label={t('Menyuni yopish', 'Закрыть меню')}
        onClick={() => setMenuOpen(false)}
        className={`fixed inset-0 z-[35] bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          region={region}
          onRegionChange={setRegion}
        />
        <main className="pb-bottom-nav flex-1">
          <Outlet context={{ region, setRegion }} />
        </main>
      </div>

      <BottomNav menuOpen={menuOpen} onMenuClick={() => setMenuOpen((o) => !o)} />
    </div>
  );
}
