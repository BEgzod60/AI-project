import { apiGet } from './api';
import type { SurahDetail, SurahList } from '../types/quran';

export function getSurahs(): Promise<SurahList> {
  return apiGet<SurahList>('/quran/surahs/');
}

export function getSurah(number: number): Promise<SurahDetail> {
  return apiGet<SurahDetail>(`/quran/surahs/${number}/`);
}
