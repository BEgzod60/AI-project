import { apiGet } from './api';
import type { BirgaSession } from '../types/birga';

const CACHE_PREFIX = 'iymon-birga:';

const cacheKey = (slug: string, part: number | null | undefined) => `${CACHE_PREFIX}${slug}${part != null ? `:${part}` : ''}`;

function readCache(slug: string, part?: number): BirgaSession | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(slug, part)) ?? window.localStorage.getItem(cacheKey(slug, null));
    return raw ? (JSON.parse(raw) as BirgaSession) : null;
  } catch {
    return null;
  }
}

/** Matnlar keyingi safar internetsiz ham ochilishi uchun saqlanadi; rasmlar brauzer keshiga oldindan yuklanadi */
export function cacheSessionOffline(session: BirgaSession) {
  try {
    const json = JSON.stringify(session);
    window.localStorage.setItem(cacheKey(session.category.slug, session.part), json);
    // Qism ko'rsatilmagan so'rov uchun — oxirgi ochilgani (sessiyaning o'zi qaysi qism ekanini aytadi)
    window.localStorage.setItem(cacheKey(session.category.slug, null), json);
  } catch {
    /* joy yetmasa — onlayn ishlayveradi */
  }
  const images = new Set(session.stages.flatMap((s) => s.images.flatMap((i) => [i.src, i.src_female ?? ''])));
  images.forEach((src) => {
    if (src) new Image().src = src;
  });
}

/** Tarmoq bo'lmasa — oxirgi saqlangan nusxa qaytariladi (`offline: true`) */
export async function getBirgaSession(slug: string, part?: number): Promise<BirgaSession & { offline?: boolean }> {
  try {
    return await apiGet<BirgaSession>(`/namoz-organish/${encodeURIComponent(slug)}/birga/`, { qism: part != null ? String(part) : undefined });
  } catch (err) {
    const cached = readCache(slug, part);
    if (cached) return { ...cached, offline: true };
    throw err;
  }
}
