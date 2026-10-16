import type { ReactNode } from 'react';
import type { TopicIcon } from '../../types/namoz';

/** Namoz mavzulari uchun chiziqli SVG ikonkalar (rang — currentColor) */
const paths: Record<TopicIcon, ReactNode> = {
  // Tomchi — poklanish
  droplet: (
    <>
      <path strokeLinejoin="round" d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" />
      <path strokeLinecap="round" d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5" />
    </>
  ),
  // To'lqinlar — g'usl
  waves: (
    <>
      <path strokeLinecap="round" d="M3 8c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0" />
      <path strokeLinecap="round" d="M3 13c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0" />
      <path strokeLinecap="round" d="M3 18c1.5-1.3 3-1.3 4.5 0s3 1.3 4.5 0 3-1.3 4.5 0 3 1.3 4.5 0" />
    </>
  ),
  // Qo'l va tomchilar — tahorat
  hands_water: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 15.5 8 13l4 1.5h3.5a1.5 1.5 0 0 1 0 3H12m3.5 0 3.8-1.9a1.5 1.5 0 0 1 1.5 2.6L15 21H8l-4-2" />
      <path strokeLinejoin="round" d="M12 3s2 2.2 2 3.6a2 2 0 0 1-4 0C10 5.2 12 3 12 3Z" />
      <path strokeLinejoin="round" d="M17.5 6s1.3 1.4 1.3 2.3a1.3 1.3 0 0 1-2.6 0c0-.9 1.3-2.3 1.3-2.3Z" />
    </>
  ),
  // Tuproq tepalik — tayammum
  earth: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 19h19l-5.5-8-3.5 5-2.5-3-7.5 6Z" />
      <path strokeLinecap="round" d="M6 22h12M17.5 5.5v.01M14 4v.01M20 8v.01" />
    </>
  ),
  // Masjid — namoz
  mosque: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 21h16M6 21v-7a6 6 0 0 1 12 0v7M10 21v-3a2 2 0 0 1 4 0v3M12 3c1.5 1.5 2 2.7 2 4h-4c0-1.3.5-2.5 2-4Zm0 0V2" />
  ),
  // Ochiq kitob — suralar
  book: (
    <>
      <path strokeLinejoin="round" d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5Z" />
      <path strokeLinecap="round" d="M12 6.5v13" />
    </>
  ),
  // Duo qilayotgan qo'llar
  dua: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21v-5.5L7.2 9.3a1.3 1.3 0 0 1 2.2-1.4l2.6 4.1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-5.5l3.3-6.2a1.3 1.3 0 0 0-2.2-1.4L12 12" />
      <path strokeLinecap="round" d="M8 21h8M12 3v1" />
    </>
  ),
  // Orqaga aylanuvchi soat — qazo
  clock: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 4v4h4" />
      <path strokeLinecap="round" d="M12 8v4l2.5 2.5" />
    </>
  ),
  // Qatlamlar — turli namozlar
  layers: (
    <>
      <path strokeLinejoin="round" d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m3 12.5 9 5 9-5M3 16.5l9 5 9-5" />
    </>
  ),
  // Hilol va yulduz — e'tikof
  moon: (
    <>
      <path strokeLinejoin="round" d="M15 3.5a8.5 8.5 0 1 0 5.5 13A7 7 0 0 1 15 3.5Z" />
      <path strokeLinejoin="round" d="m18 6 .6 1.4L20 8l-1.4.6L18 10l-.6-1.4L16 8l1.4-.6L18 6Z" />
    </>
  ),
  // Sajda — yer va egilgan yoy
  sajda: (
    <>
      <path strokeLinecap="round" d="M3 17h18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 17c0-5 3-9 7-9s7 4 7 9" />
      <circle cx="7" cy="14.5" r="1.5" />
    </>
  ),
  // Fonar — ibratli namozlar
  lantern: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2M9 6h6l1 2v9l-1 2H9l-1-2V8l1-2ZM8 8h8M8 17h8M10 21h4" />
      <path strokeLinejoin="round" d="M12 10.5s1.5 1.5 1.5 2.6a1.5 1.5 0 0 1-3 0c0-1.1 1.5-2.6 1.5-2.6Z" />
    </>
  ),
  // --- Iymon bo'limi ---
  // O'ram — din va shariat
  scroll: (
    <>
      <path strokeLinejoin="round" d="M7 4h11a2 2 0 0 1 2 2v1h-4M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7" />
      <path strokeLinecap="round" d="M5 18a2 2 0 0 1 2-2h11M9 8.5h6M9 11.5h6" />
    </>
  ),
  // Qalb — iymon
  heart: (
    <path strokeLinejoin="round" d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" />
  ),
  // Sakkiz qirrali yulduz (islomiy naqsh)
  star8: (
    <>
      <path strokeLinejoin="round" d="M6 6h12v12H6z" />
      <path strokeLinejoin="round" d="m12 3.5 8.5 8.5-8.5 8.5L3.5 12 12 3.5Z" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  // Qanotlar — farishtalar
  wings: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9C10 5.5 6 4 2.5 4.5 3 9 6 12 11 12.5M12 9c2-3.5 6-5 9.5-4.5C21 9 18 12 13 12.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 12.5c-3 .5-5 2.5-5.5 5 3 .3 5-.7 6.5-2.5 1.5 1.8 3.5 2.8 6.5 2.5-.5-2.5-2.5-4.5-5.5-5" />
    </>
  ),
  // Ustunlar — shartlar
  pillars: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5 12 4l9 5.5M4 20h16M5 17.5h14" />
      <path strokeLinecap="round" d="M6.5 10v7.5M10 10v7.5M14 10v7.5M17.5 10v7.5" />
    </>
  ),
  // Ufq — oxirat
  horizon: (
    <>
      <path strokeLinecap="round" d="M3 16h18M6 19.5h12" />
      <path strokeLinecap="round" d="M7 16a5 5 0 0 1 10 0" />
      <path strokeLinecap="round" d="M12 4v3M4.9 8.1l2 2M19.1 8.1l-2 2" />
    </>
  ),
  // Qum soat — qadar
  hourglass: (
    <>
      <path strokeLinecap="round" d="M6 3h12M6 21h12" />
      <path strokeLinejoin="round" d="M7 3c0 4.5 5 6 5 9s-5 4.5-5 9M17 3c0 4.5-5 6-5 9s5 4.5 5 9" />
      <path strokeLinejoin="round" d="M9.5 18.5 12 16l2.5 2.5Z" />
    </>
  ),
  // Nihol — qayta tirilish
  sprout: (
    <>
      <path strokeLinecap="round" d="M12 21v-9M5 21h14" />
      <path strokeLinejoin="round" d="M12 12C12 7.5 9 5 4.5 5 4.5 9.5 7.5 12 12 12Zm0-2c0-3.5 2.5-6 7-6 0 4-2.5 6-7 6Z" />
    </>
  ),
  // Qalqon — aqida
  shield: (
    <>
      <path strokeLinejoin="round" d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </>
  ),
  // Jamoa
  people: (
    <>
      <circle cx="12" cy="7.5" r="2.5" />
      <circle cx="5.5" cy="9.5" r="2" />
      <circle cx="18.5" cy="9.5" r="2" />
      <path strokeLinecap="round" d="M7.5 20v-2a4.5 4.5 0 0 1 9 0v2M2.5 19v-1a3 3 0 0 1 4-2.8M21.5 19v-1a3 3 0 0 0-4-2.8" />
    </>
  ),
  // Tarozi — halol va harom
  scale: (
    <>
      <path strokeLinecap="round" d="M12 3v17M7 20h10M5 6h14" />
      <path strokeLinejoin="round" d="m5 6-3 7a3 3 0 0 0 6 0L5 6Zm14 0-3 7a3 3 0 0 0 6 0l-3-7Z" />
    </>
  ),
};

export function TopicIconSvg({ icon, className = 'h-6 w-6' }: { icon: TopicIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden className={className}>
      {paths[icon] ?? paths.mosque}
    </svg>
  );
}
