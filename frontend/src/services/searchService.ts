import { apiGet } from './api';
import type { SearchResponse, SearchResult } from '../types/search';

export function searchContent(q: string): Promise<SearchResponse> {
  return apiGet<SearchResponse>('/search/', { q });
}

/** Natija havolasi: mavzu sahifasi (+ bo'lim langari) */
export function resultHref(r: SearchResult): string {
  return `/${r.category}/${r.slug}${r.section_id ? `#bolim-${r.section_id}` : ''}`;
}

/** Saytdagi sahifalar — nomi bo'yicha tez topish uchun (backendsiz) */
export const SEARCH_PAGES = [
  { label: 'Bosh sahifa', to: '/', keywords: 'bosh sahifa asosiy' },
  { label: 'Namoz', to: '/namoz', keywords: 'namoz tahorat g‘usl tayammum suralar duolar' },
  { label: 'Namoz vaqtlari', to: '/namoz-vaqtlari', keywords: 'namoz vaqtlari bomdod peshin asr shom xufton taqvim qibla hijriy' },
  { label: 'Iymon', to: '/iymon', keywords: 'iymon aqida din shariat halol harom' },
  { label: 'Suralar va zam suralar', to: '/suralar', keywords: 'sura suralar zam sura qur’on quron fotiha ixlos falaq nos oyat ma’nosi tarjima' },
  { label: 'Qibla', to: '/qibla', keywords: 'qibla ka’ba kaaba yo‘nalish kompas masjid yaqin masjidlar' },
];
