/**
 * «Birga o'qish» bosqichidan qachon o'tishni hal qiluvchi sof funksiyalar.
 * Hech qaysi qoida foydalanuvchi o'qishni tugatganini tasdiqlamaydi — faqat ekrandagi
 * ko'rsatmani keyingisiga o'tkazadi. Gapirayotgan paytda taymer kutib turadi (shoshirmaslik uchun).
 */
import type { BirgaSettings, BirgaSettingsSchema, Stage } from '../../types/birga';
import type { MatchResult } from './arabic';

export type AdvanceReason = 'speech' | 'voice' | 'timer';

/** Bosqichning taxminiy davomiyligi (soniya) */
export function expectedSeconds(stage: Stage, text: string, settings: BirgaSettings, schema: BirgaSettingsSchema): number {
  if (stage.timing) {
    const [min, max] = stage.timing;
    if (settings.speed === 'sekin') return max;
    if (settings.speed === 'tez') return min;
    return (min + max) / 2;
  }
  const cps = schema.speeds[settings.speed];
  const { min, max } = schema.recitation_seconds;
  return Math.min(max, Math.max(min, Math.round(text.replace(/\s+/g, ' ').length / cps)));
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
/** Shovqin tufayli «gapiryapti» to'xtamasa ham cheksiz kutilmaydi */
export const HARD_CAP_FACTOR = 3;

/**
 * Sura va duolarda: avval AI tinglaydi, taymer yo'q. Nutq tanilib, oxiriga yetilsa — darhol o'tiladi.
 * Zaxira taymer faqat AI tasdiqlay olmaganda boshlanadi:
 *  - foydalanuvchi o'qib, jim bo'lib qoldi (lekin matn tanilmadi), yoki
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
