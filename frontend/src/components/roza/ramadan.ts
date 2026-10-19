import { addDays, TIMEZONE } from '../prayerTimes/clock';

const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  timeZone: TIMEZONE,
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
});

/** '2026-10-15' -> hijriy oy (1..12) va kun (Umm al-Quro taqvimi) */
export function hijriOf(iso: string): { month: number; day: number } | null {
  try {
    const p = Object.fromEntries(hijriFormatter.formatToParts(new Date(`${iso}T12:00:00Z`)).map((x) => [x.type, x.value]));
    return { month: Number(p.month), day: Number(p.day) };
  } catch {
    return null;
  }
}

const RAMAZON = 9;

/**
 * Joriy (bugun Ramazon bo'lsa) yoki keyingi Ramazon oyi: birinchi va oxirgi kun.
 * Umm al-Quro taqvimi bo'yicha taxminiy — O'zbekistonda boshlanishi bir kunga farq qilishi mumkin.
 */
export function ramadanRange(todayIso: string): { start: string; end: string } | null {
  let iso = todayIso;
  // Bugun Ramazon bo'lsa — oyning boshiga qaytamiz
  while (hijriOf(addDays(iso, -1))?.month === RAMAZON && hijriOf(iso)?.month === RAMAZON) iso = addDays(iso, -1);
  for (let i = 0; i < 400 && hijriOf(iso)?.month !== RAMAZON; i++) iso = addDays(iso, 1);
  if (hijriOf(iso)?.month !== RAMAZON) return null;
  const start = iso;
  while (hijriOf(addDays(iso, 1))?.month === RAMAZON) iso = addDays(iso, 1);
  return { start, end: iso };
}

/** Oraliqdagi (yil, oy) juftliklari — har bir oy uchun alohida so'rov yuboriladi */
export function monthsBetween(start: string, end: string): { y: number; m: number }[] {
  const out: { y: number; m: number }[] = [];
  let [y, m] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push({ y, m });
    m === 12 ? ((y += 1), (m = 1)) : (m += 1);
  }
  return out;
}
