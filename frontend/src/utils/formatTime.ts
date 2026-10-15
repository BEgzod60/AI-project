/** Vaqt bilan ishlash utilitlari */
import { MONTHS_UZ } from './constants';

/** 'HH:MM' -> sekundlar */
export function timeToSeconds(time: string): number {
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) * 3600 + Number(m) * 60;
}

/** Sekundlarni '01:58:22' formatiga o'giradi */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/** Berilgan kunga oid sana stringini Uzbekchada chiqaradi: '15-oktabr 2026' */
export function formatUzDate(date: Date): string {
  return date.getDate() + '-' + MONTHS_UZ[date.getMonth()] + ' ' + date.getFullYear();
}
