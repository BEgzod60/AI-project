import type { Mosque } from '../../types/qibla';
import { getLang } from '../../i18n';

/** OSM'da nomi kiritilmagan bo'lsa — nom o'ylab topilmaydi */
export function mosqueTitle(m: Mosque): string {
  return m.name || (getLang() === 'ru' ? 'Мечеть (название на карте не указано)' : 'Masjid (nomi xaritada ko‘rsatilmagan)');
}

/** Tashqi navigatsiya (telefonda xarita ilovasi ochiladi) */
export function directionsUrl(m: Mosque): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}&travelmode=walking`;
}
