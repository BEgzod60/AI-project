import { ApiError, apiGet } from './api';
import type { AudioPayload, Lesson, PrayerCategory } from '../types/learning';

export function getPrayerCategories(): Promise<PrayerCategory[]> {
  return apiGet<PrayerCategory[]>('/namoz-organish/');
}

export async function getPrayerCategory(slug: string): Promise<PrayerCategory> {
  try {
    return await apiGet<PrayerCategory>(`/namoz-organish/${encodeURIComponent(slug)}/`);
  } catch (err) {
    if (err instanceof ApiError && err.code === 'http_404') throw new ApiError('Bunday namoz turi topilmadi.', 'not_found');
    throw err;
  }
}

export function getLesson(slug: string): Promise<Lesson> {
  return apiGet<Lesson>(`/namoz-organish/${encodeURIComponent(slug)}/lesson/`);
}

/** Tasdiqlangan audio havolasi (Quran Foundation kaliti backendda qoladi) */
export function getAudio(id: number, mode: 'full' | 'verses'): Promise<AudioPayload> {
  return apiGet<AudioPayload>(`/namoz-organish/audio/${id}/`, { mode });
}
