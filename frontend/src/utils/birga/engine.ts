/**
 * «Birga o'qish» bosqichidan qachon o'tishni hal qiluvchi sof funksiyalar.
 * Hech qaysi qoida foydalanuvchi o'qishni tugatganini tasdiqlamaydi — faqat ekrandagi
 * ko'rsatmani keyingisiga o'tkazadi. Gapirayotgan paytda taymer kutib turadi (shoshirmaslik uchun).
 */
import type { BirgaSettings, BirgaSettingsSchema, Stage } from '../../types/birga';
import type { MatchResult } from './arabic';

export type AdvanceReason = 'speech' | 'voice' | 'timer';

/** Uch marta aytiladigan tasbeh (ruku', sajda) uchun eng kam vaqt — o'qib ulgurish uchun */
export const MIN_TASBIH_SECONDS = 8;

/** Bosqichning taxminiy davomiyligi (soniya) */
export function expectedSeconds(stage: Stage, text: string, settings: BirgaSettings, schema: BirgaSettingsSchema): number {
  if (stage.timing) {
    const [min, max] = stage.timing;
    const value = settings.speed === 'sekin' ? max : settings.speed === 'tez' ? min : (min + max) / 2;
    const tasbih = stage.zikr?.some((z) => z.times >= 3);
    return tasbih ? Math.max(MIN_TASBIH_SECONDS, value) : value;
  }
  const cps = schema.speeds[settings.speed];
  const { min, max } = schema.recitation_seconds;
  return Math.min(max, Math.max(min, Math.round(text.replace(/\s+/g, ' ').length / cps)));
}

/**
 * Uzun matnni vaqt bo'yicha surish ulushi (0..1): darhol boshlanadi va taxminiy vaqtning 75% ida
 * oxiriga yetadi — o'quvchi matndan orqada qolmasin.
 */
export const SCROLL_FINISH_AT = 0.75;
export function scrollProgress(elapsed: number, expected: number): number {
  if (expected <= 0) return 1;
  return Math.min(1, Math.max(0, elapsed / (expected * SCROLL_FINISH_AT)));
}

export interface EngineInput {
  stage: Stage;
  /** Bosqich boshlanganidan beri o'tgan vaqt (soniya) */
  elapsed: number;
  expected: number;
  /** Zaxira taymer uzunligi (soniya) — AI tasdiqlay olmaganda boshlanadi */
  fallback: number;
  voice: {
    /** Mikrofon ishlayaptimi */
    active: boolean;
    speaking: boolean;
    /** Shu bosqichda ovoz eshitildimi */
    heard: boolean;
    /** Oxirgi ovozdan beri jimlik (soniya) */
    silence: number;
    /** Shu bosqichda jami gapirilgan vaqt (soniya) */
    spokeFor: number;
  };
  /** Sura bo'lsa va nutqni aniqlash ishlasa — moslik natijasi */
  match: MatchResult | null;
  matchThreshold: number;
  /** Zaxira taymer boshlangan payt (elapsed, soniya); boshlanmagan bo'lsa null */
  countdownFrom: number | null;
}

export interface EngineResult {
  advance: AdvanceReason | null;
  /** Keyingi tikka uzatiladigan taymer holati */
  countdownFrom: number | null;
  /** Ekrandagi aylana taymer; null — AI tinglayapti, taymer yo'q */
  countdown: { remaining: number; total: number } | null;
}

/** O'qib bo'lingach shuncha jimlikdan keyin zaxira taymer boshlanadi (oyatlar orasidagi nafasga chidamli) */
export const SILENCE_BEFORE_COUNTDOWN = 2.5;
/**
 * Matni tanib bo'lmaydigan duolar (arabchasi bazada yo'q) va tanilmagan suralar uchun: taxminiy vaqtning
 * kamida shuncha qismi davomida gapirilgan bo'lsa, jimlikdan so'ng zaxira taymersiz o'tiladi.
 */
export const VOICE_COVERAGE = 0.5;
/** Shovqin tufayli «gapiryapti» to'xtamasa ham cheksiz kutilmaydi */
export const HARD_CAP_FACTOR = 3;

/**
 * Sura va duolarda: avval AI tinglaydi, taymer yo'q. Nutq tanilib, oxiriga yetilsa — darhol o'tiladi.
 * Yetarlicha gapirilib (taxminiy vaqtning yarmidan ko'pi), so'ng jimlik bo'lsa ham — taymersiz o'tiladi.
 * Zaxira taymer faqat AI tasdiqlay olmaganda boshlanadi:
 *  - foydalanuvchi qisqa gapirib, jim bo'lib qoldi (matn tanilmadi), yoki
 *  - umuman ovoz eshitilmadi va taxminiy vaqt o'tdi (ichida o'qilgan bo'lishi mumkin), yoki
 *  - mikrofon ishlamaydi (unda taymer boshidan: taxminiy vaqt + zaxira).
 * Foydalanuvchi qayta gapirsa taymer bekor bo'ladi.
 */
export function evaluateStage(input: EngineInput): EngineResult {
  const { stage, elapsed, expected, fallback, voice, match, matchThreshold, countdownFrom } = input;
  const timerOnly = (total: number): EngineResult => ({
    advance: elapsed >= total ? 'timer' : null,
    countdownFrom: 0,
    countdown: { remaining: Math.max(0, total - elapsed), total },
  });

  // Ruku', sajda va boshqa amallar — faqat vizual taymer
  if (stage.kind !== 'recitation') return timerOnly(expected);
  // Mikrofon yo'q — AI ham yo'q
  if (!voice.active) return timerOnly(expected + fallback);

  if (match && match.reachedEnd && match.ratio >= matchThreshold && !voice.speaking) {
    return { advance: 'speech', countdownFrom: null, countdown: null };
  }
  if (elapsed >= expected * HARD_CAP_FACTOR + fallback) {
    return { advance: voice.heard ? 'voice' : 'timer', countdownFrom: null, countdown: null };
  }

  // O'qib bo'lindi: yetarlicha gapirildi va so'ng jimlik — taymersiz o'tiladi
  if (voice.heard && !voice.speaking && voice.silence >= SILENCE_BEFORE_COUNTDOWN && voice.spokeFor >= expected * VOICE_COVERAGE) {
    return { advance: 'voice', countdownFrom: null, countdown: null };
  }

  const aiGaveUp = voice.speaking
    ? false
    : voice.heard
      ? voice.silence >= SILENCE_BEFORE_COUNTDOWN
      : elapsed >= expected;
  if (!aiGaveUp) return { advance: null, countdownFrom: null, countdown: null };

  const from = countdownFrom ?? elapsed;
  const remaining = fallback - (elapsed - from);
  if (remaining <= 0) return { advance: voice.heard ? 'voice' : 'timer', countdownFrom: null, countdown: null };
  return { advance: null, countdownFrom: from, countdown: { remaining, total: fallback } };
}
