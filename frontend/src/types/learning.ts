/** Backend: apps/learning/serializers.py */
export type RakatKind = 'farz' | 'vojib' | 'sunnat' | 'nafl';

export type PrayerCategoryIcon =
  | 'bomdod' | 'peshin' | 'asr' | 'shom' | 'xufton'
  | 'moon' | 'sajda' | 'layers' | 'mosque' | 'people' | 'dua';

export interface PrayerCategory {
  number: number;
  slug: string;
  name: string;
  icon: PrayerCategoryIcon;
  image: string;
  /** Tasdiqlanmagan bo'lsa diniy ma'lumot (tavsif, rakatlar, manba) bo'sh keladi */
  review_status: 'published' | 'awaiting_review';
  description: string;
  rakats: string;
  rakat_breakdown: { count: number; kind: RakatKind }[];
  source_title: string;
  source_url: string;
}

/** Backend: apps/learning/serializers.py — lesson_payload */
export interface AudioDescriptor {
  id: number;
  provider: 'quran_foundation' | 'muslim_uz' | 'other';
  reciter: string;
  source_url: string;
  license: string;
  modes: ('full' | 'verses')[];
  /** Pleyer ostidagi izoh, masalan oyat haqida */
  display_note: string;
}

export interface Recitation {
  slug: string;
  name: string;
  kind: 'sura' | 'dua';
  surah_number: number | null;
  /** Lotin yozuvidagi o'qilishi (manbadagi kabi) */
  transliteration: string;
  meaning: string;
  is_zam_sura: boolean;
  source_title: string;
  source_url: string;
  /** Tasdiqlangan audio bo'lmasa — null */
  audio: AudioDescriptor | null;
  /** Audio ishlamasa — audio e'lon qilingan rasmiy maqola */
  audio_reference: { url: string; title: string } | null;
}

export interface LessonStep {
  order: number;
  title: string;
  text: string;
  /** Faqat manbada tasdiqlangan farq bo'lsa */
  text_female: string;
  female_source_url: string;
  zam_sura_choice: boolean;
  recitations: string[];
  source_title: string;
  source_url: string;
}

export interface LessonNote {
  tab: LessonTab;
  title: string;
  text: string;
  source_title: string;
  source_url: string;
}

export type LessonTab = 'malumot' | 'sunnat_farz' | 'vaqti' | 'savol_javob';

export interface Lesson {
  category: PrayerCategory;
  steps: LessonStep[];
  notes: Record<LessonTab, LessonNote[]>;
  recitations: Record<string, Recitation>;
  zam_suras: string[];
}

export type AudioPayload =
  | { mode: 'full'; url: string }
  | { mode: 'verses'; verses: { verse: number; url: string }[] };
