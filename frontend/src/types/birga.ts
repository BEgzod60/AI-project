/** Backend: apps/learning/birga.py — session_payload */
import type { StepImage } from './learning';

export type StageKind = 'action' | 'posture' | 'recitation';
export type Speed = 'sekin' | 'ortacha' | 'tez' | 'shaxsiy';
export type Sensitivity = 'past' | 'ortacha' | 'yuqori';

export interface Stage {
  index: number;
  step_order: number;
  rakat: number;
  kind: StageKind;
  title: string;
  text: string;
  text_female: string;
  images: StepImage[];
  /** O'qiladigan sura/duo (zam sura bo'lsa — null, foydalanuvchi tanlaydi) */
  recitation: string | null;
  zam: boolean;
  /** Ruku', sajda va boshqa amallar uchun [eng kam, eng ko'p] soniya */
  timing: [number, number] | null;
  /** Ruku', sajda va h.k.: faqat o'qiladigan zikr (qadam matnidagi «...» dan, aynan) */
  zikr: Zikr[];
  source_url: string;
  source_title: string;
}

export interface Zikr {
  text: string;
  meaning: string;
  /** Kamida necha marta aytiladi (manbada «uch marta» bo'lsa — 3) */
  times: number;
  /** Qachon aytiladi: «Borishda», «Sajdada», «Turishda»… */
  label: string;
}

export interface BirgaRecitation {
  slug: string;
  name: string;
  kind: 'sura' | 'dua';
  surah_number: number | null;
  transliteration: string;
  meaning: string;
  /** Tanzil arabcha oyatlari — faqat suralar uchun (ovozni solishtirish) */
  arabic: string[] | null;
  source_url: string;
  source_title: string;
}

export interface BirgaSettingsSchema {
  speeds: Record<Exclude<Speed, 'shaxsiy'>, number>;
  sensitivity: Record<Sensitivity, { rms: number; match: number }>;
  fallback_seconds: { min: number; max: number; default: number };
  recitation_seconds: { min: number; max: number };
  defaults: BirgaSettings;
}

export interface BirgaSettings {
  speed: Speed;
  sensitivity: Sensitivity;
  /** Ovoz aniqlanmasa taxminiy vaqtdan keyin qo'shimcha kutish (soniya) */
  fallback: number;
  large_text: boolean;
  wake_lock: boolean;
  night: boolean;
  /** Brauzerning nutqni aniqlash xizmati (o'chirilsa — faqat qurilmadagi ovoz faolligi) */
  speech: boolean;
  offline: boolean;
  durations?: Record<string, number>;
}

export interface PrayerPart {
  /** rakat_breakdown indeksi — API'ga `qism` sifatida yuboriladi */
  index: number;
  count: number;
  kind: 'farz' | 'sunnat' | 'vojib' | 'nafl';
  label: string;
  supported: boolean;
}

export interface BirgaSession {
  category: { slug: string; name: string; image: string };
  /** Namozning rakat qismlari (masalan Peshin: 4 sunnat, 4 farz, 2 sunnat) */
  parts: PrayerPart[];
  /** Tanlangan qism indeksi */
  part: number | null;
  supported: boolean;
  reason: string;
  rakats: number;
  stages: Stage[];
  recitations: Record<string, BirgaRecitation>;
  zam_suras: string[];
  settings: BirgaSettingsSchema;
  safety_notice: string;
  /** Rejimda ishlatilgan barcha manbalar */
  sources: { group: string; title: string; url: string }[];
}
