import { apiGet } from './api';
import type { MonthlyPrayerTimes, PrayerDay, PrayerTimesData, YearlyPrayerTimes } from '../types/prayer';

/** Kunlik namoz vaqtlarini backenddan olish */
export function getDailyPrayerTimes(city?: string): Promise<PrayerTimesData> {
  return apiGet<PrayerTimesData>('/prayer-times/', { city });
}

/** Oylik jadval */
export function getMonthlyPrayerTimes(city: string, month: number, year: number): Promise<MonthlyPrayerTimes> {
  return apiGet<MonthlyPrayerTimes>('/prayer-times/month/', { city, month: String(month), year: String(year) });
}

/** Yillik jadval (faqat e'lon qilingan oylar) */
export function getYearlyPrayerTimes(city: string, year: number): Promise<YearlyPrayerTimes> {
  return apiGet<YearlyPrayerTimes>('/prayer-times/year/', { city, year: String(year) });
}

/** Joriy va keyingi oy kunlari (keyingi oy hali e'lon qilinmagan bo'lsa — faqat joriy) */
export async function getMonthWithNext(region: string, y: number, m: number): Promise<PrayerDay[]> {
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  const [cur, nxt] = await Promise.allSettled([
    getMonthlyPrayerTimes(region, m, y),
    getMonthlyPrayerTimes(region, next.m, next.y),
  ]);
  if (cur.status === 'rejected') throw cur.reason;
  return [...cur.value.days, ...(nxt.status === 'fulfilled' ? nxt.value.days : [])];
}
