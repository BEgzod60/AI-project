import type { Mosque } from '../../types/qibla';

/** OSM'da nomi kiritilmagan bo'lsa — nom o'ylab topilmaydi */
export function mosqueTitle(m: Mosque): string {
  return m.name || 'Masjid (nomi xaritada ko‘rsatilmagan)';
}

/** Tashqi navigatsiya (telefonda xarita ilovasi ochiladi) */
export function directionsUrl(m: Mosque): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}&travelmode=walking`;
}
