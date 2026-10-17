/**
 * Ovoz faolligini aniqlash (VAD) — xona shovqiniga moslashuvchi chegara.
 * Shovqin darajasi sekin ko'tariladi va tez tushadi: doimiy shovqin (ventilyator, ko'cha) «gapiryapti»
 * deb qolib ketmaydi, past ovozli mikrofonda esa chegara pasayadi.
 */

/** Shovqin darajasini yangilash (har kadrda, ~60 marta/soniya) */
export function nextNoiseFloor(noise: number, rms: number): number {
  if (!Number.isFinite(noise) || noise <= 0) return rms;
  if (rms < noise) return noise + (rms - noise) * 0.2; // tez tushadi
  return noise + (rms - noise) * 0.002; // sekin ko'tariladi (~8 soniyada moslashadi)
}

/** Gapirish chegarasi: shovqindan bir necha barobar baland, lekin sezgirlik chegarasidan oshmaydi */
export function speechThreshold(noise: number, base: number): number {
  return Math.min(base, Math.max(base / 3, noise * 3));
}
