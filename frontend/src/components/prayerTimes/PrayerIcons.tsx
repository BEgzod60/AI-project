import type { ReactNode } from 'react';
import type { PrayerKey } from './clock';

/** Kun vaqtiga mos chiziqli ikonkalar (rang — currentColor) */
const ICONS: Record<PrayerKey, ReactNode> = {
  // Tong: ufq ustida yarim quyosh, xira nurlar
  bomdod: (
    <>
      <path strokeLinecap="round" d="M3 18h18M7 18a5 5 0 0 1 10 0" />
      <path strokeLinecap="round" d="M12 8v2M5.6 11.6l1.4 1.4M18.4 11.6 17 13" opacity=".55" />
    </>
  ),
  // Quyosh chiqishi: ufqdan ko'tarilayotgan quyosh va yuqoriga strelka
  quyosh: (
    <>
      <path strokeLinecap="round" d="M3 19h18M7.5 19a4.5 4.5 0 0 1 9 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6m-2.5-3.5L12 3l2.5 2.5M4.9 12.1l1.4 1.4M19.1 12.1l-1.4 1.4" />
    </>
  ),
  // Peshin: to'liq quyosh
  peshin: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </>
  ),
  // Asr: pastlay boshlagan quyosh
  asr: (
    <>
      <path strokeLinecap="round" d="M3 20h18" />
      <circle cx="12" cy="13" r="3.5" />
      <path strokeLinecap="round" d="M12 5.5v2M5.5 13h-2M20.5 13h-2M6.8 7.8l1.4 1.4M17.2 7.8l-1.4 1.4" />
    </>
  ),
  // Shom: botayotgan quyosh va pastga strelka
  shom: (
    <>
      <path strokeLinecap="round" d="M3 19h18M7.5 19a4.5 4.5 0 0 1 9 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9V3m-2.5 3.5L12 9l2.5-2.5M4.9 12.1l1.4 1.4M19.1 12.1l-1.4 1.4" />
    </>
  ),
  // Xufton: hilol
  xufton: <path strokeLinejoin="round" d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />,
};

export function PrayerIcon({ prayer, className = 'h-7 w-7' }: { prayer: PrayerKey; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden className={className}>
      {ICONS[prayer]}
    </svg>
  );
}
