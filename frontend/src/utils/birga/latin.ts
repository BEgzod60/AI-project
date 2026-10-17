/**
 * Eshitilgan arabcha nutqni lotin yozuvida ko'rsatish.
 * Brauzer arabcha so'zlarni harakatsiz qaytaradi — ularni harfma-harf lotinchaga o'girib bo'lmaydi
 * (unlilar noma'lum). Shuning uchun tanilgan so'zlar Tanzil oyatlariga moslanadi va o'sha oyatlarning
 * muslim.uz'dagi tasdiqlangan lotincha o'qilishi ko'rsatiladi.
 */
import { arabicTokens } from './arabic';

/** «Bismillah... 1. Alhamdulillahi... 2. ... 6-7. ...» → oyatlar ro'yxati (raqamlarsiz) */
export function splitTransliteration(text: string): string[] {
  return labeledTransliteration(text).map((part) => part.text);
}

/** Oyatlar va manbadagi raqami («1», «6-7»; raqamsiz Basmala uchun bo'sh) */
export function labeledTransliteration(text: string): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = [];
  const re = /(?:^|\s)(\d+(?:-\d+)?)\.\s+/g;
  let last = 0;
  let label = '';
  for (const m of text.matchAll(re)) {
    const chunk = text.slice(last, m.index).trim();
    if (chunk) out.push({ label, text: chunk });
    label = m[1];
    last = (m.index ?? 0) + m[0].length;
  }
  const tail = text.slice(last).trim();
  if (tail) out.push({ label, text: tail });
  return out;
}

/** Har bir oyatning so'z indekslari oralig'i [boshi, oxiri) — arabicTokens(ayahs.join(' ')) bo'yicha */
export function ayahRanges(ayahs: string[]): [number, number][] {
  let start = 0;
  return ayahs.map((ayah) => {
    const n = arabicTokens(ayah).length;
    const range: [number, number] = [start, start + n];
    start += n;
    return range;
  });
}

export interface LatinAyah {
  number: number;
  /** Manbadagi raqami (Fotihada Basmala raqamsiz, «6-7» kabi) */
  label: string;
  latin: string;
  /** Shu oyatdagi so'zlarning qancha qismi eshitildi (0..1) */
  heard: number;
}

/**
 * Oyatlar lotincha o'qilishi va har biri qancha eshitilgani.
 * Lotincha oyatlar soni arabcha oyatlarga teng bo'lmasa — null (moslab bo'lmaydi, taxmin qilinmaydi).
 */
export function latinAyahs(arabic: string[], transliteration: string, matchedIndices: number[]): LatinAyah[] | null {
  const latin = labeledTransliteration(transliteration);
  if (!arabic.length || latin.length !== arabic.length) return null;
  const matched = new Set(matchedIndices);
  return ayahRanges(arabic).map(([start, end], i) => {
    let hits = 0;
    for (let k = start; k < end; k++) if (matched.has(k)) hits++;
    return { number: i + 1, label: latin[i].label, latin: latin[i].text, heard: end > start ? hits / (end - start) : 0 };
  });
}

/** Oyat «o'qilgan» deb ko'rsatiladigan eng kam ulush */
export const AYAH_HEARD = 0.5;
