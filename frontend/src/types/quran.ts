export interface SurahSummary {
  number: number;
  name_uz: string;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  revelation: string;
  in_prayer: boolean;
  is_zam: boolean;
  has_transliteration: boolean;
  has_audio: boolean;
}

export interface QuranSources {
  translation: string;
  text: string;
  url: string;
  api: string;
}

export interface SurahList {
  surahs: SurahSummary[];
  sources: QuranSources;
}

export interface AyahAudio {
  url_template: string;
  /** O'zimizda siqib saqlangan fayllar (local: true bo'lgan qorilar uchun). */
  local_url_template: string;
  reciters: { id: string; name: string; local: boolean }[];
  source_title: string;
  source_url: string;
}

export interface SurahDetail {
  number: number;
  name_uz: string;
  name_simple: string;
  name_arabic: string;
  verses_count: number;
  revelation: string;
  revelation_order: number | null;
  in_prayer: boolean;
  is_zam: boolean;
  ayahs: { number: number; arabic: string; meaning: string }[];
  transliteration: { text: string; source_title: string; source_url: string } | null;
  audio: { url: string; reciter: string; source_title: string; source_url: string } | null;
  ayah_audio: AyahAudio | null;
  sources: QuranSources;
}
