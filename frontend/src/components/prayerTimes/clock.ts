import { useEffect, useState } from 'react';
import type { PrayerTimings } from '../../types/prayer';

export const TIMEZONE = 'Asia/Tashkent';

export interface ClockNow {
  /** 'YYYY-MM-DD' (Toshkent vaqti bo'yicha) */
  iso: string;
  /** Yarim tundan beri o'tgan soniyalar */
  seconds: number;
  /** 'HH:MM:SS' */
  time: string;
  /** 0 = yakshanba … 6 = shanba */
  weekday: number;
  date: Date;
}

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
});
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Hozirgi vaqt Toshkent mintaqasida (foydalanuvchi qaysi mintaqada bo'lishidan qat'i nazar) */
export function tashkentNow(date = new Date()): ClockNow {
  const p = Object.fromEntries(partsFormatter.formatToParts(date).map((x) => [x.type, x.value]));
  const h = Number(p.hour), m = Number(p.minute), s = Number(p.second);
  return {
    iso: `${p.year}-${p.month}-${p.day}`,
    seconds: h * 3600 + m * 60 + s,
    time: `${p.hour}:${p.minute}:${p.second}`,
    weekday: WEEKDAY_INDEX[p.weekday] ?? 0,
    date,
  };
}

/** Har soniyada yangilanadigan Toshkent soati */
export function useTashkentClock(): ClockNow {
  const [now, setNow] = useState(() => tashkentNow());
  useEffect(() => {
    const id = window.setInterval(() => setNow(tashkentNow()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** '2026-10-15' + n kun */
export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const PRAYER_ORDER = ['bomdod', 'quyosh', 'peshin', 'asr', 'shom', 'xufton'] as const;
export type PrayerKey = (typeof PRAYER_ORDER)[number];

export function hmToSeconds(hm: string): number {
  const [h = '0', m = '0'] = hm.split(':');
  return Number(h) * 3600 + Number(m) * 60;
}

export function formatDuration(total: number): string {
  const safe = Math.max(0, Math.floor(total));
  const h = Math.floor(safe / 3600), m = Math.floor((safe % 3600) / 60), s = safe % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export interface CurrentPeriod {
  /** Oxirgi boshlangan vaqt (bomdod yoki xuftondan oldin — kechagi xufton) */
  current: PrayerKey;
  /** Keyingi vaqt */
  next: PrayerKey;
  /** Keyingi vaqtgacha qolgan soniyalar */
  remaining: number;
  /** Joriy oraliqning o'tgan qismi (0..1) */
  progress: number;
}

/**
 * Hozirgi oraliq: ro'yxatdagi oxirgi boshlangan vaqtdan keyingisigacha.
 * `tomorrowBomdod` bo'lmasa, xuftondan keyin bugungi bomdod vaqti taxminan olinadi.
 */
export function currentPeriod(t: PrayerTimings, now: number, tomorrowBomdod?: string): CurrentPeriod {
  const sec = (k: PrayerKey) => hmToSeconds(t[k]);
  let current: PrayerKey;
  let next: PrayerKey;
  let start: number;
  let end: number;

  if (now < sec('bomdod')) {
    current = 'xufton';
    next = 'bomdod';
    start = sec('xufton') - 86400;
    end = sec('bomdod');
  } else {
    const idx = PRAYER_ORDER.reduce((acc, k, i) => (sec(k) <= now ? i : acc), 0);
    current = PRAYER_ORDER[idx];
    start = sec(current);
    if (current === 'xufton') {
      next = 'bomdod';
      end = 86400 + hmToSeconds(tomorrowBomdod ?? t.bomdod);
    } else {
      next = PRAYER_ORDER[idx + 1];
      end = sec(next);
    }
  }
  const span = Math.max(1, end - start);
  return { current, next, remaining: end - now, progress: Math.min(1, Math.max(0, (now - start) / span)) };
}

// --- Hijriy sana (Umm al-Quro taqvimi) --------------------------------------
const HIJRI_MONTHS = [
  'Muharram', 'Safar', 'Rabiul-avval', 'Rabiul-oxir', 'Jumadul-avval', 'Jumadul-oxir',
  'Rajab', 'Sha’bon', 'Ramazon', 'Shavvol', 'Zulqa’da', 'Zulhijja',
];
const HIJRI_MONTHS_RU = [
  'Мухаррам', 'Сафар', 'Раби аль-авваль', 'Раби ас-сани', 'Джумада аль-уля', 'Джумада ас-сания',
  'Раджаб', 'Шаабан', 'Рамадан', 'Шавваль', 'Зуль-када', 'Зуль-хиджа',
];
const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  timeZone: TIMEZONE,
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
});

export function hijriDate(date: Date, lang: 'uz' | 'ru' = 'uz'): string | null {
  try {
    const p = Object.fromEntries(hijriFormatter.formatToParts(date).map((x) => [x.type, x.value]));
    const month = (lang === 'ru' ? HIJRI_MONTHS_RU : HIJRI_MONTHS)[Number(p.month) - 1];
    return month ? `${Number(p.day)} ${month} ${Number(p.year)}` : null;
  } catch {
    return null;
  }
}

// --- Qibla yo'nalishi --------------------------------------------------------
const KAABA = { lat: 21.4225, lon: 39.8262 };

/** Hudud markazlari (viloyat markaz shaharlari) koordinatalari */
export const REGION_COORDS: Record<string, { lat: number; lon: number; city: string }> = {
  Toshkent: { lat: 41.2995, lon: 69.2401, city: 'Toshkent' },
  Andijon: { lat: 40.7821, lon: 72.3442, city: 'Andijon' },
  Buxoro: { lat: 39.7681, lon: 64.4556, city: 'Buxoro' },
  "Farg'ona": { lat: 40.3864, lon: 71.7864, city: "Farg'ona" },
  Jizzax: { lat: 40.1158, lon: 67.8422, city: 'Jizzax' },
  Namangan: { lat: 40.9983, lon: 71.6726, city: 'Namangan' },
  Navoiy: { lat: 40.0844, lon: 65.3792, city: 'Navoiy' },
  Qashqadaryo: { lat: 38.8606, lon: 65.7891, city: 'Qarshi' },
  "Qoraqalpog'iston": { lat: 42.4531, lon: 59.6103, city: 'Nukus' },
  Samarqand: { lat: 39.6542, lon: 66.9597, city: 'Samarqand' },
  Sirdaryo: { lat: 40.4897, lon: 68.7842, city: 'Guliston' },
  Surxandaryo: { lat: 37.2242, lon: 67.2783, city: 'Termiz' },
  Xiva: { lat: 41.3783, lon: 60.3639, city: 'Xiva' },
};

const CITIES_RU: Record<string, string> = {
  Toshkent: 'Ташкент', Andijon: 'Андижан', Buxoro: 'Бухара', "Farg'ona": 'Фергана', Jizzax: 'Джизак', Namangan: 'Наманган',
  Navoiy: 'Навои', Qarshi: 'Карши', Nukus: 'Нукус', Samarqand: 'Самарканд', Guliston: 'Гулистан', Termiz: 'Термез', Xiva: 'Хива',
};

/** Hudud markazi shahri tanlangan tilda */
export function cityLabel(region: string, lang: 'uz' | 'ru'): string {
  const city = REGION_COORDS[region]?.city ?? region;
  return lang === 'ru' ? CITIES_RU[city] ?? city : city;
}

/** Ka'baga yo'nalish: shimoldan soat mili bo'yicha gradus (katta doira formulasi) */
export function qiblaBearing(region: string): number | null {
  const c = REGION_COORDS[region];
  if (!c) return null;
  const r = Math.PI / 180;
  const p1 = c.lat * r, p2 = KAABA.lat * r, dl = (KAABA.lon - c.lon) * r;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) / r + 360) % 360;
}
