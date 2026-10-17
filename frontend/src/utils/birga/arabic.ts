/**
 * Eshitilgan arabcha nutqni (brauzer nutqni aniqlash natijasi) Tanzil matni bilan solishtirish.
 * Harakatlar va Usmoniy imlo belgilari olib tashlanadi, alif/yo/to shakllari bir xillashtiriladi.
 */

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
const NON_LETTERS = /[^ء-ي\s]/g;

export function normalizeArabic(text: string): string {
  return text
    .replace(MARKS, '')
    .replace(/[ٱأإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(NON_LETTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ArabicToken {
  /** Ekranda ko'rsatiladigan asl so'z */
  display: string;
  /** Solishtirish uchun me'yorlangan shakli */
  norm: string;
}

/** Asl so'z va uning me'yorlangan shakli (vaqf belgilari kabi alohida belgilar tashlab yuboriladi) */
export function arabicTokens(text: string): ArabicToken[] {
  return text
    .split(/\s+/)
    .map((display) => ({ display, norm: normalizeArabic(display).replace(/\s/g, '') }))
    .filter((t) => t.norm);
}

export function arabicWords(text: string): string[] {
  return arabicTokens(text).map((t) => t.norm);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Usmoniy imlo va nutqni aniqlash imlosi farqlari uchun kichik xatoga yo'l qo'yiladi */
export function similarWord(expected: string, heard: string): boolean {
  if (expected === heard) return true;
  const len = Math.max(expected.length, heard.length);
  if (len < 3) return false;
  return levenshtein(expected, heard) <= (len >= 6 ? 2 : 1);
}

export interface MatchResult {
  /** Tartib bo'yicha topilgan so'zlar soni */
  matched: number;
  total: number;
  ratio: number;
  /** Oxirgi ikki so'zdan biri eshitildi — o'qish oxiriga yetgan bo'lishi mumkin */
  reachedEnd: boolean;
  /** Mos kelgan kutilgan so'zlar indekslari */
  indices: number[];
}

// Brauzer bir necha so'zni tanimay o'tkazib yuborishi mumkin — shuncha so'z oldinga qidiriladi
const LOOKAHEAD = 10;

/** Eshitilgan so'zlarni kutilgan matn bilan tartib bo'yicha moslaydi (o'tkazib yuborilgan so'zlarga chidamli) */
export function matchRecitation(expected: string[], heardText: string): MatchResult {
  const heard = arabicWords(heardText);
  let pointer = 0;
  let matched = 0;
  let lastMatched = -1;
  const indices: number[] = [];
  for (const word of heard) {
    for (let k = pointer; k < Math.min(expected.length, pointer + LOOKAHEAD); k++) {
      if (similarWord(expected[k], word)) {
        matched++;
        lastMatched = k;
        indices.push(k);
        pointer = k + 1;
        break;
      }
    }
  }
  const total = expected.length;
  return {
    matched,
    total,
    ratio: total ? matched / total : 0,
    reachedEnd: total > 0 && lastMatched >= total - 2,
    indices,
  };
}
