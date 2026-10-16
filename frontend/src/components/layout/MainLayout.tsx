import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DEFAULT_REGION, REGIONS, REGION_STORAGE_KEY } from '../../utils/constants';

export function MainLayout() {
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

  // Hudud tanlovni localStorage'da saqlash
  useEffect(() => {
    window.localStorage.setItem(REGION_STORAGE_KEY, region);
  }, [region]);

  return (
    <div className="flex min-h-screen">
      {/* Mobil qatlam: menyuga bosilganda fon */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Menyuni yopish"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          region={region}
          onRegionChange={setRegion}
          onMenuClick={() => setMenuOpen(true)}
        />
        <main className="flex-1">
          <Outlet context={{ region, setRegion }} />
        </main>
      </div>
    </div>
  );
}
