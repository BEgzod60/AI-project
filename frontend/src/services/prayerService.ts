import { apiGet } from './api';
import type { MonthlyPrayerTimes, PrayerTimesData, YearlyPrayerTimes } from '../types/prayer';

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
