/** Namoz vaqtlari — backend.Shape: apps/prayer_times/services.py qaytaradigan format */

export interface PrayerTimings {
  bomdod: string;
  quyosh: string;
  peshin: string;
  asr: string;
  shom: string;
  xufton: string;
}

export interface PrayerTimesData {
  city: string;
  date: string;
  timings: PrayerTimings;
  /** Keyingi (hoziurgi) namoz: bomdod | quyosh | peshin | asr | shom | xufton */
  upcoming: string | null;
  /** Ma'lumot manbasi (islom.uz) */
  source: string;
  timezone: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
}

export interface PrayerDay {
  /** 'YYYY-MM-DD' */
  date: string;
  timings: PrayerTimings;
}

export interface MonthlyPrayerTimes {
  city: string;
  month: number;
  year: number;
  days: PrayerDay[];
}

export interface YearlyPrayerTimes {
  city: string;
  year: number;
  /** Faqat e'lon qilingan oylar */
  months: { month: number; days: PrayerDay[] }[];
}
